import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import {
  buildGreedyChargingPlan,
  calculatePriorityScore,
  generatePrivateSlotProposals,
} from '../common/charging.helpers';
import { generateCode, generateId } from '../common/id.helpers';
import {
  mapChargingPointFromPrisma,
  mapChargingSessionFromPrisma,
  mapPrivateVehicleFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers.helpers';
import { ChargingSession } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplySmartScheduleDto,
  CreateChargingDto,
  CreatePrivateVehicleDto,
  ProposeSlotsDto,
} from './dto/create-charging.dto';

@Injectable()
export class ChargingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async listPrivateVehicles(authorizationHeader?: string, userIdQuery?: string) {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      userIdQuery || 'user-stu-01',
    );
    const rows = await this.prisma.private_vehicles.findMany({
      where: { user_id: actor.userId },
    });
    return rows.map(mapPrivateVehicleFromPrisma);
  }

  async registerPrivateVehicle(
    authorizationHeader: string | undefined,
    dto: CreatePrivateVehicleDto,
  ) {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );
    const plateNumber = (dto.plateNumber || '').trim().toUpperCase();
    const model = (dto.model || '').trim();

    if (!plateNumber || !model) {
      throw new BadRequestException('Vui lòng nhập biển số và mẫu xe điện cá nhân.');
    }

    const dup = await this.prisma.private_vehicles.findFirst({
      where: { user_id: actor.userId, plate_number: plateNumber },
    });
    if (dup) {
      throw new BadRequestException(`Biển số ${plateNumber} đã được đăng ký trong hồ sơ của bạn.`);
    }

    const created = await this.prisma.private_vehicles.create({
      data: {
        id: generateId('pv'),
        user_id: actor.userId,
        plate_number: plateNumber,
        model,
        vehicle_type: dto.vehicleType?.trim() || 'Xe máy điện cá nhân',
        charger_type: dto.chargerType || 'STANDARD',
        battery_capacity_kwh: Number(dto.batteryCapacityKwh) || 3.2,
      },
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Đăng ký xe điện cá nhân mới: ${created.plate_number} (${created.model})`,
      status: 'SUCCESS',
    });

    return mapPrivateVehicleFromPrisma(created);
  }

  async listChargingPoints(hubId?: string) {
    const rows = await this.prisma.charging_points.findMany({
      where: hubId ? { hub_id: hubId } : undefined,
      orderBy: { code: 'asc' },
    });
    return rows.map(mapChargingPointFromPrisma);
  }

  async proposeSlots(dto: ProposeSlotsDto) {
    if (!dto.hubId) {
      throw new BadRequestException('Vui lòng chọn Hub để gợi ý trụ sạc.');
    }

    const currentSoc = Number(dto.currentSoc ?? 25);
    const targetSoc = Number(dto.targetSoc ?? 85);
    if (targetSoc <= currentSoc) {
      throw new BadRequestException('Mức pin mục tiêu phải cao hơn mức pin hiện tại.');
    }

    const [pointRows, pvRow] = await Promise.all([
      this.prisma.charging_points.findMany({ where: { hub_id: dto.hubId } }),
      dto.privateVehicleId
        ? this.prisma.private_vehicles.findUnique({ where: { id: dto.privateVehicleId } })
        : Promise.resolve(null),
    ]);

    const proposals = generatePrivateSlotProposals(
      dto.hubId,
      pointRows.map(mapChargingPointFromPrisma),
      pvRow ? mapPrivateVehicleFromPrisma(pvRow) : null,
      dto.startTime || '09:00',
      currentSoc,
      targetSoc,
    );

    return { hubId: dto.hubId, proposals };
  }

  async bookPrivateChargingSlot(
    authorizationHeader: string | undefined,
    dto: CreateChargingDto,
  ): Promise<ChargingSession> {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );
    const dateStr = dto.date || new Date().toISOString().slice(0, 10);
    const currentSoc = Number(dto.currentSoc ?? 25);
    const targetSoc = Number(dto.targetSoc ?? 85);

    const created = await this.prisma.$transaction(async (tx) => {
      const point = await tx.charging_points.findFirst({
        where: { id: dto.chargingPointId, hub_id: dto.hubId },
      });
      if (!point) {
        throw new NotFoundException('Không tìm thấy trụ sạc được chọn tại Hub.');
      }
      if (point.status === 'MAINTENANCE') {
        throw new BadRequestException('Trụ sạc này đang bảo trì, không thể đặt lịch.');
      }

      const pv = await tx.private_vehicles.findUnique({ where: { id: dto.privateVehicleId } });
      if (!pv) {
        throw new NotFoundException('Không tìm thấy thông tin xe cá nhân.');
      }

      const duplicate = await tx.charging_sessions.findFirst({
        where: {
          charging_point_id: point.id,
          session_date: dateStr,
          start_time: dto.startTime,
          status: { in: ['SCHEDULED', 'CHARGING'] },
        },
      });
      if (duplicate) {
        throw new BadRequestException('Khung giờ này tại trụ sạc vừa được đặt trước. Vui lòng chọn trụ khác.');
      }

      await tx.charging_points.update({
        where: { id: point.id },
        data: { status: 'RESERVED' },
      });

      const sessionRow = await tx.charging_sessions.create({
        data: {
          id: generateId('cs'),
          code: generateCode('CHG'),
          user_id: actor.userId,
          vehicle_id: null,
          private_vehicle_id: pv.id,
          vehicle_label: `${pv.plate_number} (${pv.model})`,
          hub_id: dto.hubId,
          charging_point_id: point.id,
          charging_point_code: point.code,
          bay_code: point.bay_code,
          is_private_vehicle: true,
          session_date: dateStr,
          start_time: dto.startTime,
          end_time: dto.endTime,
          current_soc: currentSoc,
          target_soc: targetSoc,
          priority_score: calculatePriorityScore(currentSoc, dto.endTime),
          status: 'SCHEDULED',
        },
      });

      return mapChargingSessionFromPrisma(sessionRow);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Đặt lịch sạc xe cá nhân ${created.vehicleLabel} tại trụ ${created.chargingPointCode} (${dto.startTime} - ${dto.endTime})`,
      status: 'SUCCESS',
    });

    return created;
  }

  async listChargingSessions(authorizationHeader?: string, hubId?: string, onlyMine?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-stu-01');
    const rows = await this.prisma.charging_sessions.findMany({
      where: {
        ...(hubId ? { hub_id: hubId } : {}),
        ...(onlyMine === 'true' ? { user_id: actor.userId } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(mapChargingSessionFromPrisma);
  }

  async cancelChargingBooking(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-stu-01');

    const updated = await this.prisma.$transaction(async (tx) => {
      const target = await tx.charging_sessions.findUnique({ where: { id } });
      if (!target) {
        throw new NotFoundException('Không tìm thấy lịch sạc cần hủy.');
      }

      const row = await tx.charging_sessions.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.charging_points.updateMany({
        where: { id: target.charging_point_id, status: { not: 'MAINTENANCE' } },
        data: { status: 'AVAILABLE' },
      });

      return mapChargingSessionFromPrisma(row);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Người dùng',
      actorId: actor.userId,
      description: `Hủy lịch sạc ${updated.code} tại trụ ${updated.chargingPointCode}`,
      status: 'WARNING',
    });

    return updated;
  }

  async getPriorityPlan(hubId?: string, excludePortIdsCsv?: string) {
    const targetHubId = hubId || 'hub-01';
    const [vehRows, cpRows] = await Promise.all([
      this.prisma.vehicles.findMany({ where: { hub_id: targetHubId } }),
      this.prisma.charging_points.findMany({ where: { hub_id: targetHubId }, orderBy: { code: 'asc' } }),
    ]);

    const excluded = excludePortIdsCsv
      ? excludePortIdsCsv.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const points = cpRows.map(mapChargingPointFromPrisma);
    const proposedPlan = buildGreedyChargingPlan(
      targetHubId,
      vehRows.map(mapVehicleFromPrisma),
      points,
      excluded,
    );

    return {
      hubId: targetHubId,
      chargingPoints: points,
      proposedPlan,
    };
  }

  async applySmartSchedule(
    authorizationHeader: string | undefined,
    dto: ApplySmartScheduleDto,
  ) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');
    if (!dto.hubId) {
      throw new BadRequestException('Vui lòng chọn Hub để áp dụng lịch sạc thông minh.');
    }

    const appliedSessions = await this.prisma.$transaction(async (tx) => {
      const [vehRows, cpRows] = await Promise.all([
        tx.vehicles.findMany({ where: { hub_id: dto.hubId } }),
        tx.charging_points.findMany({ where: { hub_id: dto.hubId } }),
      ]);

      const plan = buildGreedyChargingPlan(
        dto.hubId,
        vehRows.map(mapVehicleFromPrisma),
        cpRows.map(mapChargingPointFromPrisma),
        dto.excludedPortIds || [],
        dto.departureOverrides || {},
      );

      if (plan.length === 0) {
        throw new BadRequestException('Không có phương tiện nào cần sạc hoặc tất cả trụ đang bảo trì.');
      }

      const today = new Date().toISOString().slice(0, 10);
      const results: ChargingSession[] = [];

      for (const item of plan) {
        await tx.vehicles.update({
          where: { id: item.vehicleId },
          data: { status: 'CHARGING' },
        });
        await tx.charging_points.updateMany({
          where: { id: item.chargingPointId, status: { not: 'MAINTENANCE' } },
          data: { status: 'CHARGING' },
        });

        const row = await tx.charging_sessions.create({
          data: {
            id: generateId('cs'),
            code: generateCode('CHG'),
            user_id: null,
            vehicle_id: item.vehicleId,
            private_vehicle_id: null,
            vehicle_label: `${item.plateNumber} (${item.model})`,
            hub_id: dto.hubId,
            charging_point_id: item.chargingPointId,
            charging_point_code: item.chargingPointCode,
            bay_code: item.bayCode,
            is_private_vehicle: false,
            session_date: today,
            start_time: item.startTime,
            end_time: item.endTime,
            current_soc: item.currentSoc,
            target_soc: item.targetSoc,
            priority_score: item.priorityScore,
            status: 'CHARGING',
          },
        });
        results.push(mapChargingSessionFromPrisma(row));
      }

      return results;
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Điều phối viên',
      actorId: actor.userId,
      description: `Áp dụng lịch sạc tham lam tại ${dto.hubId}: ${appliedSessions.length} xe được phân bổ trụ`,
      status: 'SUCCESS',
    });

    return {
      message: `Đã lập và áp dụng lịch sạc thông minh cho ${appliedSessions.length} phương tiện.`,
      appliedSessions,
    };
  }
}

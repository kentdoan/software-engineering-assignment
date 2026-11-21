import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { ChargingSession } from '../common/interfaces';
import {
  mapChargingPointFromPrisma,
  mapChargingSessionFromPrisma,
  mapPrivateVehicleFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers';
import { runHeuristicGreedyMatch } from '../common/schedulers/greedy-charging.scheduler';
import { calculatePriorityScore } from '../common/schedulers/priority-score.scheduler';
import { generatePrivateSlotProposals } from '../common/schedulers/private-slot.scheduler';
import { generateCode, generateId } from '../common/utils/id-generator.util';
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

  /**
   * Mục đích: Lấy danh sách các phương tiện điện cá nhân đã đăng ký của sinh viên hiện tại.
   * Cách hoạt động: Xác định mã người dùng từ phiên đăng nhập, truy vấn các bản ghi tương ứng trong bảng private_vehicles và chuyển đổi sang định dạng PrivateVehicle chuẩn.
   */
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

  /**
   * Mục đích: Đăng ký một phương tiện điện cá nhân mới vào hồ sơ của sinh viên để phục vụ đặt lịch sạc.
   * Cách hoạt động: Chuẩn hóa biển số và mẫu xe, kiểm tra biển số không bị trùng trong hồ sơ người dùng, lưu bản ghi mới vào bảng private_vehicles kèm chuẩn sạc và dung lượng pin rồi ghi nhật ký hệ thống.
   */
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

  /**
   * Mục đích: Liệt kê danh sách các trụ sạc thuộc một trạm Hub cụ thể hoặc trên toàn mạng lưới.
   * Cách hoạt động: Thiết lập điều kiện lọc theo hubId nếu có, truy vấn bảng charging_points sắp xếp tăng dần theo mã trụ và chuyển đổi kết quả sang định dạng chuẩn.
   */
  async listChargingPoints(hubId?: string) {
    const whereCondition: Prisma.charging_pointsWhereInput = {};
    if (hubId) {
      whereCondition.hub_id = hubId;
    }

    const rows = await this.prisma.charging_points.findMany({
      where: whereCondition,
      orderBy: { code: 'asc' },
    });
    return rows.map(mapChargingPointFromPrisma);
  }

  /**
   * Mục đích: Tìm và đề xuất các khung giờ cùng trụ sạc tối ưu cho xe điện cá nhân của sinh viên tại một trạm Hub.
   * Cách hoạt động: Kiểm tra tham số hubId và đảm bảo mức pin mục tiêu lớn hơn pin hiện tại, truy vấn danh sách trụ sạc tại trạm cùng thông tin xe cá nhân (nếu có), rồi gọi hàm generatePrivateSlotProposals để tính các phương án thời gian và chi phí ước tính.
   */
  async findOptimalChargingSlot(dto: ProposeSlotsDto) {
    if (!dto.hubId) {
      throw new BadRequestException('Vui lòng chọn Hub để gợi ý trụ sạc.');
    }

    const currentSoc = Number(dto.currentSoc ?? 25);
    const targetSoc = Number(dto.targetSoc ?? 85);
    if (targetSoc <= currentSoc) {
      throw new BadRequestException('Mức pin mục tiêu phải cao hơn mức pin hiện tại.');
    }

    const pointRows = await this.prisma.charging_points.findMany({
      where: { hub_id: dto.hubId },
    });

    let pvRow = null;
    if (dto.privateVehicleId) {
      pvRow = await this.prisma.private_vehicles.findUnique({
        where: { id: dto.privateVehicleId },
      });
    }

    const mappedPoints = pointRows.map(mapChargingPointFromPrisma);
    const mappedVehicle = pvRow ? mapPrivateVehicleFromPrisma(pvRow) : null;

    const proposals = generatePrivateSlotProposals(
      dto.hubId,
      mappedPoints,
      mappedVehicle,
      dto.startTime || '09:00',
      currentSoc,
      targetSoc,
    );

    return { hubId: dto.hubId, proposals };
  }

  /**
   * Mục đích: Tạo phiên giữ chỗ sạc cho phương tiện điện cá nhân của sinh viên ở trạng thái SCHEDULED.
   * Cách hoạt động: Kiểm tra trụ sạc tại trạm tồn tại và không đang bảo trì, xác minh thông tin xe cá nhân và đảm bảo khung giờ tại trụ chưa bị đặt trùng; sau đó chuyển trụ sạc sang trạng thái RESERVED, tạo bản ghi phiên sạc ở trạng thái SCHEDULED và ghi nhật ký kiểm toán.
   */
  async createPrivateChargingSession(
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

    const point = await this.prisma.charging_points.findFirst({
      where: { id: dto.chargingPointId, hub_id: dto.hubId },
    });
    if (!point) {
      throw new NotFoundException('Không tìm thấy trụ sạc được chọn tại Hub.');
    }
    if (point.status === 'MAINTENANCE') {
      throw new BadRequestException('Trụ sạc này đang bảo trì, không thể đặt lịch.');
    }

    const pv = await this.prisma.private_vehicles.findUnique({
      where: { id: dto.privateVehicleId },
    });
    if (!pv) {
      throw new NotFoundException('Không tìm thấy thông tin xe cá nhân.');
    }

    const duplicate = await this.prisma.charging_sessions.findFirst({
      where: {
        charging_point_id: point.id,
        session_date: dateStr,
        start_time: dto.startTime,
        status: { in: ['SCHEDULED', 'CHARGING'] },
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        'Khung giờ này tại trụ sạc vừa được đặt trước. Vui lòng chọn trụ khác.',
      );
    }

    await this.prisma.charging_points.update({
      where: { id: point.id },
      data: { status: 'RESERVED' },
    });

    const sessionRow = await this.prisma.charging_sessions.create({
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

    const created = mapChargingSessionFromPrisma(sessionRow);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Đặt lịch sạc xe cá nhân ${created.vehicleLabel} tại trụ ${created.chargingPointCode} (${dto.startTime} - ${dto.endTime})`,
      status: 'SUCCESS',
    });

    return created;
  }

  /**
   * Mục đích: Truy vấn danh sách các phiên sạc đã đặt hoặc đang diễn ra theo trạm Hub hoặc theo tài khoản cá nhân.
   * Cách hoạt động: Xây dựng bộ lọc theo hubId (nếu có) và lọc theo user_id hiện tại khi onlyMine bằng true, sau đó truy vấn bảng charging_sessions theo thứ tự mới nhất trước và chuyển đổi sang dạng ChargingSession.
   */
  async listChargingSessions(authorizationHeader?: string, hubId?: string, onlyMine?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-stu-01');
    const whereCondition: Prisma.charging_sessionsWhereInput = {};

    if (hubId) {
      whereCondition.hub_id = hubId;
    }
    if (onlyMine === 'true') {
      whereCondition.user_id = actor.userId;
    }

    const rows = await this.prisma.charging_sessions.findMany({
      where: whereCondition,
      orderBy: { created_at: 'desc' },
    });
    return rows.map(mapChargingSessionFromPrisma);
  }

  /**
   * Mục đích: Hủy một lịch sạc đã đặt trước và giải phóng trụ sạc về trạng thái sẵn sàng.
   * Cách hoạt động: Tìm phiên sạc theo id, chuyển trạng thái phiên sạc sang CANCELLED, cập nhật trụ sạc tương ứng về AVAILABLE nếu trụ không đang bảo trì rồi ghi nhật ký cảnh báo.
   */
  async cancelChargingBooking(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-stu-01');

    const target = await this.prisma.charging_sessions.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException('Không tìm thấy lịch sạc cần hủy.');
    }

    const row = await this.prisma.charging_sessions.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.charging_points.updateMany({
      where: { id: target.charging_point_id, status: { not: 'MAINTENANCE' } },
      data: { status: 'AVAILABLE' },
    });

    const updated = mapChargingSessionFromPrisma(row);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Người dùng',
      actorId: actor.userId,
      description: `Hủy lịch sạc ${updated.code} tại trụ ${updated.chargingPointCode}`,
      status: 'WARNING',
    });

    return updated;
  }

  /**
   * Mục đích: Tối ưu và đề xuất kế hoạch lập lịch sạc ưu tiên theo thuật toán tham lam tại một trạm Hub.
   * Cách hoạt động: Tải danh sách xe và trụ sạc của trạm mục tiêu (mặc định hub-01), tách danh sách mã trụ bị loại trừ từ chuỗi CSV rồi gọi hàm runHeuristicGreedyMatch để xếp lịch sạc tối ưu cho các xe pin yếu.
   */
  async optimizeChargingSchedule(hubId?: string, excludePortIdsCsv?: string) {
    const targetHubId = hubId || 'hub-01';
    const vehRows = await this.prisma.vehicles.findMany({
      where: { hub_id: targetHubId },
    });
    const cpRows = await this.prisma.charging_points.findMany({
      where: { hub_id: targetHubId },
      orderBy: { code: 'asc' },
    });

    let excluded: string[] = [];
    if (excludePortIdsCsv) {
      excluded = excludePortIdsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const points = cpRows.map(mapChargingPointFromPrisma);
    const vehicles = vehRows.map(mapVehicleFromPrisma);
    const proposedPlan = runHeuristicGreedyMatch(targetHubId, vehicles, points, excluded);

    return {
      hubId: targetHubId,
      chargingPoints: points,
      proposedPlan,
    };
  }

  /**
   * Mục đích: Xác nhận và áp dụng chính thức kế hoạch lập lịch sạc thông minh cho toàn bộ xe pin yếu tại trạm Hub.
   * Cách hoạt động: Chạy lại thuật toán runHeuristicGreedyMatch với danh sách trụ loại trừ và giờ xuất phát điều chỉnh (nếu có); với từng cặp xe - trụ sạc trong kế hoạch, chuyển trạng thái xe và trụ sạc sang CHARGING, lưu phiên sạc mới vào bảng charging_sessions rồi ghi nhật ký vận hành.
   */
  async commitSchedulePlan(
    authorizationHeader: string | undefined,
    dto: ApplySmartScheduleDto,
  ) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');
    if (!dto.hubId) {
      throw new BadRequestException('Vui lòng chọn Hub để áp dụng lịch sạc thông minh.');
    }

    const vehRows = await this.prisma.vehicles.findMany({ where: { hub_id: dto.hubId } });
    const cpRows = await this.prisma.charging_points.findMany({ where: { hub_id: dto.hubId } });

    const plan = runHeuristicGreedyMatch(
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
    const appliedSessions: ChargingSession[] = [];

    for (const item of plan) {
      await this.prisma.vehicles.update({
        where: { id: item.vehicleId },
        data: { status: 'CHARGING' },
      });
      await this.prisma.charging_points.updateMany({
        where: { id: item.chargingPointId, status: { not: 'MAINTENANCE' } },
        data: { status: 'CHARGING' },
      });

      const row = await this.prisma.charging_sessions.create({
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
      appliedSessions.push(mapChargingSessionFromPrisma(row));
    }

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Nhân viên vận hành',
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

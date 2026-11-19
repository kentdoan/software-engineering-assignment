import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { pickHighestBatteryVehicle } from '../common/booking.helpers';
import { generateCode, generateId } from '../common/id.helpers';
import { mapIncidentFromPrisma, mapVehicleFromPrisma } from '../common/mappers.helpers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async listIncidents(status?: string) {
    const validStatus =
      status && status !== 'ALL' && (['OPEN', 'IN_PROGRESS', 'RESOLVED'] as string[]).includes(status)
        ? (status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED')
        : undefined;

    const rows = await this.prisma.incidents.findMany({
      where: validStatus ? { status: validStatus } : undefined,
      orderBy: { created_at: 'desc' },
    });
    return rows.map(mapIncidentFromPrisma);
  }

  async reportIncident(authorizationHeader: string | undefined, dto: CreateIncidentDto) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');
    if (!dto.hubId || !dto.resourceId || !dto.incidentType || !dto.description?.trim()) {
      throw new BadRequestException('Vui lòng nhập đầy đủ Hub, thiết bị gặp sự cố, loại lỗi và mô tả.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      let resourceLabel = dto.resourceId;
      let affectedSummary = 'Không có phiên đặt trước bị ảnh hưởng';

      if (dto.resourceType === 'VEHICLE') {
        const vehicle = await tx.vehicles.findUnique({ where: { id: dto.resourceId } });
        if (!vehicle) {
          throw new NotFoundException('Không tìm thấy phương tiện cần báo cáo sự cố.');
        }

        resourceLabel = `${vehicle.plate_number} (${vehicle.model})`;
        await tx.vehicles.update({
          where: { id: vehicle.id },
          data: { status: 'UNDER_MAINTENANCE' },
        });

        const affectedBookings = await tx.bookings.findMany({
          where: { vehicle_id: vehicle.id, status: 'ACTIVE' },
        });

        if (affectedBookings.length > 0) {
          const allVehs = (await tx.vehicles.findMany()).map(mapVehicleFromPrisma);
          let reassignedCount = 0;
          let cancelledCount = 0;

          for (const b of affectedBookings) {
            const replacement = pickHighestBatteryVehicle(allVehs, b.hub_id, vehicle.type, 20);
            if (replacement) {
              replacement.status = 'BOOKED';
              await tx.vehicles.update({ where: { id: replacement.id }, data: { status: 'BOOKED' } });
              await tx.bookings.update({ where: { id: b.id }, data: { vehicle_id: replacement.id } });
              reassignedCount++;
            } else {
              await tx.bookings.update({ where: { id: b.id }, data: { status: 'CANCELLED' } });
              cancelledCount++;
            }
          }

          affectedSummary = `Tự động đổi ${reassignedCount} lượt đặt sang xe dự phòng, hủy ${cancelledCount} lượt thiếu xe`;
        }
      } else {
        const point = await tx.charging_points.findUnique({ where: { id: dto.resourceId } });
        if (!point) {
          throw new NotFoundException('Không tìm thấy trụ sạc cần báo cáo sự cố.');
        }

        resourceLabel = `Trụ sạc ${point.code} (${point.connector_type})`;
        await tx.charging_points.update({
          where: { id: point.id },
          data: { status: 'MAINTENANCE' },
        });

        const affectedSessions = await tx.charging_sessions.findMany({
          where: { charging_point_id: point.id, status: { in: ['SCHEDULED', 'CHARGING'] } },
        });

        if (affectedSessions.length > 0) {
          const backupPoint = await tx.charging_points.findFirst({
            where: { hub_id: point.hub_id, id: { not: point.id }, status: 'AVAILABLE' },
          });

          let movedCount = 0;
          let cancelledCount = 0;
          for (const s of affectedSessions) {
            if (backupPoint) {
              await tx.charging_sessions.update({
                where: { id: s.id },
                data: {
                  charging_point_id: backupPoint.id,
                  charging_point_code: backupPoint.code,
                  bay_code: backupPoint.bay_code,
                },
              });
              movedCount++;
            } else {
              await tx.charging_sessions.update({
                where: { id: s.id },
                data: { status: 'CANCELLED' },
              });
              cancelledCount++;
            }
          }
          if (backupPoint && movedCount > 0) {
            await tx.charging_points.update({
              where: { id: backupPoint.id },
              data: { status: 'RESERVED' },
            });
          }
          affectedSummary = `Chuyển ${movedCount} phiên sạc sang trụ dự phòng, hủy ${cancelledCount} phiên`;
        }
      }

      const row = await tx.incidents.create({
        data: {
          id: generateId('inc'),
          code: generateCode('INC'),
          reporter_id: actor.userId,
          hub_id: dto.hubId,
          resource_type: dto.resourceType,
          vehicle_id: dto.resourceType === 'VEHICLE' ? dto.resourceId : null,
          charging_point_id: dto.resourceType === 'CHARGING_POINT' ? dto.resourceId : null,
          resource_label: resourceLabel,
          incident_type: dto.incidentType.trim(),
          description: dto.description.trim(),
          affected_summary: affectedSummary,
          status: 'OPEN',
        },
      });

      return mapIncidentFromPrisma(row);
    });

    await this.auditService.log({
      category: 'CANH_BAO',
      actorName: actor.user?.name || 'Điều phối viên',
      actorId: actor.userId,
      description: `Cô lập sự cố ${created.code} (${created.resourceLabel}): ${created.incidentType}`,
      status: 'WARNING',
    });

    return created;
  }

  async resolveIncident(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');

    const resolved = await this.prisma.$transaction(async (tx) => {
      const target = await tx.incidents.findUnique({ where: { id } });
      if (!target) {
        throw new NotFoundException('Không tìm thấy báo cáo sự cố.');
      }

      if (target.resource_type === 'VEHICLE' && target.vehicle_id) {
        await tx.vehicles.updateMany({
          where: { id: target.vehicle_id },
          data: { status: 'AVAILABLE' },
        });
      } else if (target.charging_point_id) {
        await tx.charging_points.updateMany({
          where: { id: target.charging_point_id },
          data: { status: 'AVAILABLE' },
        });
      }

      const row = await tx.incidents.update({
        where: { id },
        data: { status: 'RESOLVED', resolved_at: new Date() },
      });

      return mapIncidentFromPrisma(row);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Điều phối viên',
      actorId: actor.userId,
      description: `Khắc phục xong sự cố ${resolved.code}, đưa ${resolved.resourceLabel} hoạt động trở lại`,
      status: 'SUCCESS',
    });

    return resolved;
  }
}

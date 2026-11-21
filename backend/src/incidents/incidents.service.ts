import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { autoAllocateHighestBatteryVehicle } from '../common/calculators/bay-allocator.calculator';
import { IncidentStatus } from '../common/interfaces';
import { mapIncidentFromPrisma, mapVehicleFromPrisma } from '../common/mappers';
import { generateCode, generateId } from '../common/utils/id-generator.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Mục đích: Lấy danh sách các báo cáo sự cố vận hành theo bộ lọc trạng thái.
   * Cách hoạt động: Kiểm tra tham số status có thuộc các giá trị hợp lệ (OPEN, IN_PROGRESS, RESOLVED) hay không để tạo điều kiện lọc, sau đó truy vấn bảng incidents sắp xếp mới nhất trước và chuyển đổi sang IncidentReport.
   */
  async listIncidents(status?: string) {
    const allowedStatuses: string[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
    const whereCondition: Prisma.incidentsWhereInput = {};
    if (status && status !== 'ALL' && allowedStatuses.includes(status)) {
      whereCondition.status = status as IncidentStatus;
    }

    const rows = await this.prisma.incidents.findMany({
      where: whereCondition,
      orderBy: { created_at: 'desc' },
    });
    return rows.map(mapIncidentFromPrisma);
  }

  /**
   * Mục đích: Cô lập ngay phương tiện hoặc trụ sạc gặp sự cố để ngăn người dùng tiếp tục sử dụng.
   * Cách hoạt động: Kiểm tra loại tài nguyên báo hỏng; nếu là VEHICLE thì cập nhật trạng thái xe sang UNDER_MAINTENANCE, nếu là CHARGING_POINT thì cập nhật trụ sạc sang MAINTENANCE, đồng thời trả về nhãn hiển thị và thông tin bổ trợ cho bước xử lý các phiên bị ảnh hưởng.
   */
  async isolateFaultyResource(
    resourceType: 'VEHICLE' | 'CHARGING_POINT',
    resourceId: string,
  ) {
    if (resourceType === 'VEHICLE') {
      const vehicle = await this.prisma.vehicles.findUnique({ where: { id: resourceId } });
      if (!vehicle) {
        throw new NotFoundException('Không tìm thấy phương tiện cần báo cáo sự cố.');
      }

      await this.prisma.vehicles.update({
        where: { id: vehicle.id },
        data: { status: 'UNDER_MAINTENANCE' },
      });

      return {
        resourceLabel: `${vehicle.plate_number} (${vehicle.model})`,
        vehicleType: vehicle.type,
        pointHubId: undefined,
      };
    }

    const point = await this.prisma.charging_points.findUnique({ where: { id: resourceId } });
    if (!point) {
      throw new NotFoundException('Không tìm thấy trụ sạc cần báo cáo sự cố.');
    }

    await this.prisma.charging_points.update({
      where: { id: point.id },
      data: { status: 'MAINTENANCE' },
    });

    return {
      resourceLabel: `Trụ sạc ${point.code} (${point.connector_type})`,
      vehicleType: undefined,
      pointHubId: point.hub_id,
    };
  }

  /**
   * Mục đích: Tự động điều chuyển hoặc hủy bỏ các lượt đặt xe và phiên sạc đang bị ảnh hưởng bởi thiết bị gặp sự cố.
   * Cách hoạt động: Với sự cố phương tiện, duyệt qua các đơn đặt xe ACTIVE của xe đó và gọi autoAllocateHighestBatteryVehicle để đổi sang xe dự phòng tại cùng trạm (hoặc hủy nếu hết xe); với sự cố trụ sạc, tìm trụ AVAILABLE khác tại cùng trạm để dời các phiên sạc đang chờ/đang sạc hoặc hủy nếu không còn trụ thay thế, cuối cùng trả về chuỗi tóm tắt kết quả.
   */
  async resolveAffectedActivities(
    resourceType: 'VEHICLE' | 'CHARGING_POINT',
    resourceId: string,
    vehicleType?: string,
    pointHubId?: string,
  ): Promise<string> {
    if (resourceType === 'VEHICLE') {
      const affectedBookings = await this.prisma.bookings.findMany({
        where: { vehicle_id: resourceId, status: 'ACTIVE' },
      });

      if (affectedBookings.length === 0) {
        return 'Không có phiên đặt trước bị ảnh hưởng';
      }

      const allVehRows = await this.prisma.vehicles.findMany();
      const allVehs = allVehRows.map(mapVehicleFromPrisma);
      let reassignedCount = 0;
      let cancelledCount = 0;

      for (const b of affectedBookings) {
        const replacement = autoAllocateHighestBatteryVehicle(allVehs, b.hub_id, vehicleType, 20);
        if (replacement) {
          replacement.status = 'BOOKED';
          await this.prisma.vehicles.update({
            where: { id: replacement.id },
            data: { status: 'BOOKED' },
          });
          await this.prisma.bookings.update({
            where: { id: b.id },
            data: { vehicle_id: replacement.id },
          });
          reassignedCount++;
        } else {
          await this.prisma.bookings.update({
            where: { id: b.id },
            data: { status: 'CANCELLED' },
          });
          cancelledCount++;
        }
      }

      return `Tự động đổi ${reassignedCount} lượt đặt sang xe dự phòng, hủy ${cancelledCount} lượt thiếu xe`;
    }

    const affectedSessions = await this.prisma.charging_sessions.findMany({
      where: { charging_point_id: resourceId, status: { in: ['SCHEDULED', 'CHARGING'] } },
    });

    if (affectedSessions.length === 0) {
      return 'Không có phiên đặt trước bị ảnh hưởng';
    }

    const backupPoint = await this.prisma.charging_points.findFirst({
      where: { hub_id: pointHubId, id: { not: resourceId }, status: 'AVAILABLE' },
    });

    let movedCount = 0;
    let cancelledCount = 0;
    for (const s of affectedSessions) {
      if (backupPoint) {
        await this.prisma.charging_sessions.update({
          where: { id: s.id },
          data: {
            charging_point_id: backupPoint.id,
            charging_point_code: backupPoint.code,
            bay_code: backupPoint.bay_code,
          },
        });
        movedCount++;
      } else {
        await this.prisma.charging_sessions.update({
          where: { id: s.id },
          data: { status: 'CANCELLED' },
        });
        cancelledCount++;
      }
    }

    if (backupPoint && movedCount > 0) {
      await this.prisma.charging_points.update({
        where: { id: backupPoint.id },
        data: { status: 'RESERVED' },
      });
    }

    return `Chuyển ${movedCount} phiên sạc sang trụ dự phòng, hủy ${cancelledCount} phiên`;
  }

  /**
   * Mục đích: Tiếp nhận báo cáo sự cố kỹ thuật, cô lập thiết bị lỗi, xử lý hoạt động bị ảnh hưởng và lưu hồ sơ sự cố.
   * Cách hoạt động: Xác thực dữ liệu đầu vào, gọi isolateFaultyResource để khóa thiết bị lỗi sang bảo trì, gọi resolveAffectedActivities để tự động đổi tài nguyên cho người dùng bị ảnh hưởng, lưu bản ghi sự cố vào bảng incidents và ghi nhật ký cảnh báo.
   */
  async reportIncident(authorizationHeader: string | undefined, dto: CreateIncidentDto) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');
    if (!dto.hubId || !dto.resourceId || !dto.incidentType || !dto.description?.trim()) {
      throw new BadRequestException('Vui lòng nhập đầy đủ Hub, thiết bị gặp sự cố, loại lỗi và mô tả.');
    }

    const isolated = await this.isolateFaultyResource(dto.resourceType, dto.resourceId);
    const affectedSummary = await this.resolveAffectedActivities(
      dto.resourceType,
      dto.resourceId,
      isolated.vehicleType,
      isolated.pointHubId,
    );

    let vehicleId: string | null = null;
    let chargingPointId: string | null = null;
    if (dto.resourceType === 'VEHICLE') {
      vehicleId = dto.resourceId;
    } else {
      chargingPointId = dto.resourceId;
    }

    const row = await this.prisma.incidents.create({
      data: {
        id: generateId('inc'),
        code: generateCode('INC'),
        reporter_id: actor.userId,
        hub_id: dto.hubId,
        resource_type: dto.resourceType,
        vehicle_id: vehicleId,
        charging_point_id: chargingPointId,
        resource_label: isolated.resourceLabel,
        incident_type: dto.incidentType.trim(),
        description: dto.description.trim(),
        affected_summary: affectedSummary,
        status: 'OPEN',
      },
    });

    const created = mapIncidentFromPrisma(row);

    await this.auditService.log({
      category: 'CANH_BAO',
      actorName: actor.user?.name || 'Nhân viên vận hành',
      actorId: actor.userId,
      description: `Cô lập sự cố ${created.code} (${created.resourceLabel}): ${created.incidentType}`,
      status: 'WARNING',
    });

    return created;
  }

  /**
   * Mục đích: Đánh dấu một sự cố đã được khắc phục xong và đưa phương tiện hoặc trụ sạc trở lại trạng thái hoạt động bình thường.
   * Cách hoạt động: Tìm báo cáo sự cố theo id, khôi phục trạng thái xe hoặc trụ sạc tương ứng về AVAILABLE, cập nhật bản ghi sự cố sang RESOLVED kèm thời điểm hoàn tất và ghi nhật ký vận hành.
   */
  async resolveIncident(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');

    const target = await this.prisma.incidents.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException('Không tìm thấy báo cáo sự cố.');
    }

    if (target.resource_type === 'VEHICLE' && target.vehicle_id) {
      await this.prisma.vehicles.updateMany({
        where: { id: target.vehicle_id },
        data: { status: 'AVAILABLE' },
      });
    } else if (target.charging_point_id) {
      await this.prisma.charging_points.updateMany({
        where: { id: target.charging_point_id },
        data: { status: 'AVAILABLE' },
      });
    }

    const row = await this.prisma.incidents.update({
      where: { id },
      data: { status: 'RESOLVED', resolved_at: new Date() },
    });

    const resolved = mapIncidentFromPrisma(row);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Nhân viên vận hành',
      actorId: actor.userId,
      description: `Khắc phục xong sự cố ${resolved.code}, đưa ${resolved.resourceLabel} hoạt động trở lại`,
      status: 'SUCCESS',
    });

    return resolved;
  }
}

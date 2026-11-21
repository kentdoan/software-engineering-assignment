import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { mapDispatchOrderFromPrisma } from '../common/mappers';
import { generateCode, generateId } from '../common/utils/id-generator.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Mục đích: Lấy danh sách toàn bộ lệnh điều phối phương tiện giữa các trạm Hub.
   * Cách hoạt động: Truy vấn bảng dispatch_orders kèm các dòng xe chi tiết trong dispatch_order_items theo thứ tự mới nhất trước và chuyển đổi sang định dạng DispatchOrder chuẩn.
   */
  async listOrders() {
    const rows = await this.prisma.dispatch_orders.findMany({
      include: { dispatch_order_items: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(mapDispatchOrderFromPrisma);
  }

  /**
   * Mục đích: Thẩm định tính khả thi của yêu cầu điều phối xe giữa trạm nguồn và trạm đích.
   * Cách hoạt động: Kiểm tra tham số đầu vào hợp lệ và hai trạm không trùng nhau, xác nhận cả hai trạm tồn tại, kiểm tra số ô đỗ còn trống tại trạm đích đủ tiếp nhận số xe chuyển tới, đồng thời xác minh toàn bộ xe được chọn đều đang nằm tại trạm nguồn ở trạng thái AVAILABLE hoặc CHARGING.
   */
  async validateDispatchFeasibility(
    sourceHubId: string,
    targetHubId: string,
    vehicleIds: string[],
  ) {
    if (!sourceHubId || !targetHubId || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn Hub nguồn, Hub đích và ít nhất 1 phương tiện điều chuyển.');
    }
    if (sourceHubId === targetHubId) {
      throw new BadRequestException('Hub nguồn và Hub đích không thể trùng nhau.');
    }

    const sourceHub = await this.prisma.hubs.findUnique({ where: { id: sourceHubId } });
    const targetHub = await this.prisma.hubs.findUnique({ where: { id: targetHubId } });
    if (!sourceHub || !targetHub) {
      throw new NotFoundException('Không tìm thấy thông tin Hub nguồn hoặc Hub đích.');
    }

    const targetDockedCount = await this.prisma.vehicles.count({
      where: { hub_id: targetHub.id },
    });
    const sourceVehicles = await this.prisma.vehicles.findMany({
      where: { id: { in: vehicleIds } },
    });

    const freeDocksAtTarget = Math.max(0, targetHub.total_docks - targetDockedCount);
    if (vehicleIds.length > freeDocksAtTarget) {
      throw new BadRequestException(
        `${targetHub.name} chỉ còn ${freeDocksAtTarget} ô đỗ trống, không đủ tiếp nhận ${vehicleIds.length} xe.`,
      );
    }

    const itemInputs: { id: string; vehicle_id: string; plate_number: string }[] = [];
    for (const vid of vehicleIds) {
      const v = sourceVehicles.find((item) => item.id === vid);
      if (!v || v.hub_id !== sourceHub.id) {
        throw new BadRequestException(`Phương tiện ${vid} không thuộc ${sourceHub.name}.`);
      }
      if (v.status !== 'AVAILABLE' && v.status !== 'CHARGING') {
        throw new BadRequestException(
          `Xe ${v.plate_number} đang ở trạng thái ${v.status}, không thể điều chuyển.`,
        );
      }
      itemInputs.push({
        id: generateId('di'),
        vehicle_id: v.id,
        plate_number: v.plate_number,
      });
    }

    return {
      sourceHub,
      targetHub,
      itemInputs,
    };
  }

  /**
   * Mục đích: Thực thi tạo lệnh điều phối chuyển một hoặc nhiều xe từ trạm nguồn sang trạm đích.
   * Cách hoạt động: Xác định nhân viên vận hành hiện tại, gọi validateDispatchFeasibility để kiểm tra mọi ràng buộc về sức chứa và trạng thái xe, chuyển trạng thái các xe được chọn sang IN_USE, lưu lệnh điều phối ở trạng thái IN_TRANSIT và ghi nhật ký vận hành.
   */
  async executeDispatchOrder(authorizationHeader: string | undefined, dto: CreateDispatchDto) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');
    const validated = await this.validateDispatchFeasibility(
      dto.sourceHubId,
      dto.targetHubId,
      dto.vehicleIds,
    );

    for (const item of validated.itemInputs) {
      await this.prisma.vehicles.update({
        where: { id: item.vehicle_id },
        data: { status: 'IN_USE' },
      });
    }

    const created = await this.prisma.dispatch_orders.create({
      data: {
        id: generateId('disp'),
        code: generateCode('DP'),
        operator_id: actor.userId,
        source_hub_id: validated.sourceHub.id,
        target_hub_id: validated.targetHub.id,
        note: dto.note?.trim() || '',
        status: 'IN_TRANSIT',
        dispatch_order_items: { create: validated.itemInputs },
      },
      include: { dispatch_order_items: true },
    });

    const order = mapDispatchOrderFromPrisma(created);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Nhân viên vận hành',
      actorId: actor.userId,
      description: `Tạo lệnh điều phối ${order.code}: chuyển ${order.vehiclePlates.length} xe từ ${validated.sourceHub.name} sang ${validated.targetHub.name}`,
      status: 'SUCCESS',
    });

    return order;
  }

  /**
   * Mục đích: Xác nhận hoàn tất lệnh điều phối khi đội vận chuyển đã bàn giao xe tại trạm đích.
   * Cách hoạt động: Tìm lệnh điều phối đang ở trạng thái IN_TRANSIT, cập nhật lại hub_id sang trạm đích và trạng thái AVAILABLE cho toàn bộ xe trong lệnh, chuyển lệnh sang COMPLETED rồi ghi nhật ký vận hành.
   */
  async completeOrder(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');

    const order = await this.prisma.dispatch_orders.findUnique({
      where: { id },
      include: { dispatch_order_items: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy lệnh điều phối.');
    }
    if (order.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Lệnh điều phối này đã được xử lý trước đó.');
    }

    const vehicleIds = order.dispatch_order_items.map((item) => item.vehicle_id);
    await this.prisma.vehicles.updateMany({
      where: { id: { in: vehicleIds } },
      data: { hub_id: order.target_hub_id, status: 'AVAILABLE' },
    });

    const updated = await this.prisma.dispatch_orders.update({
      where: { id },
      data: { status: 'COMPLETED', completed_at: new Date() },
      include: { dispatch_order_items: true },
    });

    const completed = mapDispatchOrderFromPrisma(updated);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Nhân viên vận hành',
      actorId: actor.userId,
      description: `Hoàn tất tiếp nhận ${completed.vehiclePlates.length} xe theo lệnh ${completed.code}`,
      status: 'SUCCESS',
    });

    return completed;
  }

  /**
   * Mục đích: Hủy bỏ một lệnh điều phối đang trên đường vận chuyển và hoàn trả các xe về trạm nguồn.
   * Cách hoạt động: Kiểm tra lệnh điều phối tồn tại và đang có trạng thái IN_TRANSIT, đưa toàn bộ các xe trong lệnh trở về trạm nguồn với trạng thái AVAILABLE, cập nhật lệnh sang CANCELLED và ghi nhật ký cảnh báo.
   */
  async cancelOrder(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');

    const order = await this.prisma.dispatch_orders.findUnique({
      where: { id },
      include: { dispatch_order_items: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy lệnh điều phối.');
    }
    if (order.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Chỉ có thể hủy lệnh đang vận chuyển.');
    }

    const vehicleIds = order.dispatch_order_items.map((item) => item.vehicle_id);
    await this.prisma.vehicles.updateMany({
      where: { id: { in: vehicleIds } },
      data: { hub_id: order.source_hub_id, status: 'AVAILABLE' },
    });

    const updated = await this.prisma.dispatch_orders.update({
      where: { id },
      data: { status: 'CANCELLED', completed_at: new Date() },
      include: { dispatch_order_items: true },
    });

    const cancelled = mapDispatchOrderFromPrisma(updated);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Nhân viên vận hành',
      actorId: actor.userId,
      description: `Hủy lệnh điều phối ${cancelled.code}, hoàn xe về trạm nguồn`,
      status: 'WARNING',
    });

    return cancelled;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { generateCode, generateId } from '../common/id.helpers';
import { mapDispatchOrderFromPrisma } from '../common/mappers.helpers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async listOrders() {
    const rows = await this.prisma.dispatch_orders.findMany({
      include: { dispatch_order_items: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(mapDispatchOrderFromPrisma);
  }

  async createOrder(authorizationHeader: string | undefined, dto: CreateDispatchDto) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');
    if (!dto.sourceHubId || !dto.targetHubId || !Array.isArray(dto.vehicleIds) || dto.vehicleIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn Hub nguồn, Hub đích và ít nhất 1 phương tiện điều chuyển.');
    }
    if (dto.sourceHubId === dto.targetHubId) {
      throw new BadRequestException('Hub nguồn và Hub đích không thể trùng nhau.');
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      const [sourceHub, targetHub] = await Promise.all([
        tx.hubs.findUnique({ where: { id: dto.sourceHubId } }),
        tx.hubs.findUnique({ where: { id: dto.targetHubId } }),
      ]);
      if (!sourceHub || !targetHub) {
        throw new NotFoundException('Không tìm thấy thông tin Hub nguồn hoặc Hub đích.');
      }

      const [targetDockedCount, sourceVehicles] = await Promise.all([
        tx.vehicles.count({ where: { hub_id: targetHub.id } }),
        tx.vehicles.findMany({ where: { id: { in: dto.vehicleIds } } }),
      ]);
      const freeDocksAtTarget = Math.max(0, targetHub.total_docks - targetDockedCount);
      if (dto.vehicleIds.length > freeDocksAtTarget) {
        throw new BadRequestException(
          `${targetHub.name} chỉ còn ${freeDocksAtTarget} ô đỗ trống, không đủ tiếp nhận ${dto.vehicleIds.length} xe.`,
        );
      }

      const itemInputs: { id: string; vehicle_id: string; plate_number: string }[] = [];
      const orderId = generateId('disp');

      for (const vid of dto.vehicleIds) {
        const v = sourceVehicles.find((item) => item.id === vid);
        if (!v || v.hub_id !== sourceHub.id) {
          throw new BadRequestException(`Phương tiện ${vid} không thuộc ${sourceHub.name}.`);
        }
        if (v.status !== 'AVAILABLE' && v.status !== 'CHARGING') {
          throw new BadRequestException(
            `Xe ${v.plate_number} đang ở trạng thái ${v.status}, không thể điều chuyển.`,
          );
        }
        await tx.vehicles.update({ where: { id: v.id }, data: { status: 'IN_USE' } });
        itemInputs.push({
          id: generateId('di'),
          vehicle_id: v.id,
          plate_number: v.plate_number,
        });
      }

      const created = await tx.dispatch_orders.create({
        data: {
          id: orderId,
          code: generateCode('DP'),
          operator_id: actor.userId,
          source_hub_id: sourceHub.id,
          target_hub_id: targetHub.id,
          note: dto.note?.trim() || '',
          status: 'IN_TRANSIT',
          dispatch_order_items: { create: itemInputs },
        },
        include: { dispatch_order_items: true },
      });

      return {
        order: mapDispatchOrderFromPrisma(created),
        sourceHubName: sourceHub.name,
        targetHubName: targetHub.name,
      };
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Điều phối viên',
      actorId: actor.userId,
      description: `Tạo lệnh điều phối ${outcome.order.code}: chuyển ${outcome.order.vehiclePlates.length} xe từ ${outcome.sourceHubName} sang ${outcome.targetHubName}`,
      status: 'SUCCESS',
    });

    return outcome.order;
  }

  async completeOrder(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');

    const completed = await this.prisma.$transaction(async (tx) => {
      const order = await tx.dispatch_orders.findUnique({
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
      await tx.vehicles.updateMany({
        where: { id: { in: vehicleIds } },
        data: { hub_id: order.target_hub_id, status: 'AVAILABLE' },
      });

      const updated = await tx.dispatch_orders.update({
        where: { id },
        data: { status: 'COMPLETED', completed_at: new Date() },
        include: { dispatch_order_items: true },
      });

      return mapDispatchOrderFromPrisma(updated);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Điều phối viên',
      actorId: actor.userId,
      description: `Hoàn tất tiếp nhận ${completed.vehiclePlates.length} xe theo lệnh ${completed.code}`,
      status: 'SUCCESS',
    });

    return completed;
  }

  async cancelOrder(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-ops-01');

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const order = await tx.dispatch_orders.findUnique({
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
      await tx.vehicles.updateMany({
        where: { id: { in: vehicleIds } },
        data: { hub_id: order.source_hub_id, status: 'AVAILABLE' },
      });

      const updated = await tx.dispatch_orders.update({
        where: { id },
        data: { status: 'CANCELLED', completed_at: new Date() },
        include: { dispatch_order_items: true },
      });

      return mapDispatchOrderFromPrisma(updated);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Điều phối viên',
      actorId: actor.userId,
      description: `Hủy lệnh điều phối ${cancelled.code}, hoàn xe về trạm nguồn`,
      status: 'WARNING',
    });

    return cancelled;
  }
}

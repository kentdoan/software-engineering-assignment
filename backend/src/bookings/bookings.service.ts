import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { assignParkingBayCode, pickHighestBatteryVehicle } from '../common/booking.helpers';
import { computeHubStats } from '../common/hub.helpers';
import { generateCode, generateId } from '../common/id.helpers';
import {
  mapBookingFromPrisma,
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapParkingBookingFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers.helpers';
import { Booking, ParkingBooking } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, CreateParkingBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private expirationTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    void this.expireOverdue();
    this.expirationTimer = setInterval(() => {
      void this.expireOverdue();
    }, 10_000);
  }

  onModuleDestroy() {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  async expireOverdue(): Promise<{ expiredCount: number }> {
    const now = new Date();
    const expiredCount = await this.prisma.$transaction(async (tx) => {
      const overdue = await tx.bookings.findMany({
        where: { status: 'ACTIVE', expires_at: { lte: now } },
        select: { id: true, vehicle_id: true },
      });

      if (overdue.length > 0) {
        await tx.bookings.updateMany({
          where: { id: { in: overdue.map((b) => b.id) } },
          data: { status: 'EXPIRED' },
        });
        await tx.vehicles.updateMany({
          where: { id: { in: overdue.map((b) => b.vehicle_id) }, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        });
      }

      const overdueParking = await tx.parking_bookings.updateMany({
        where: { status: 'ACTIVE', expires_at: { lte: now } },
        data: { status: 'EXPIRED' },
      });

      return overdue.length + overdueParking.count;
    });

    return { expiredCount };
  }

  async createBooking(
    authorizationHeader: string | undefined,
    dto: CreateBookingDto,
  ): Promise<Booking> {
    await this.expireOverdue();
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );

    if (actor.user?.status === 'LOCKED') {
      throw new BadRequestException('Tài khoản của bạn đang bị khóa, không thể đặt xe.');
    }
    if ((actor.user?.unpaidFee ?? 0) > 0) {
      throw new BadRequestException(
        `Tài khoản còn khoản phí tồn đọng (${actor.user?.unpaidFee?.toLocaleString('vi-VN')} VNĐ). Vui lòng thanh toán trước khi đặt xe.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingBooking = await tx.bookings.findFirst({
        where: { user_id: actor.userId, status: 'ACTIVE' },
      });
      if (existingBooking) {
        throw new ConflictException('Bạn đang có một lượt đặt giữ xe chưa hoàn tất.');
      }

      const activeRental = await tx.rentals.findFirst({
        where: { user_id: actor.userId, status: 'ACTIVE' },
      });
      if (activeRental) {
        throw new ConflictException('Bạn đang trong một chuyến đi, vui lòng trả xe trước khi đặt xe mới.');
      }

      const hubRow = await tx.hubs.findUnique({ where: { id: dto.hubId } });
      if (!hubRow) {
        throw new NotFoundException(`Không tìm thấy trạm Hub ${dto.hubId}`);
      }

      const hubVehicles = (
        await tx.vehicles.findMany({ where: { hub_id: dto.hubId } })
      ).map(mapVehicleFromPrisma);

      let chosenId = dto.vehicleId;
      if (dto.fastReserve || !chosenId) {
        const picked = pickHighestBatteryVehicle(hubVehicles, dto.hubId, dto.vehicleType, 20);
        if (!picked) {
          throw new BadRequestException(
            `Không có phương tiện sẵn sàng (pin >= 20%) tại ${hubRow.name} để đặt nhanh.`,
          );
        }
        chosenId = picked.id;
      } else {
        const specific = hubVehicles.find((v) => v.id === chosenId);
        if (!specific) {
          throw new NotFoundException('Không tìm thấy phương tiện tại trạm Hub này.');
        }
        if (specific.status !== 'AVAILABLE') {
          throw new ConflictException(`Xe ${specific.plateNumber} hiện không ở trạng thái sẵn sàng.`);
        }
        if (specific.batterySoc < 20) {
          throw new BadRequestException(
            `Xe ${specific.plateNumber} có mức pin ${specific.batterySoc}% dưới ngưỡng an toàn 20%.`,
          );
        }
      }

      const locked = await tx.vehicles.updateMany({
        where: { id: chosenId, status: 'AVAILABLE' },
        data: { status: 'BOOKED' },
      });
      if (locked.count === 0) {
        throw new ConflictException('Phương tiện vừa có người khác đặt giữ trước. Vui lòng chọn xe khác.');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      const created = await tx.bookings.create({
        data: {
          id: generateId('book'),
          code: generateCode('BOOK'),
          user_id: actor.userId,
          vehicle_id: chosenId,
          hub_id: hubRow.id,
          created_at: now,
          expires_at: expiresAt,
          status: 'ACTIVE',
        },
        include: { vehicles: true, hubs: true },
      });

      return mapBookingFromPrisma(created);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Đặt giữ xe ${result.vehicle?.plateNumber || result.vehicleId} tại ${result.hub?.name || dto.hubId} (${result.code})`,
      status: 'SUCCESS',
    });

    return result;
  }

  async createParkingBooking(
    authorizationHeader: string | undefined,
    dto: CreateParkingBookingDto,
  ): Promise<ParkingBooking> {
    await this.expireOverdue();
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );
    const plate = (dto.vehiclePlate || '').trim().toUpperCase();
    if (!dto.hubId || !plate) {
      throw new BadRequestException('Vui lòng chọn Hub và nhập biển số phương tiện cá nhân.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const hubRow = await tx.hubs.findUnique({ where: { id: dto.hubId } });
      if (!hubRow) {
        throw new NotFoundException('Không tìm thấy trạm Hub.');
      }

      const [vehRows, cpRows, existingParkingRows] = await Promise.all([
        tx.vehicles.findMany({ where: { hub_id: dto.hubId } }),
        tx.charging_points.findMany({ where: { hub_id: dto.hubId } }),
        tx.parking_bookings.findMany({ where: { status: 'ACTIVE' } }),
      ]);

      const hubStats = computeHubStats(
        mapHubFromPrisma(hubRow),
        vehRows.map(mapVehicleFromPrisma),
        cpRows.map(mapChargingPointFromPrisma),
        existingParkingRows.map(mapParkingBookingFromPrisma),
      );

      if ((hubStats.availableDocks ?? 0) <= 0) {
        throw new BadRequestException(`${hubRow.name} hiện đã hết ô đỗ xe trống.`);
      }

      if (existingParkingRows.some((p) => p.user_id === actor.userId)) {
        throw new ConflictException('Bạn đã có một lượt giữ chỗ đỗ xe cá nhân đang hiệu lực.');
      }

      const bayCode = assignParkingBayCode(
        hubRow.id,
        existingParkingRows.map(mapParkingBookingFromPrisma),
      );
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

      const row = await tx.parking_bookings.create({
        data: {
          id: generateId('park'),
          code: generateCode('PARK'),
          user_id: actor.userId,
          hub_id: hubRow.id,
          hub_name: hubRow.name,
          vehicle_plate: plate,
          bay_code: bayCode,
          arrival_time: dto.arrivalTime || now.toTimeString().slice(0, 5),
          expires_at: expiresAt,
          status: 'ACTIVE',
          created_at: now,
        },
      });

      return mapParkingBookingFromPrisma(row);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Đặt ô đỗ xe cá nhân ${created.bayCode} cho biển số ${plate} tại ${created.hubName}`,
      status: 'SUCCESS',
    });

    return created;
  }

  async getActiveBookings(authorizationHeader?: string, userIdQuery?: string) {
    await this.expireOverdue();
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      userIdQuery || 'user-stu-01',
    );

    const [bookingRows, parkingRows] = await Promise.all([
      this.prisma.bookings.findMany({
        where: { user_id: actor.userId },
        include: { vehicles: true, hubs: true },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      this.prisma.parking_bookings.findMany({
        where: { user_id: actor.userId },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    const mappedBookings = bookingRows.map(mapBookingFromPrisma);
    const mappedParking = parkingRows.map(mapParkingBookingFromPrisma);

    return {
      vehicleBooking: mappedBookings.find((b) => b.status === 'ACTIVE') || null,
      parkingBooking: mappedParking.find((p) => p.status === 'ACTIVE') || null,
      historyBookings: mappedBookings,
      historyParkingBookings: mappedParking,
    };
  }

  async cancelBooking(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-stu-01');

    const bookingRow = await this.prisma.bookings.findUnique({ where: { id } });
    if (bookingRow) {
      if (bookingRow.status !== 'ACTIVE') {
        throw new BadRequestException('Lượt đặt xe này không còn ở trạng thái hiệu lực để hủy.');
      }

      const cancelled = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.bookings.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: { vehicles: true, hubs: true },
        });
        await tx.vehicles.updateMany({
          where: { id: bookingRow.vehicle_id, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        });
        return mapBookingFromPrisma(updated);
      });

      await this.auditService.log({
        category: 'VAN_HANH',
        actorName: actor.user?.name || 'Sinh viên',
        actorId: actor.userId,
        description: `Hủy lượt giữ xe ${cancelled.code || cancelled.id}`,
        status: 'WARNING',
      });

      return { message: 'Đã hủy lượt đặt giữ xe thành công.', booking: cancelled };
    }

    const pRow = await this.prisma.parking_bookings.findUnique({ where: { id } });
    if (!pRow) {
      throw new NotFoundException(`Không tìm thấy lượt đặt chỗ ${id}`);
    }
    if (pRow.status !== 'ACTIVE') {
      throw new BadRequestException('Lượt giữ chỗ đỗ này đã kết thúc hoặc bị hủy trước đó.');
    }

    const updatedParking = await this.prisma.parking_bookings.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Hủy lượt đặt chỗ đỗ xe cá nhân ${updatedParking.code} tại ${updatedParking.hub_name}`,
      status: 'WARNING',
    });

    return {
      message: 'Đã hủy lượt giữ chỗ đỗ xe cá nhân.',
      parkingBooking: mapParkingBookingFromPrisma(updatedParking),
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { estimateTripDistanceKm } from '../common/geo.helpers';
import { computeHubStats } from '../common/hub.helpers';
import { generateCode, generateId } from '../common/id.helpers';
import {
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapParkingBookingFromPrisma,
  mapRentalFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers.helpers';
import { calculateRentalFare, pickReturnBayCode } from '../common/rental.helpers';
import { Rental } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async pickupVehicle(
    authorizationHeader: string | undefined,
    dto: CreateRentalDto,
  ): Promise<Rental> {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );

    if (actor.user?.status === 'LOCKED') {
      throw new BadRequestException('Tài khoản đang bị khóa, không thể mở khóa nhận xe.');
    }
    if ((actor.user?.unpaidFee ?? 0) > 0) {
      throw new BadRequestException(
        `Bạn còn khoản phí chưa thanh toán (${actor.user?.unpaidFee?.toLocaleString('vi-VN')} VNĐ).`,
      );
    }

    const rental = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
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

      const existingActive = await tx.rentals.findFirst({
        where: { user_id: actor.userId, status: 'ACTIVE' },
      });
      if (existingActive) {
        throw new ConflictException('Bạn đang có một chuyến đi chưa kết thúc.');
      }

      let vehicleRow: Awaited<ReturnType<typeof tx.vehicles.findFirst>> = null;
      let originHubId = '';
      let linkedBookingId: string | null = null;

      if (dto.bookingId) {
        const booking = await tx.bookings.findUnique({ where: { id: dto.bookingId } });
        if (!booking) {
          throw new NotFoundException('Không tìm thấy mã đặt xe.');
        }
        if (booking.status !== 'ACTIVE') {
          throw new BadRequestException('Lượt đặt xe đã hết hạn hoặc bị hủy.');
        }

        vehicleRow = await tx.vehicles.findUnique({ where: { id: booking.vehicle_id } });
        if (!vehicleRow) {
          throw new NotFoundException('Không tìm thấy xe trong lượt đặt.');
        }
        if (vehicleRow.battery_soc < 20) {
          throw new BadRequestException(
            `Xe ${vehicleRow.plate_number} hiện chỉ còn ${vehicleRow.battery_soc}% pin (< 20%), không đủ điều kiện nhận xe.`,
          );
        }

        await tx.bookings.update({ where: { id: booking.id }, data: { status: 'COMPLETED' } });
        originHubId = booking.hub_id;
        linkedBookingId = booking.id;
      } else if (dto.vehicleId || dto.qrCode) {
        const codeNorm = (dto.qrCode || '').trim();
        vehicleRow = await tx.vehicles.findFirst({
          where: dto.vehicleId
            ? { id: dto.vehicleId }
            : {
                OR: [
                  { qr_code: { equals: codeNorm, mode: 'insensitive' } },
                  { plate_number: { equals: codeNorm, mode: 'insensitive' } },
                  { id: { equals: codeNorm, mode: 'insensitive' } },
                ],
              },
        });

        if (!vehicleRow) {
          throw new NotFoundException('Không tìm thấy xe tương ứng với mã QR hoặc ID đã quét.');
        }
        if (vehicleRow.status !== 'AVAILABLE') {
          throw new ConflictException(
            `Xe ${vehicleRow.plate_number} hiện ở trạng thái ${vehicleRow.status}, không thể nhận trực tiếp.`,
          );
        }
        if (vehicleRow.battery_soc < 20) {
          throw new BadRequestException(
            `Xe ${vehicleRow.plate_number} chỉ còn ${vehicleRow.battery_soc}% pin (< 20%). Vui lòng chọn xe khác.`,
          );
        }
        originHubId = vehicleRow.hub_id || 'hub-01';
      } else {
        throw new BadRequestException('Vui lòng cung cấp mã đặt xe hoặc quét mã QR phương tiện.');
      }

      const updatedVehicle = await tx.vehicles.updateMany({
        where: { id: vehicleRow.id, status: vehicleRow.status },
        data: { status: 'IN_USE' },
      });
      if (updatedVehicle.count === 0) {
        throw new ConflictException('Phương tiện vừa thay đổi trạng thái, vui lòng thử lại.');
      }

      const createdRow = await tx.rentals.create({
        data: {
          id: generateId('rent'),
          user_id: actor.userId,
          vehicle_id: vehicleRow.id,
          booking_id: linkedBookingId,
          origin_hub_id: originHubId,
          start_time: now,
          status: 'ACTIVE',
        },
        include: {
          vehicles: true,
          hubs_rentals_origin_hub_idTohubs: true,
          hubs_rentals_destination_hub_idTohubs: true,
        },
      });

      return mapRentalFromPrisma(createdRow);
    });

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Nhận xe ${rental.vehicle?.plateNumber || rental.vehicleId} tại ${
        rental.originHub?.name || rental.originHubId
      } (Mở khóa chuyến đi)`,
      status: 'SUCCESS',
    });

    return rental;
  }

  async getActiveRental(authorizationHeader?: string, userIdQuery?: string): Promise<Rental | null> {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      userIdQuery || 'user-stu-01',
    );
    const active = await this.prisma.rentals.findFirst({
      where: { user_id: actor.userId, status: 'ACTIVE' },
      include: {
        vehicles: true,
        hubs_rentals_origin_hub_idTohubs: true,
        hubs_rentals_destination_hub_idTohubs: true,
      },
    });
    return active ? mapRentalFromPrisma(active) : null;
  }

  async getRentalHistory(authorizationHeader?: string, userIdQuery?: string): Promise<Rental[]> {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      userIdQuery || 'user-stu-01',
    );
    const rows = await this.prisma.rentals.findMany({
      where: { user_id: actor.userId, status: 'COMPLETED' },
      include: {
        vehicles: true,
        hubs_rentals_origin_hub_idTohubs: true,
        hubs_rentals_destination_hub_idTohubs: true,
      },
      orderBy: { end_time: 'desc' },
    });
    return rows.map(mapRentalFromPrisma);
  }

  async returnVehicle(authorizationHeader: string | undefined, dto: UpdateRentalDto) {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );

    const outcome = await this.prisma.$transaction(async (tx) => {
      const rentalRow = dto.rentalId
        ? await tx.rentals.findFirst({ where: { id: dto.rentalId, status: 'ACTIVE' } })
        : await tx.rentals.findFirst({ where: { user_id: actor.userId, status: 'ACTIVE' } });

      if (!rentalRow) {
        throw new NotFoundException('Không tìm thấy chuyến đi đang hoạt động để trả xe.');
      }

      const [originHubRow, destHubRow] = await Promise.all([
        tx.hubs.findUnique({ where: { id: rentalRow.origin_hub_id } }),
        tx.hubs.findUnique({ where: { id: dto.destinationHubId } }),
      ]);
      if (!destHubRow) {
        throw new NotFoundException(`Không tìm thấy trạm trả xe ${dto.destinationHubId}`);
      }

      const [destVehRows, destCpRows, parkingRows, vehicleRow] = await Promise.all([
        tx.vehicles.findMany({ where: { hub_id: destHubRow.id } }),
        tx.charging_points.findMany({ where: { hub_id: destHubRow.id } }),
        tx.parking_bookings.findMany({ where: { hub_id: destHubRow.id, status: 'ACTIVE' } }),
        tx.vehicles.findUnique({ where: { id: rentalRow.vehicle_id } }),
      ]);

      if (!vehicleRow) {
        throw new NotFoundException('Không tìm thấy thông tin phương tiện.');
      }

      const destMappedVehicles = destVehRows.map(mapVehicleFromPrisma);
      const destStats = computeHubStats(
        mapHubFromPrisma(destHubRow),
        destMappedVehicles,
        destCpRows.map(mapChargingPointFromPrisma),
        parkingRows.map(mapParkingBookingFromPrisma),
      );

      if ((destStats.availableDocks ?? 0) <= 0) {
        throw new BadRequestException(
          `${destHubRow.name} hiện đã hết ô đỗ xe trống. Vui lòng chọn Hub lân cận.`,
        );
      }

      const endTime = new Date();
      const durationMinutes = Math.max(
        1,
        Math.round((endTime.getTime() - rentalRow.start_time.getTime()) / 60000),
      );
      const distanceKm = estimateTripDistanceKm(
        originHubRow ? mapHubFromPrisma(originHubRow) : undefined,
        mapHubFromPrisma(destHubRow),
      );
      const fare = calculateRentalFare(durationMinutes, vehicleRow.type);
      const assignedBay = pickReturnBayCode(destHubRow.id, destMappedVehicles);

      const batteryUsed = Math.min(35, Math.max(4, Math.round(distanceKm * 4 + durationMinutes * 0.4)));
      const newBatterySoc = Math.max(10, vehicleRow.battery_soc - batteryUsed);
      const nextStatus = dto.damagedReported
        ? 'FAULTY'
        : newBatterySoc < 20
          ? 'CHARGING'
          : 'AVAILABLE';

      const updatedVehicleRow = await tx.vehicles.update({
        where: { id: vehicleRow.id },
        data: {
          battery_soc: newBatterySoc,
          hub_id: destHubRow.id,
          bay_code: assignedBay,
          status: nextStatus,
        },
      });

      if (dto.damagedReported) {
        await tx.incidents.create({
          data: {
            id: generateId('inc'),
            code: generateCode('INC'),
            reporter_id: actor.userId,
            hub_id: destHubRow.id,
            resource_type: 'VEHICLE',
            vehicle_id: vehicleRow.id,
            charging_point_id: null,
            resource_label: `${vehicleRow.plate_number} (${vehicleRow.model})`,
            incident_type: 'Báo cáo hư hỏng sau chuyến đi',
            description:
              dto.damageNote?.trim() || 'Sinh viên ghi nhận bất thường kỹ thuật khi trả xe.',
            affected_summary: 'Đã tự động cô lập xe sang trạng thái Hư hỏng chờ kiểm tra',
            status: 'OPEN',
            created_at: endTime,
          },
        });
      }

      const studentProfile = await tx.student_profiles.findUnique({
        where: { user_id: rentalRow.user_id },
      });
      let balanceRemaining = studentProfile?.balance ?? 0;
      if (studentProfile) {
        if (studentProfile.balance >= fare) {
          balanceRemaining = studentProfile.balance - fare;
          await tx.student_profiles.update({
            where: { user_id: rentalRow.user_id },
            data: { balance: balanceRemaining },
          });
        } else {
          await tx.student_profiles.update({
            where: { user_id: rentalRow.user_id },
            data: {
              balance: 0,
              unpaid_fee: studentProfile.unpaid_fee + (fare - studentProfile.balance),
            },
          });
          balanceRemaining = 0;
        }
      }

      const updatedRentalRow = await tx.rentals.update({
        where: { id: rentalRow.id },
        data: {
          destination_hub_id: destHubRow.id,
          return_bay_code: assignedBay,
          end_time: endTime,
          duration_minutes: durationMinutes,
          distance_km: distanceKm,
          fare,
          damaged_reported: Boolean(dto.damagedReported),
          damage_note: dto.damageNote?.trim() || '',
          status: 'COMPLETED',
        },
        include: {
          vehicles: true,
          hubs_rentals_origin_hub_idTohubs: true,
          hubs_rentals_destination_hub_idTohubs: true,
        },
      });

      return {
        rental: mapRentalFromPrisma(updatedRentalRow),
        vehicle: mapVehicleFromPrisma(updatedVehicleRow),
        destHubName: destHubRow.name,
        receipt: {
          fare,
          durationMinutes,
          distanceKm,
          bayCode: assignedBay,
          newBatterySoc,
          nextVehicleStatus: nextStatus,
          autoQueuedForCharging: nextStatus === 'CHARGING',
          balanceRemaining,
        },
      };
    });

    await this.auditService.log({
      category: dto.damagedReported ? 'CANH_BAO' : 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Trả xe ${outcome.vehicle.plateNumber} tại ô ${outcome.receipt.bayCode} (${
        outcome.destHubName
      }) - Cước ${outcome.receipt.fare.toLocaleString('vi-VN')} VNĐ${
        outcome.receipt.autoQueuedForCharging ? ' - Tự động đưa vào hàng đợi sạc' : ''
      }`,
      status: dto.damagedReported ? 'WARNING' : 'SUCCESS',
    });

    return {
      rental: outcome.rental,
      vehicle: outcome.vehicle,
      receipt: outcome.receipt,
    };
  }
}

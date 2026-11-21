import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { vehicles } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { assignReturnParkingSpace } from '../common/calculators/bay-allocator.calculator';
import { computeHubStats } from '../common/calculators/hub-stats.calculator';
import { calculateRentalFee } from '../common/calculators/rental-fare.calculator';
import { Rental, VehicleStatus } from '../common/interfaces';
import {
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapParkingBookingFromPrisma,
  mapRentalFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers';
import { estimateTripDistanceKm } from '../common/utils/geo.util';
import { generateCode, generateId } from '../common/utils/id-generator.util';
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

  /**
   * Mục đích: Kiểm tra đầy đủ các điều kiện tiên quyết của sinh viên, đơn đặt trước và phương tiện trước khi cho phép mở khóa nhận xe.
   * Cách hoạt động: Xác nhận tài khoản không bị khóa và không còn nợ phí, thu hồi các đơn đặt quá hạn 15 phút, đảm bảo sinh viên chưa có chuyến đi ACTIVE nào khác, rồi đối chiếu thông tin đơn đặt trước hoặc tìm xe theo mã QR/ID để kiểm tra trạng thái sẵn sàng và mức pin đạt tối thiểu 20%.
   */
  async validatePickupPreconditions(
    userId: string,
    userStatus: string | undefined,
    unpaidFee: number,
    dto: CreateRentalDto,
  ) {
    if (userStatus === 'LOCKED') {
      throw new BadRequestException('Tài khoản đang bị khóa, không thể mở khóa nhận xe.');
    }
    if (unpaidFee > 0) {
      throw new BadRequestException(
        `Bạn còn khoản phí chưa thanh toán (${unpaidFee.toLocaleString('vi-VN')} VNĐ).`,
      );
    }

    const now = new Date();
    const overdue = await this.prisma.bookings.findMany({
      where: { status: 'ACTIVE', expires_at: { lte: now } },
      select: { id: true, vehicle_id: true },
    });
    if (overdue.length > 0) {
      await this.prisma.bookings.updateMany({
        where: { id: { in: overdue.map((b) => b.id) } },
        data: { status: 'EXPIRED' },
      });
      await this.prisma.vehicles.updateMany({
        where: { id: { in: overdue.map((b) => b.vehicle_id) }, status: 'BOOKED' },
        data: { status: 'AVAILABLE' },
      });
    }

    const existingActive = await this.prisma.rentals.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
    });
    if (existingActive) {
      throw new ConflictException('Bạn đang có một chuyến đi chưa kết thúc.');
    }

    let vehicleRow: vehicles | null = null;
    let originHubId = '';
    let linkedBookingId: string | null = null;

    if (dto.bookingId) {
      const booking = await this.prisma.bookings.findUnique({ where: { id: dto.bookingId } });
      if (!booking) {
        throw new NotFoundException('Không tìm thấy mã đặt xe.');
      }
      if (booking.status !== 'ACTIVE') {
        throw new BadRequestException('Lượt đặt xe đã hết hạn hoặc bị hủy.');
      }

      vehicleRow = await this.prisma.vehicles.findUnique({ where: { id: booking.vehicle_id } });
      if (!vehicleRow) {
        throw new NotFoundException('Không tìm thấy xe trong lượt đặt.');
      }
      if (vehicleRow.battery_soc < 20) {
        throw new BadRequestException(
          `Xe ${vehicleRow.plate_number} hiện chỉ còn ${vehicleRow.battery_soc}% pin (< 20%), không đủ điều kiện nhận xe.`,
        );
      }

      await this.prisma.bookings.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' },
      });
      originHubId = booking.hub_id;
      linkedBookingId = booking.id;
    } else if (dto.vehicleId || dto.qrCode) {
      if (dto.vehicleId) {
        vehicleRow = await this.prisma.vehicles.findFirst({
          where: { id: dto.vehicleId },
        });
      } else {
        const codeNorm = (dto.qrCode || '').trim();
        vehicleRow = await this.prisma.vehicles.findFirst({
          where: {
            OR: [
              { qr_code: { equals: codeNorm, mode: 'insensitive' } },
              { plate_number: { equals: codeNorm, mode: 'insensitive' } },
              { id: { equals: codeNorm, mode: 'insensitive' } },
            ],
          },
        });
      }

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

    return {
      vehicleRow,
      originHubId,
      linkedBookingId,
      startTime: now,
    };
  }

  /**
   * Mục đích: Khởi tạo bản ghi chuyến thuê xe mới và khóa phương tiện sang trạng thái đang sử dụng.
   * Cách hoạt động: Cập nhật có điều kiện trạng thái xe sang IN_USE để tránh trùng lặp, tạo bản ghi trong bảng rentals ở trạng thái ACTIVE, ghi nhận nhật ký vận hành và trả về đối tượng Rental chuẩn.
   */
  async startTrip(
    userId: string,
    userName: string,
    vehicleRow: vehicles,
    originHubId: string,
    linkedBookingId: string | null,
    startTime: Date,
  ): Promise<Rental> {
    const updatedVehicle = await this.prisma.vehicles.updateMany({
      where: { id: vehicleRow.id, status: vehicleRow.status },
      data: { status: 'IN_USE' },
    });
    if (updatedVehicle.count === 0) {
      throw new ConflictException('Phương tiện vừa thay đổi trạng thái, vui lòng thử lại.');
    }

    const createdRow = await this.prisma.rentals.create({
      data: {
        id: generateId('rent'),
        user_id: userId,
        vehicle_id: vehicleRow.id,
        booking_id: linkedBookingId,
        origin_hub_id: originHubId,
        start_time: startTime,
        status: 'ACTIVE',
      },
      include: {
        vehicles: true,
        hubs_rentals_origin_hub_idTohubs: true,
        hubs_rentals_destination_hub_idTohubs: true,
      },
    });

    const rental = mapRentalFromPrisma(createdRow);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: userName,
      actorId: userId,
      description: `Nhận xe ${rental.vehicle?.plateNumber || rental.vehicleId} tại ${
        rental.originHub?.name || rental.originHubId
      } (Mở khóa chuyến đi)`,
      status: 'SUCCESS',
    });

    return rental;
  }

  /**
   * Mục đích: Xử lý yêu cầu nhận xe tại trạm của sinh viên (qua đơn đặt trước hoặc quét mã QR trực tiếp).
   * Cách hoạt động: Xác định người dùng hiện tại từ phiên làm việc, gọi validatePickupPreconditions để kiểm tra toàn bộ điều kiện hợp lệ, sau đó gọi startTrip để chuyển xe sang IN_USE và mở chuyến đi mới.
   */
  async pickupVehicle(
    authorizationHeader: string | undefined,
    dto: CreateRentalDto,
  ): Promise<Rental> {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );

    const validated = await this.validatePickupPreconditions(
      actor.userId,
      actor.user?.status,
      actor.user?.unpaidFee ?? 0,
      dto,
    );

    return this.startTrip(
      actor.userId,
      actor.user?.name || 'Sinh viên',
      validated.vehicleRow,
      validated.originHubId,
      validated.linkedBookingId,
      validated.startTime,
    );
  }

  /**
   * Mục đích: Truy xuất thông tin chuyến thuê xe đang diễn ra của sinh viên hiện tại.
   * Cách hoạt động: Xác định người dùng từ phiên đăng nhập, tìm bản ghi trong bảng rentals có trạng thái ACTIVE kèm thông tin xe, trạm xuất phát và trạm đích rồi trả về đối tượng Rental hoặc null nếu không có chuyến đi nào.
   */
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

  /**
   * Mục đích: Lấy danh sách lịch sử các chuyến thuê xe đã hoàn thành của sinh viên.
   * Cách hoạt động: Xác định người dùng hiện tại, truy vấn toàn bộ bản ghi rentals có trạng thái COMPLETED sắp xếp theo thời điểm trả xe mới nhất rồi chuyển đổi sang định dạng Rental chuẩn.
   */
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

  /**
   * Mục đích: Kết thúc chuyến đi, trả xe tại trạm đích, chốt cước phí, trừ tiền ví sinh viên và cập nhật trạng thái phương tiện.
   * Cách hoạt động: Tìm chuyến đi đang ACTIVE và kiểm tra trạm đích còn ô đỗ trống, gọi calculateRentalFee tính cước phí và assignReturnParkingSpace để chỉ định ô đỗ; xác định trạng thái tiếp theo của xe (FAULTY nếu báo hư hỏng, CHARGING nếu pin dưới 20%, ngược lại AVAILABLE), tạo sự cố nếu báo hỏng, trừ số dư hoặc ghi nợ unpaid_fee vào hồ sơ sinh viên, chốt bản ghi rentals sang COMPLETED và ghi nhật ký biên lai.
   */
  async endTrip(authorizationHeader: string | undefined, dto: UpdateRentalDto) {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );

    let rentalRow = null;
    if (dto.rentalId) {
      rentalRow = await this.prisma.rentals.findFirst({
        where: { id: dto.rentalId, status: 'ACTIVE' },
      });
    } else {
      rentalRow = await this.prisma.rentals.findFirst({
        where: { user_id: actor.userId, status: 'ACTIVE' },
      });
    }

    if (!rentalRow) {
      throw new NotFoundException('Không tìm thấy chuyến đi đang hoạt động để trả xe.');
    }

    const originHubRow = await this.prisma.hubs.findUnique({
      where: { id: rentalRow.origin_hub_id },
    });
    const destHubRow = await this.prisma.hubs.findUnique({
      where: { id: dto.destinationHubId },
    });
    if (!destHubRow) {
      throw new NotFoundException(`Không tìm thấy trạm trả xe ${dto.destinationHubId}`);
    }

    const destVehRows = await this.prisma.vehicles.findMany({ where: { hub_id: destHubRow.id } });
    const destCpRows = await this.prisma.charging_points.findMany({ where: { hub_id: destHubRow.id } });
    const parkingRows = await this.prisma.parking_bookings.findMany({
      where: { hub_id: destHubRow.id, status: 'ACTIVE' },
    });
    const vehicleRow = await this.prisma.vehicles.findUnique({
      where: { id: rentalRow.vehicle_id },
    });

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
    const originHub = originHubRow ? mapHubFromPrisma(originHubRow) : undefined;
    const distanceKm = estimateTripDistanceKm(originHub, mapHubFromPrisma(destHubRow));
    const fare = calculateRentalFee(durationMinutes, vehicleRow.type);
    const assignedBay = assignReturnParkingSpace(destHubRow.id, destMappedVehicles);

    const batteryUsed = Math.min(35, Math.max(4, Math.round(distanceKm * 4 + durationMinutes * 0.4)));
    const newBatterySoc = Math.max(10, vehicleRow.battery_soc - batteryUsed);

    let nextStatus: VehicleStatus = 'AVAILABLE';
    if (dto.damagedReported) {
      nextStatus = 'FAULTY';
    } else if (newBatterySoc < 20) {
      nextStatus = 'CHARGING';
    }

    const updatedVehicleRow = await this.prisma.vehicles.update({
      where: { id: vehicleRow.id },
      data: {
        battery_soc: newBatterySoc,
        hub_id: destHubRow.id,
        bay_code: assignedBay,
        status: nextStatus,
      },
    });

    if (dto.damagedReported) {
      await this.prisma.incidents.create({
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

    const studentProfile = await this.prisma.student_profiles.findUnique({
      where: { user_id: rentalRow.user_id },
    });
    let balanceRemaining = studentProfile?.balance ?? 0;
    if (studentProfile) {
      if (studentProfile.balance >= fare) {
        balanceRemaining = studentProfile.balance - fare;
        await this.prisma.student_profiles.update({
          where: { user_id: rentalRow.user_id },
          data: { balance: balanceRemaining },
        });
      } else {
        await this.prisma.student_profiles.update({
          where: { user_id: rentalRow.user_id },
          data: {
            balance: 0,
            unpaid_fee: studentProfile.unpaid_fee + (fare - studentProfile.balance),
          },
        });
        balanceRemaining = 0;
      }
    }

    const updatedRentalRow = await this.prisma.rentals.update({
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

    const rental = mapRentalFromPrisma(updatedRentalRow);
    const vehicle = mapVehicleFromPrisma(updatedVehicleRow);
    const receipt = {
      fare,
      durationMinutes,
      distanceKm,
      bayCode: assignedBay,
      newBatterySoc,
      nextVehicleStatus: nextStatus,
      autoQueuedForCharging: nextStatus === 'CHARGING',
      balanceRemaining,
    };

    let auditCategory: 'CANH_BAO' | 'VAN_HANH' = 'VAN_HANH';
    let auditStatus: 'WARNING' | 'SUCCESS' = 'SUCCESS';
    if (dto.damagedReported) {
      auditCategory = 'CANH_BAO';
      auditStatus = 'WARNING';
    }

    let chargeNotice = '';
    if (receipt.autoQueuedForCharging) {
      chargeNotice = ' - Tự động đưa vào hàng đợi sạc';
    }

    await this.auditService.log({
      category: auditCategory,
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Trả xe ${vehicle.plateNumber} tại ô ${receipt.bayCode} (${destHubRow.name}) - Cước ${receipt.fare.toLocaleString('vi-VN')} VNĐ${chargeNotice}`,
      status: auditStatus,
    });

    return {
      rental,
      vehicle,
      receipt,
    };
  }
}

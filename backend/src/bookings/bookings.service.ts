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
import {
  assignParkingBayCode,
  autoAllocateHighestBatteryVehicle,
} from '../common/calculators/bay-allocator.calculator';
import { computeHubStats } from '../common/calculators/hub-stats.calculator';
import { Booking, ParkingBooking } from '../common/interfaces';
import {
  mapBookingFromPrisma,
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapParkingBookingFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers';
import { generateCode, generateId } from '../common/utils/id-generator.util';
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

  /**
   * Mục đích: Khởi động tác vụ kiểm tra và thu hồi các lượt đặt chỗ quá hạn 15 phút ngay khi module được nạp vào hệ thống.
   * Cách hoạt động: Gọi hàm handleBookingExpiration15Min ngay lập tức một lần và thiết lập bộ đếm chu kỳ 10 giây một lần để tự động quét các đơn đặt quá hạn.
   */
  onModuleInit() {
    void this.handleBookingExpiration15Min();
    this.expirationTimer = setInterval(() => {
      void this.handleBookingExpiration15Min();
    }, 10_000);
  }

  /**
   * Mục đích: Dọn dẹp bộ đếm thời gian định kỳ khi ứng dụng tắt để tránh rò rỉ tài nguyên.
   * Cách hoạt động: Kiểm tra nếu expirationTimer đang tồn tại thì gọi clearInterval và gán lại về null.
   */
  onModuleDestroy() {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  /**
   * Mục đích: Xử lý tự động thu hồi các lượt đặt giữ xe dùng chung và giữ chỗ đỗ xe cá nhân đã quá hạn 15 phút không đến nhận.
   * Cách hoạt động: Tìm các phiếu đặt xe đang ACTIVE có expires_at nhỏ hơn hoặc bằng thời điểm hiện tại, cập nhật trạng thái phiếu sang EXPIRED và giải phóng các xe đang ở trạng thái BOOKED về AVAILABLE; sau đó cập nhật tương tự cho các lượt đặt chỗ đỗ xe cá nhân quá hạn và trả về tổng số lượt đã hết hạn.
   */
  async handleBookingExpiration15Min(): Promise<{ expiredCount: number }> {
    const now = new Date();
    const overdue = await this.prisma.bookings.findMany({
      where: { status: 'ACTIVE', expires_at: { lte: now } },
      select: { id: true, vehicle_id: true },
    });

    if (overdue.length > 0) {
      const overdueIds = overdue.map((b) => b.id);
      const overdueVehicleIds = overdue.map((b) => b.vehicle_id);

      await this.prisma.bookings.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'EXPIRED' },
      });
      await this.prisma.vehicles.updateMany({
        where: { id: { in: overdueVehicleIds }, status: 'BOOKED' },
        data: { status: 'AVAILABLE' },
      });
    }

    const overdueParking = await this.prisma.parking_bookings.updateMany({
      where: { status: 'ACTIVE', expires_at: { lte: now } },
      data: { status: 'EXPIRED' },
    });

    return { expiredCount: overdue.length + overdueParking.count };
  }

  /**
   * Mục đích: Tạo mới một lượt đặt giữ xe dùng chung tại trạm Hub cho sinh viên với thời hạn giữ chỗ 15 phút.
   * Cách hoạt động: Thu hồi các đơn quá hạn trước, xác thực trạng thái tài khoản không bị khóa và không còn nợ phí, đảm bảo sinh viên chưa có lượt đặt hoặc chuyến đi nào đang mở; nếu đặt nhanh thì gọi autoAllocateHighestBatteryVehicle để chọn xe pin cao nhất (>= 20%), nếu chọn xe cụ thể thì kiểm tra xe sẵn sàng và pin đạt ngưỡng, sau đó khóa xe sang BOOKED, lưu đơn đặt và ghi nhật ký kiểm toán.
   */
  async createSharedVehicleBooking(
    authorizationHeader: string | undefined,
    dto: CreateBookingDto,
  ): Promise<Booking> {
    await this.handleBookingExpiration15Min();
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

    const existingBooking = await this.prisma.bookings.findFirst({
      where: { user_id: actor.userId, status: 'ACTIVE' },
    });
    if (existingBooking) {
      throw new ConflictException('Bạn đang có một lượt đặt giữ xe chưa hoàn tất.');
    }

    const activeRental = await this.prisma.rentals.findFirst({
      where: { user_id: actor.userId, status: 'ACTIVE' },
    });
    if (activeRental) {
      throw new ConflictException('Bạn đang trong một chuyến đi, vui lòng trả xe trước khi đặt xe mới.');
    }

    const hubRow = await this.prisma.hubs.findUnique({ where: { id: dto.hubId } });
    if (!hubRow) {
      throw new NotFoundException(`Không tìm thấy trạm Hub ${dto.hubId}`);
    }

    const hubVehicleRows = await this.prisma.vehicles.findMany({
      where: { hub_id: dto.hubId },
    });
    const hubVehicles = hubVehicleRows.map(mapVehicleFromPrisma);

    let chosenId = dto.vehicleId;
    if (dto.fastReserve || !chosenId) {
      const picked = autoAllocateHighestBatteryVehicle(hubVehicles, dto.hubId, dto.vehicleType, 20);
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

    const locked = await this.prisma.vehicles.updateMany({
      where: { id: chosenId, status: 'AVAILABLE' },
      data: { status: 'BOOKED' },
    });
    if (locked.count === 0) {
      throw new ConflictException('Phương tiện vừa có người khác đặt giữ trước. Vui lòng chọn xe khác.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const created = await this.prisma.bookings.create({
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

    const result = mapBookingFromPrisma(created);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Đặt giữ xe ${result.vehicle?.plateNumber || result.vehicleId} tại ${result.hub?.name || dto.hubId} (${result.code})`,
      status: 'SUCCESS',
    });

    return result;
  }

  /**
   * Mục đích: Đặt giữ trước một ô đỗ xe cá nhân tại trạm Hub cho sinh viên.
   * Cách hoạt động: Dọn các đơn quá hạn, kiểm tra thông tin trạm và biển số xe hợp lệ, tính số ô đỗ trống của trạm thông qua computeHubStats, đảm bảo sinh viên chưa có lượt giữ chỗ đỗ xe cá nhân nào đang hiệu lực, cấp phát mã ô đỗ trống, lưu bản ghi giữ chỗ 15 phút và ghi nhật ký hệ thống.
   */
  async createParkingSpaceBooking(
    authorizationHeader: string | undefined,
    dto: CreateParkingBookingDto,
  ): Promise<ParkingBooking> {
    await this.handleBookingExpiration15Min();
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );
    const plate = (dto.vehiclePlate || '').trim().toUpperCase();
    if (!dto.hubId || !plate) {
      throw new BadRequestException('Vui lòng chọn Hub và nhập biển số phương tiện cá nhân.');
    }

    const hubRow = await this.prisma.hubs.findUnique({ where: { id: dto.hubId } });
    if (!hubRow) {
      throw new NotFoundException('Không tìm thấy trạm Hub.');
    }

    const vehRows = await this.prisma.vehicles.findMany({ where: { hub_id: dto.hubId } });
    const cpRows = await this.prisma.charging_points.findMany({ where: { hub_id: dto.hubId } });
    const existingParkingRows = await this.prisma.parking_bookings.findMany({
      where: { status: 'ACTIVE' },
    });

    const mappedParking = existingParkingRows.map(mapParkingBookingFromPrisma);
    const hubStats = computeHubStats(
      mapHubFromPrisma(hubRow),
      vehRows.map(mapVehicleFromPrisma),
      cpRows.map(mapChargingPointFromPrisma),
      mappedParking,
    );

    if ((hubStats.availableDocks ?? 0) <= 0) {
      throw new BadRequestException(`${hubRow.name} hiện đã hết ô đỗ xe trống.`);
    }

    if (existingParkingRows.some((p) => p.user_id === actor.userId)) {
      throw new ConflictException('Bạn đã có một lượt giữ chỗ đỗ xe cá nhân đang hiệu lực.');
    }

    const bayCode = assignParkingBayCode(hubRow.id, mappedParking);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const row = await this.prisma.parking_bookings.create({
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

    const created = mapParkingBookingFromPrisma(row);

    await this.auditService.log({
      category: 'VAN_HANH',
      actorName: actor.user?.name || 'Sinh viên',
      actorId: actor.userId,
      description: `Đặt ô đỗ xe cá nhân ${created.bayCode} cho biển số ${plate} tại ${created.hubName}`,
      status: 'SUCCESS',
    });

    return created;
  }

  /**
   * Mục đích: Lấy thông tin các lượt đặt xe dùng chung và đặt chỗ đỗ xe cá nhân đang hiệu lực cùng lịch sử gần nhất của sinh viên.
   * Cách hoạt động: Dọn các đơn quá hạn trước khi đọc, truy vấn tối đa 10 đơn gần nhất từ mỗi bảng bookings và parking_bookings của người dùng hiện tại rồi lọc ra đơn đang ở trạng thái ACTIVE kèm toàn bộ lịch sử.
   */
  async getActiveBookings(authorizationHeader?: string, userIdQuery?: string) {
    await this.handleBookingExpiration15Min();
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      userIdQuery || 'user-stu-01',
    );

    const bookingRows = await this.prisma.bookings.findMany({
      where: { user_id: actor.userId },
      include: { vehicles: true, hubs: true },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
    const parkingRows = await this.prisma.parking_bookings.findMany({
      where: { user_id: actor.userId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const mappedBookings = bookingRows.map(mapBookingFromPrisma);
    const mappedParking = parkingRows.map(mapParkingBookingFromPrisma);

    return {
      vehicleBooking: mappedBookings.find((b) => b.status === 'ACTIVE') || null,
      parkingBooking: mappedParking.find((p) => p.status === 'ACTIVE') || null,
      historyBookings: mappedBookings,
      historyParkingBookings: mappedParking,
    };
  }

  /**
   * Mục đích: Hủy bỏ một lượt đặt giữ xe dùng chung hoặc lượt giữ chỗ đỗ xe cá nhân đang ở trạng thái hiệu lực.
   * Cách hoạt động: Tìm mã đặt chỗ trong bảng bookings trước; nếu tìm thấy và đang ACTIVE thì đổi sang CANCELLED, trả trạng thái xe về AVAILABLE rồi ghi nhật ký. Nếu không thấy ở bảng bookings thì tìm trong bảng parking_bookings, chuyển trạng thái sang CANCELLED và ghi nhật ký cảnh báo.
   */
  async cancelBooking(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-stu-01');

    const bookingRow = await this.prisma.bookings.findUnique({ where: { id } });
    if (bookingRow) {
      if (bookingRow.status !== 'ACTIVE') {
        throw new BadRequestException('Lượt đặt xe này không còn ở trạng thái hiệu lực để hủy.');
      }

      const updated = await this.prisma.bookings.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { vehicles: true, hubs: true },
      });
      await this.prisma.vehicles.updateMany({
        where: { id: bookingRow.vehicle_id, status: 'BOOKED' },
        data: { status: 'AVAILABLE' },
      });

      const cancelled = mapBookingFromPrisma(updated);

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

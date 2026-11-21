import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { AccountStatus, AuditCategory, UserRole } from '../common/interfaces';
import {
  mapAuditLogFromPrisma,
  mapBookingFromPrisma,
  mapChargingSessionFromPrisma,
  mapParkingBookingFromPrisma,
  mapRentalFromPrisma,
  mapUserFromPrisma,
} from '../common/mappers';
import { comparePassword, hashPassword } from '../common/security/password.util';
import { sanitizeUser } from '../common/security/token.util';
import { formatAuditLogsCsv } from '../common/utils/csv-exporter.util';
import {
  validatePasswordStrength,
  validatePhoneNumber,
} from '../common/validators/account.validator';
import { validateSelfAction } from '../common/validators/admin-action.validator';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Mục đích: Lấy thông tin hồ sơ cá nhân của người dùng đang đăng nhập.
   * Cách hoạt động: Xác định mã người dùng từ phiên đăng nhập hoặc tham số dự phòng, truy vấn thông tin từ bảng users kèm hồ sơ sinh viên hoặc nhân viên vận hành, rồi loại bỏ mật khẩu băm trước khi trả về.
   */
  async getUserProfile(authorizationHeader?: string, userIdQuery?: string) {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      userIdQuery || 'user-stu-01',
    );
    const userRow = await this.prisma.users.findFirst({
      where: { id: actor.userId, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });
    if (!userRow) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }
    return sanitizeUser(mapUserFromPrisma(userRow));
  }

  /**
   * Mục đích: Cập nhật thông tin liên hệ và hồ sơ cá nhân của người dùng đang đăng nhập.
   * Cách hoạt động: Xác định tài khoản hiện tại, kiểm tra định dạng số điện thoại mới nếu có thay đổi, sau đó cập nhật lần lượt bảng users và bảng hồ sơ sinh viên (tên trường) hoặc nhân viên vận hành (phòng ban), cuối cùng ghi nhật ký kiểm toán và trả về hồ sơ mới.
   */
  async updateUserProfile(authorizationHeader: string | undefined, dto: UpdateUserDto) {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );
    const existing = await this.prisma.users.findFirst({
      where: { id: actor.userId, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    if (dto.phone !== undefined && dto.phone.trim() && !validatePhoneNumber(dto.phone)) {
      throw new BadRequestException('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
    }

    let nextName = existing.name;
    if (dto.name && dto.name.trim()) {
      nextName = dto.name.trim();
    }

    let nextPhone = existing.phone;
    if (dto.phone && dto.phone.trim()) {
      nextPhone = dto.phone.trim();
    }

    let nextCitizenId = existing.citizen_id;
    if (dto.citizenId !== undefined) {
      nextCitizenId = dto.citizenId.trim();
    }

    await this.prisma.users.update({
      where: { id: existing.id },
      data: {
        name: nextName,
        phone: nextPhone,
        citizen_id: nextCitizenId,
      },
    });

    if (dto.university !== undefined && existing.student_profiles) {
      await this.prisma.student_profiles.update({
        where: { user_id: existing.id },
        data: { university: dto.university.trim() },
      });
    }

    if (dto.department !== undefined && existing.operator_profiles) {
      await this.prisma.operator_profiles.update({
        where: { user_id: existing.id },
        data: { department: dto.department.trim() },
      });
    }

    const updated = await this.prisma.users.findUniqueOrThrow({
      where: { id: existing.id },
      include: { student_profiles: true, operator_profiles: true },
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: updated.name,
      actorId: updated.id,
      description: 'Cập nhật thông tin hồ sơ cá nhân',
      status: 'SUCCESS',
    });

    return sanitizeUser(mapUserFromPrisma(updated));
  }

  /**
   * Mục đích: Thay đổi mật khẩu đăng nhập cho tài khoản hiện tại.
   * Cách hoạt động: Xác thực tài khoản đang thao tác, đối chiếu mật khẩu hiện tại với chuỗi băm đang lưu qua comparePassword, kiểm tra độ dài mật khẩu mới tối thiểu 6 ký tự, băm mật khẩu mới để cập nhật vào bảng users rồi ghi nhật ký hệ thống.
   */
  async changeUserPassword(authorizationHeader: string | undefined, dto: ChangePasswordDto) {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      dto.userId || 'user-stu-01',
    );
    const userRow = await this.prisma.users.findFirst({
      where: { id: actor.userId, status: { not: 'DELETED' } },
    });
    if (!userRow) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
    }
    const matches = await comparePassword(dto.currentPassword, userRow.password_hash);
    if (!matches) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }
    if (!validatePasswordStrength(dto.newPassword)) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const nextHash = await hashPassword(dto.newPassword);
    await this.prisma.users.update({
      where: { id: userRow.id },
      data: { password_hash: nextHash },
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: userRow.name,
      actorId: userRow.id,
      description: 'Thay đổi mật khẩu đăng nhập cá nhân',
      status: 'SUCCESS',
    });

    return { message: 'Đổi mật khẩu thành công.' };
  }

  /**
   * Mục đích: Lấy danh sách hồ sơ đăng ký làm Nhân viên vận hành để Quản trị viên xem xét phê duyệt.
   * Cách hoạt động: Xác định bộ lọc trạng thái (mặc định là PENDING_APPROVAL hoặc tất cả nếu truyền ALL), truy vấn các tài khoản có vai trò OPERATOR kèm hồ sơ chi tiết sắp xếp mới nhất trước và loại bỏ trường nhạy cảm.
   */
  async listRegistrations(statusFilter?: string) {
    let statusCondition: AccountStatus[] = ['PENDING_APPROVAL'];
    const allowedStatuses: string[] = ['ACTIVE', 'PENDING_APPROVAL', 'LOCKED', 'REJECTED'];

    if (statusFilter === 'ALL') {
      statusCondition = ['PENDING_APPROVAL', 'REJECTED', 'ACTIVE'];
    } else if (statusFilter && allowedStatuses.includes(statusFilter)) {
      statusCondition = [statusFilter as AccountStatus];
    }

    const rows = await this.prisma.users.findMany({
      where: { role: 'OPERATOR', status: { in: statusCondition } },
      include: { student_profiles: true, operator_profiles: true },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((r) => sanitizeUser(mapUserFromPrisma(r)));
  }

  /**
   * Mục đích: Xử lý quyết định phê duyệt hoặc từ chối hồ sơ đăng ký Nhân viên vận hành của Quản trị viên.
   * Cách hoạt động: Kiểm tra quản trị viên không tự thao tác lên chính mình và xác minh hồ sơ đang ở trạng thái PENDING_APPROVAL; nếu decision là true thì kiểm tra không trùng mã nhân viên đang hoạt động, kích hoạt sang ACTIVE và ghi nhật ký thành công; nếu decision là false thì bắt buộc có lý do, chuyển sang REJECTED và ghi nhật ký cảnh báo.
   */
  async processApprovalDecision(
    id: string,
    decision: boolean,
    rejectReason?: string,
    authorizationHeader?: string,
  ) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    validateSelfAction(actor.userId, id);

    if (!decision) {
      const trimmedReason = (rejectReason || '').trim();
      if (!trimmedReason) {
        throw new BadRequestException('Vui lòng nhập lý do từ chối hồ sơ đăng ký.');
      }

      const target = await this.prisma.users.findFirst({
        where: { id, status: { not: 'DELETED' } },
      });
      if (!target) {
        throw new NotFoundException('Không tìm thấy hồ sơ đăng ký.');
      }
      if (target.status !== 'PENDING_APPROVAL') {
        throw new BadRequestException('Hồ sơ này đã được xử lý trước đó.');
      }

      const updated = await this.prisma.users.update({
        where: { id: target.id },
        data: { status: 'REJECTED', reject_reason: trimmedReason },
        include: { student_profiles: true, operator_profiles: true },
      });

      await this.auditService.log({
        category: 'QUAN_TRI',
        actorName: actor.user?.name || 'Quản trị Hệ thống',
        actorId: actor.userId,
        description: `Từ chối hồ sơ Nhân viên vận hành ${updated.name}. Lý do: ${trimmedReason}`,
        status: 'WARNING',
      });

      return {
        message: `Đã từ chối hồ sơ ${updated.name}.`,
        user: sanitizeUser(mapUserFromPrisma(updated)),
      };
    }

    const target = await this.prisma.users.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });
    if (!target) {
      throw new NotFoundException('Không tìm thấy hồ sơ đăng ký.');
    }
    if (target.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Hồ sơ này không còn ở trạng thái chờ phê duyệt.');
    }

    if (target.operator_profiles?.staff_id) {
      const conflict = await this.prisma.operator_profiles.findFirst({
        where: {
          staff_id: target.operator_profiles.staff_id,
          user_id: { not: target.id },
          users: { status: 'ACTIVE' },
        },
        include: { users: true },
      });
      if (conflict) {
        throw new ConflictException(
          `Không thể phê duyệt: Mã nhân viên ${target.operator_profiles.staff_id} trùng với tài khoản đang hoạt động (${conflict.users.name}).`,
        );
      }
    }

    const updated = await this.prisma.users.update({
      where: { id: target.id },
      data: { status: 'ACTIVE', reject_reason: null },
      include: { student_profiles: true, operator_profiles: true },
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: actor.user?.name || 'Quản trị Hệ thống',
      actorId: actor.userId,
      description: `Phê duyệt tài khoản Nhân viên vận hành ${updated.name} (${updated.email})`,
      status: 'SUCCESS',
    });

    return {
      message: `Đã phê duyệt tài khoản ${updated.name}.`,
      user: sanitizeUser(mapUserFromPrisma(updated)),
    };
  }

  /**
   * Mục đích: Truy vấn danh sách tài khoản người dùng toàn hệ thống kèm bộ lọc vai trò, trạng thái và từ khóa tìm kiếm.
   * Cách hoạt động: Xây dựng điều kiện lọc cho bảng users theo trạng thái (mặc định bỏ qua tài khoản DELETED), vai trò và từ khóa khớp với tên, email, số điện thoại, mã sinh viên hoặc mã nhân viên, rồi trả về danh sách người dùng đã ẩn mật khẩu.
   */
  async listAccounts(query: { q?: string; role?: UserRole | 'ALL'; status?: AccountStatus | 'ALL' }) {
    const qNorm = (query.q || '').trim();
    const whereCondition: Prisma.usersWhereInput = {
      status: { not: 'DELETED' },
    };

    if (query.status && query.status !== 'ALL') {
      whereCondition.status = query.status;
    }

    if (query.role && query.role !== 'ALL') {
      whereCondition.role = query.role;
    }

    if (qNorm) {
      whereCondition.OR = [
        { name: { contains: qNorm, mode: 'insensitive' } },
        { email: { contains: qNorm, mode: 'insensitive' } },
        { phone: { contains: qNorm, mode: 'insensitive' } },
        { student_profiles: { student_id: { contains: qNorm, mode: 'insensitive' } } },
        { operator_profiles: { staff_id: { contains: qNorm, mode: 'insensitive' } } },
      ];
    }

    const rows = await this.prisma.users.findMany({
      where: whereCondition,
      include: { student_profiles: true, operator_profiles: true },
      orderBy: { created_at: 'asc' },
    });

    return rows.map((r) => sanitizeUser(mapUserFromPrisma(r)));
  }

  /**
   * Mục đích: Lấy thông tin chi tiết và toàn bộ lịch sử giao dịch của một tài khoản người dùng phục vụ kiểm tra quản trị.
   * Cách hoạt động: Tìm thông tin tài khoản theo id (loại trừ tài khoản đã xóa), sau đó truy vấn lần lượt lịch sử đặt xe dùng chung, chuyến thuê xe, phiên sạc và lượt đặt chỗ đỗ xe cá nhân của người dùng đó rồi tổng hợp lại thành một đối tượng.
   */
  async getAccountHistory(id: string) {
    const userRow = await this.prisma.users.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });
    if (!userRow) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    const bookings = await this.prisma.bookings.findMany({
      where: { user_id: id },
      orderBy: { created_at: 'desc' },
    });
    const rentals = await this.prisma.rentals.findMany({
      where: { user_id: id },
      orderBy: { start_time: 'desc' },
    });
    const chargingSessions = await this.prisma.charging_sessions.findMany({
      where: { user_id: id },
      orderBy: { created_at: 'desc' },
    });
    const parkingBookings = await this.prisma.parking_bookings.findMany({
      where: { user_id: id },
      orderBy: { created_at: 'desc' },
    });

    return {
      user: sanitizeUser(mapUserFromPrisma(userRow)),
      bookings: bookings.map(mapBookingFromPrisma),
      rentals: rentals.map(mapRentalFromPrisma),
      chargingSessions: chargingSessions.map(mapChargingSessionFromPrisma),
      parkingBookings: parkingBookings.map(mapParkingBookingFromPrisma),
    };
  }

  /**
   * Mục đích: Kiểm tra xem người dùng mục tiêu có đang thực hiện chuyến thuê xe hoặc dịch vụ dở dang hay không trước khi xóa tài khoản.
   * Cách hoạt động: Tìm kiếm trong bảng rentals xem có bản ghi nào thuộc về targetUserId đang có trạng thái ACTIVE hay không và trả về kết quả true/false.
   */
  async checkActiveServices(targetUserId: string): Promise<boolean> {
    const activeRental = await this.prisma.rentals.findFirst({
      where: { user_id: targetUserId, status: 'ACTIVE' },
    });
    return Boolean(activeRental);
  }

  /**
   * Mục đích: Khóa tài khoản người dùng vi phạm hoặc cần tạm ngưng truy cập và thu hồi ngay các phiên đăng nhập hiện hành.
   * Cách hoạt động: Kiểm tra quản trị viên không tự khóa chính mình qua validateSelfAction, xác minh tài khoản tồn tại, xóa toàn bộ phiên đăng nhập của người dùng trong bảng auth_sessions, cập nhật trạng thái thành LOCKED kèm lý do rồi ghi nhật ký cảnh báo.
   */
  async lockUserAccount(id: string, reason: string | undefined, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    validateSelfAction(actor.userId, id);

    const target = await this.prisma.users.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });
    if (!target) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    await this.prisma.auth_sessions.deleteMany({ where: { user_id: id } });

    let nextReason = target.reject_reason;
    if (reason && reason.trim()) {
      nextReason = reason.trim();
    }

    const updated = await this.prisma.users.update({
      where: { id },
      data: {
        status: 'LOCKED',
        reject_reason: nextReason,
      },
      include: { student_profiles: true, operator_profiles: true },
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: actor.user?.name || 'Quản trị Hệ thống',
      actorId: actor.userId,
      description: `Khóa tài khoản ${updated.name} (${updated.email})`,
      status: 'WARNING',
    });

    return {
      message: `Đã khóa tài khoản ${updated.name}.`,
      user: sanitizeUser(mapUserFromPrisma(updated)),
    };
  }

  /**
   * Mục đích: Mở khóa lại tài khoản đã bị khóa để người dùng tiếp tục sử dụng hệ thống.
   * Cách hoạt động: Kiểm tra không tự thao tác lên chính mình qua validateSelfAction, xác minh tài khoản tồn tại, khôi phục trạng thái thành ACTIVE, xóa lý do khóa và ghi nhận vào nhật ký kiểm toán.
   */
  async unlockUserAccount(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    validateSelfAction(actor.userId, id);

    const target = await this.prisma.users.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });
    if (!target) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    const updated = await this.prisma.users.update({
      where: { id },
      data: { status: 'ACTIVE', reject_reason: null },
      include: { student_profiles: true, operator_profiles: true },
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: actor.user?.name || 'Quản trị Hệ thống',
      actorId: actor.userId,
      description: `Mở khóa tài khoản ${updated.name} (${updated.email})`,
      status: 'SUCCESS',
    });

    return {
      message: `Đã mở khóa tài khoản ${updated.name}.`,
      user: sanitizeUser(mapUserFromPrisma(updated)),
    };
  }

  /**
   * Mục đích: Xóa mềm một tài khoản người dùng khỏi hệ thống sau khi đảm bảo không còn chuyến đi dở dang.
   * Cách hoạt động: Kiểm tra không tự xóa chính mình, tìm tài khoản chưa bị xóa, gọi checkActiveServices để chắc chắn người dùng không còn chuyến thuê xe ACTIVE, xóa toàn bộ phiên đăng nhập hiện hành, đánh dấu trạng thái thành DELETED và ghi nhật ký kiểm toán.
   */
  async deleteUserAccount(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    validateSelfAction(actor.userId, id);

    const found = await this.prisma.users.findFirst({
      where: { id, status: { not: 'DELETED' } },
    });
    if (!found) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    const hasActiveService = await this.checkActiveServices(id);
    if (hasActiveService) {
      throw new BadRequestException('Không thể xóa tài khoản đang có chuyến đi chưa kết thúc.');
    }

    await this.prisma.auth_sessions.deleteMany({ where: { user_id: id } });
    const target = await this.prisma.users.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: actor.user?.name || 'Quản trị Hệ thống',
      actorId: actor.userId,
      description: `Xóa tài khoản ${target.name} (${target.email}) khỏi hệ thống`,
      status: 'WARNING',
    });

    return { message: `Đã xóa tài khoản ${target.name}.` };
  }

  /**
   * Mục đích: Truy xuất nhật ký kiểm toán hệ thống kèm số liệu thống kê tổng hợp hoặc xuất ra định dạng CSV.
   * Cách hoạt động: Lọc tối đa 250 dòng nhật ký mới nhất theo danh mục và từ khóa tìm kiếm, đồng thời đếm tổng số nhật ký, số cảnh báo bảo mật và số quản trị viên đang có phiên hoạt động; trả về chuỗi CSV nếu query.format là csv hoặc trả về danh sách kèm tóm tắt.
   */
  async listAuditLogs(query: { category?: AuditCategory | 'ALL'; q?: string; format?: string }) {
    const qNorm = (query.q || '').trim();
    const whereCondition: Prisma.audit_logsWhereInput = {};

    if (query.category && query.category !== 'ALL') {
      whereCondition.category = query.category;
    }

    if (qNorm) {
      whereCondition.OR = [
        { actor_name: { contains: qNorm, mode: 'insensitive' } },
        { description: { contains: qNorm, mode: 'insensitive' } },
        { ip_address: { contains: qNorm, mode: 'insensitive' } },
      ];
    }

    const filteredRows = await this.prisma.audit_logs.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      take: 250,
    });
    const totalLogs = await this.prisma.audit_logs.count();
    const securityWarnings = await this.prisma.audit_logs.count({
      where: { status: { in: ['WARNING', 'ERROR'] } },
    });
    const onlineAdmins = await this.prisma.auth_sessions.count({
      where: { role: 'ADMIN', expires_at: { gt: new Date() } },
    });

    const mapped = filteredRows.map(mapAuditLogFromPrisma);
    if (query.format === 'csv') {
      return { csv: formatAuditLogsCsv(mapped), total: mapped.length };
    }

    return {
      logs: mapped,
      summary: {
        totalLogs,
        todayActions: totalLogs,
        securityWarnings,
        onlineAdmins: Math.max(1, onlineAdmins),
      },
    };
  }
}

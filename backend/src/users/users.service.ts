import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { formatAuditLogsCsv } from '../common/audit.helpers';
import { hashPassword, sanitizeUser, verifyPassword } from '../common/id.helpers';
import {
  mapAuditLogFromPrisma,
  mapBookingFromPrisma,
  mapChargingSessionFromPrisma,
  mapParkingBookingFromPrisma,
  mapRentalFromPrisma,
  mapUserFromPrisma,
} from '../common/mappers.helpers';
import { AccountStatus, AuditCategory, UserRole } from '../common/types';
import { ensureNotSelfAction, isValidPasswordStrength, isValidPhone } from '../common/validation.helpers';
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

  async getProfile(authorizationHeader?: string, userIdQuery?: string) {
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

  async updateProfile(authorizationHeader: string | undefined, dto: UpdateUserDto) {
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

    if (dto.phone !== undefined && dto.phone.trim() && !isValidPhone(dto.phone)) {
      throw new BadRequestException('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: existing.id },
        data: {
          name: dto.name?.trim() || existing.name,
          phone: dto.phone?.trim() || existing.phone,
          citizen_id: dto.citizenId !== undefined ? dto.citizenId.trim() : existing.citizen_id,
        },
      });

      if (dto.university !== undefined && existing.student_profiles) {
        await tx.student_profiles.update({
          where: { user_id: existing.id },
          data: { university: dto.university.trim() },
        });
      }

      if (dto.department !== undefined && existing.operator_profiles) {
        await tx.operator_profiles.update({
          where: { user_id: existing.id },
          data: { department: dto.department.trim() },
        });
      }

      return tx.users.findUniqueOrThrow({
        where: { id: existing.id },
        include: { student_profiles: true, operator_profiles: true },
      });
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

  async changePassword(authorizationHeader: string | undefined, dto: ChangePasswordDto) {
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
    const matches = await verifyPassword(dto.currentPassword, userRow.password_hash);
    if (!matches) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }
    if (!isValidPasswordStrength(dto.newPassword)) {
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

  async listRegistrations(statusFilter?: string) {
    let statusCondition: AccountStatus[] = ['PENDING_APPROVAL'];
    if (statusFilter === 'ALL') {
      statusCondition = ['PENDING_APPROVAL', 'REJECTED', 'ACTIVE'];
    } else if (
      statusFilter &&
      (['ACTIVE', 'PENDING_APPROVAL', 'LOCKED', 'REJECTED'] as string[]).includes(statusFilter)
    ) {
      statusCondition = [statusFilter as AccountStatus];
    }

    const rows = await this.prisma.users.findMany({
      where: { role: 'OPERATOR', status: { in: statusCondition } },
      include: { student_profiles: true, operator_profiles: true },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((r) => sanitizeUser(mapUserFromPrisma(r)));
  }

  async approveRegistration(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    ensureNotSelfAction(actor.userId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const target = await tx.users.findFirst({
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
        const conflict = await tx.operator_profiles.findFirst({
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

      return tx.users.update({
        where: { id: target.id },
        data: { status: 'ACTIVE', reject_reason: null },
        include: { student_profiles: true, operator_profiles: true },
      });
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: actor.user?.name || 'Quản trị Hệ thống',
      actorId: actor.userId,
      description: `Phê duyệt tài khoản Điều phối viên ${updated.name} (${updated.email})`,
      status: 'SUCCESS',
    });

    return { message: `Đã phê duyệt tài khoản ${updated.name}.`, user: sanitizeUser(mapUserFromPrisma(updated)) };
  }

  async rejectRegistration(id: string, reason: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    ensureNotSelfAction(actor.userId, id);

    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối hồ sơ đăng ký.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const target = await tx.users.findFirst({ where: { id, status: { not: 'DELETED' } } });
      if (!target) {
        throw new NotFoundException('Không tìm thấy hồ sơ đăng ký.');
      }
      if (target.status !== 'PENDING_APPROVAL') {
        throw new BadRequestException('Hồ sơ này đã được xử lý trước đó.');
      }

      return tx.users.update({
        where: { id: target.id },
        data: { status: 'REJECTED', reject_reason: trimmedReason },
        include: { student_profiles: true, operator_profiles: true },
      });
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: actor.user?.name || 'Quản trị Hệ thống',
      actorId: actor.userId,
      description: `Từ chối hồ sơ Điều phối viên ${updated.name}. Lý do: ${trimmedReason}`,
      status: 'WARNING',
    });

    return { message: `Đã từ chối hồ sơ ${updated.name}.`, user: sanitizeUser(mapUserFromPrisma(updated)) };
  }

  async listAccounts(query: { q?: string; role?: UserRole | 'ALL'; status?: AccountStatus | 'ALL' }) {
    const qNorm = (query.q || '').trim();

    const rows = await this.prisma.users.findMany({
      where: {
        status: query.status && query.status !== 'ALL' ? query.status : { not: 'DELETED' },
        ...(query.role && query.role !== 'ALL' ? { role: query.role } : {}),
        ...(qNorm
          ? {
              OR: [
                { name: { contains: qNorm, mode: 'insensitive' } },
                { email: { contains: qNorm, mode: 'insensitive' } },
                { phone: { contains: qNorm, mode: 'insensitive' } },
                { student_profiles: { student_id: { contains: qNorm, mode: 'insensitive' } } },
                { operator_profiles: { staff_id: { contains: qNorm, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { student_profiles: true, operator_profiles: true },
      orderBy: { created_at: 'asc' },
    });

    return rows.map((r) => sanitizeUser(mapUserFromPrisma(r)));
  }

  async getAccountHistory(id: string) {
    const userRow = await this.prisma.users.findFirst({
      where: { id, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });
    if (!userRow) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    const [bookings, rentals, chargingSessions, parkingBookings] = await Promise.all([
      this.prisma.bookings.findMany({ where: { user_id: id }, orderBy: { created_at: 'desc' } }),
      this.prisma.rentals.findMany({ where: { user_id: id }, orderBy: { start_time: 'desc' } }),
      this.prisma.charging_sessions.findMany({ where: { user_id: id }, orderBy: { created_at: 'desc' } }),
      this.prisma.parking_bookings.findMany({ where: { user_id: id }, orderBy: { created_at: 'desc' } }),
    ]);

    return {
      user: sanitizeUser(mapUserFromPrisma(userRow)),
      bookings: bookings.map(mapBookingFromPrisma),
      rentals: rentals.map(mapRentalFromPrisma),
      chargingSessions: chargingSessions.map(mapChargingSessionFromPrisma),
      parkingBookings: parkingBookings.map(mapParkingBookingFromPrisma),
    };
  }

  async lockAccount(id: string, reason: string | undefined, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    ensureNotSelfAction(actor.userId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const target = await tx.users.findFirst({ where: { id, status: { not: 'DELETED' } } });
      if (!target) {
        throw new NotFoundException('Không tìm thấy tài khoản.');
      }

      await tx.auth_sessions.deleteMany({ where: { user_id: id } });
      return tx.users.update({
        where: { id },
        data: {
          status: 'LOCKED',
          reject_reason: reason?.trim() ? reason.trim() : target.reject_reason,
        },
        include: { student_profiles: true, operator_profiles: true },
      });
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: actor.user?.name || 'Quản trị Hệ thống',
      actorId: actor.userId,
      description: `Khóa tài khoản ${updated.name} (${updated.email})`,
      status: 'WARNING',
    });

    return { message: `Đã khóa tài khoản ${updated.name}.`, user: sanitizeUser(mapUserFromPrisma(updated)) };
  }

  async unlockAccount(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    ensureNotSelfAction(actor.userId, id);

    const target = await this.prisma.users.findFirst({ where: { id, status: { not: 'DELETED' } } });
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

    return { message: `Đã mở khóa tài khoản ${updated.name}.`, user: sanitizeUser(mapUserFromPrisma(updated)) };
  }

  async deleteAccount(id: string, authorizationHeader?: string) {
    const actor = await this.authService.resolveSession(authorizationHeader, false, 'user-admin-01');
    ensureNotSelfAction(actor.userId, id);

    const target = await this.prisma.$transaction(async (tx) => {
      const found = await tx.users.findFirst({ where: { id, status: { not: 'DELETED' } } });
      if (!found) {
        throw new NotFoundException('Không tìm thấy tài khoản.');
      }

      const activeRental = await tx.rentals.findFirst({
        where: { user_id: id, status: 'ACTIVE' },
      });
      if (activeRental) {
        throw new BadRequestException('Không thể xóa tài khoản đang có chuyến đi chưa kết thúc.');
      }

      await tx.auth_sessions.deleteMany({ where: { user_id: id } });
      return tx.users.update({
        where: { id },
        data: { status: 'DELETED' },
      });
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

  async listAuditLogs(query: { category?: AuditCategory | 'ALL'; q?: string; format?: string }) {
    const qNorm = (query.q || '').trim();

    const [filteredRows, totalLogs, securityWarnings, onlineAdmins] = await Promise.all([
      this.prisma.audit_logs.findMany({
        where: {
          ...(query.category && query.category !== 'ALL' ? { category: query.category } : {}),
          ...(qNorm
            ? {
                OR: [
                  { actor_name: { contains: qNorm, mode: 'insensitive' } },
                  { description: { contains: qNorm, mode: 'insensitive' } },
                  { ip_address: { contains: qNorm, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { timestamp: 'desc' },
        take: 250,
      }),
      this.prisma.audit_logs.count(),
      this.prisma.audit_logs.count({ where: { status: { in: ['WARNING', 'ERROR'] } } }),
      this.prisma.auth_sessions.count({
        where: { role: 'ADMIN', expires_at: { gt: new Date() } },
      }),
    ]);

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

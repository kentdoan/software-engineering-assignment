import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { extractBearerToken, generateId, hashPassword, sanitizeUser, verifyPassword } from '../common/id.helpers';
import { mapUserFromPrisma } from '../common/mappers.helpers';
import { User, UserRole } from '../common/types';
import { isValidEmail, isValidPasswordStrength, isValidPhone } from '../common/validation.helpers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthDto, LoginDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto) {
    const email = (dto.email || '').trim().toLowerCase();
    const password = dto.password || '';

    if (!email || !password) {
      throw new BadRequestException('Vui lòng nhập đầy đủ email và mật khẩu.');
    }

    const userRow = await this.prisma.users.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });

    const passwordValid = userRow ? await verifyPassword(password, userRow.password_hash) : false;
    if (!userRow || !passwordValid) {
      await this.auditService.log({
        category: 'QUAN_TRI',
        actorName: email || 'Khách',
        actorId: 'anonymous',
        description: `Đăng nhập thất bại cho tài khoản ${email}`,
        status: 'WARNING',
      });
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    if (userRow.status === 'PENDING_APPROVAL') {
      throw new ForbiddenException('Tài khoản Điều phối viên đang chờ Quản trị viên phê duyệt.');
    }
    if (userRow.status === 'REJECTED') {
      throw new ForbiddenException(
        `Đăng ký đã bị từ chối${userRow.reject_reason ? `: ${userRow.reject_reason}` : '.'}`,
      );
    }
    if (userRow.status === 'LOCKED') {
      throw new ForbiddenException('Tài khoản hiện đang bị khóa. Vui lòng liên hệ Quản trị viên.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const jti = generateId('jti');

    await this.prisma.$transaction(async (tx) => {
      await tx.auth_sessions.deleteMany({ where: { expires_at: { lte: now } } });
      await tx.auth_sessions.create({
        data: {
          jti,
          user_id: userRow.id,
          role: userRow.role,
          created_at: now,
          expires_at: expiresAt,
        },
      });
    });

    const token = await this.jwtService.signAsync({
      sub: userRow.id,
      jti,
      role: userRow.role,
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: userRow.name,
      actorId: userRow.id,
      description: `Đăng nhập hệ thống với vai trò ${userRow.role}`,
      status: 'SUCCESS',
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: sanitizeUser(mapUserFromPrisma(userRow)),
    };
  }

  async register(dto: CreateAuthDto) {
    const name = (dto.name || '').trim();
    const email = (dto.email || '').trim().toLowerCase();
    const password = dto.password || '';
    const phone = (dto.phone || '').trim();
    const requestedRole: UserRole = dto.role === 'OPERATOR' ? 'OPERATOR' : 'STUDENT';

    if (!name || !email || !password || !phone) {
      throw new BadRequestException('Vui lòng điền đầy đủ họ tên, email, số điện thoại và mật khẩu.');
    }
    if (!isValidEmail(email)) {
      throw new BadRequestException('Định dạng email không hợp lệ.');
    }
    if (!isValidPhone(phone)) {
      throw new BadRequestException('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
    }
    if (!isValidPasswordStrength(password)) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const duplicateEmail = await this.prisma.users.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, status: { not: 'DELETED' } },
    });
    if (duplicateEmail) {
      throw new ConflictException('Email này đã được đăng ký trong hệ thống.');
    }

    if (requestedRole === 'STUDENT' && dto.studentId?.trim()) {
      const sid = dto.studentId.trim();
      const duplicateStudent = await this.prisma.student_profiles.findFirst({
        where: { student_id: sid, users: { status: { not: 'DELETED' } } },
      });
      if (duplicateStudent) {
        throw new ConflictException('Mã số sinh viên này đã tồn tại trong hệ thống.');
      }
    }

    if (requestedRole === 'OPERATOR') {
      if (!dto.staffId?.trim()) {
        throw new BadRequestException('Điều phối viên cần cung cấp Mã nhân viên công tác.');
      }
      const duplicateActiveStaff = await this.prisma.operator_profiles.findFirst({
        where: { staff_id: dto.staffId.trim(), users: { status: 'ACTIVE' } },
      });
      if (duplicateActiveStaff) {
        throw new ConflictException('Mã nhân viên này đã được cấp cho tài khoản khác.');
      }
    }

    const pwHash = await hashPassword(password);
    const userId = generateId(requestedRole === 'OPERATOR' ? 'user-ops' : 'user-stu');

    const createdRow = await this.prisma.$transaction(async (tx) => {
      return tx.users.create({
        data: {
          id: userId,
          name,
          email,
          password_hash: pwHash,
          phone,
          role: requestedRole,
          status: requestedRole === 'OPERATOR' ? 'PENDING_APPROVAL' : 'ACTIVE',
          citizen_id: dto.citizenId?.trim() || null,
          ...(requestedRole === 'STUDENT'
            ? {
                student_profiles: {
                  create: {
                    id: generateId('sp'),
                    student_id: dto.studentId?.trim() || '',
                    university: dto.university?.trim() || 'ĐHQG-HCM',
                    balance: 100000,
                    unpaid_fee: 0,
                  },
                },
              }
            : {
                operator_profiles: {
                  create: {
                    id: generateId('op'),
                    staff_id: dto.staffId!.trim(),
                    department: dto.department?.trim() || 'Vận hành Hub',
                  },
                },
              }),
        },
        include: { student_profiles: true, operator_profiles: true },
      });
    });

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: createdRow.name,
      actorId: createdRow.id,
      description:
        requestedRole === 'OPERATOR'
          ? `Gửi hồ sơ đăng ký Điều phối viên (${createdRow.email}) chờ phê duyệt`
          : `Đăng ký tài khoản Sinh viên mới (${createdRow.email})`,
      status: 'SUCCESS',
    });

    return {
      message:
        requestedRole === 'OPERATOR'
          ? 'Đăng ký thành công. Tài khoản Điều phối viên đang chờ Quản trị viên phê duyệt.'
          : 'Đăng ký tài khoản Sinh viên thành công. Bạn có thể đăng nhập ngay.',
      user: sanitizeUser(mapUserFromPrisma(createdRow)),
    };
  }

  async logout(authorizationHeader?: string) {
    const token = extractBearerToken(authorizationHeader);
    let actorUser: User | null = null;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<{ jti: string; sub: string }>(token);
        const userRow = await this.prisma.users.findFirst({
          where: { id: payload.sub, status: { not: 'DELETED' } },
          include: { student_profiles: true, operator_profiles: true },
        });
        if (userRow) {
          actorUser = mapUserFromPrisma(userRow);
        }
        await this.prisma.auth_sessions.deleteMany({ where: { jti: payload.jti } });
      } catch {
        // Token already expired or invalid
      }
    }

    if (actorUser) {
      await this.auditService.log({
        category: 'QUAN_TRI',
        actorName: actorUser.name,
        actorId: actorUser.id,
        description: 'Đăng xuất khỏi hệ thống an toàn',
        status: 'SUCCESS',
      });
    }

    return { message: 'Đăng xuất thành công.' };
  }

  async resolveSession(
    authorizationHeader?: string,
    required = false,
    fallbackUserId = 'user-stu-01',
  ): Promise<{ userId: string; user: User | null }> {
    const token = extractBearerToken(authorizationHeader);
    if (!token) {
      if (required) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      }
      const fallback = await this.prisma.users.findFirst({
        where: { id: fallbackUserId, status: { not: 'DELETED' } },
        include: { student_profiles: true, operator_profiles: true },
      });
      return {
        userId: fallback?.id || fallbackUserId,
        user: fallback ? mapUserFromPrisma(fallback) : null,
      };
    }

    let payload: { jti: string; sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ jti: string; sub: string }>(token);
    } catch {
      if (required) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      const fallback = await this.prisma.users.findFirst({
        where: { id: fallbackUserId, status: { not: 'DELETED' } },
        include: { student_profiles: true, operator_profiles: true },
      });
      return {
        userId: fallback?.id || fallbackUserId,
        user: fallback ? mapUserFromPrisma(fallback) : null,
      };
    }

    const session = await this.prisma.auth_sessions.findUnique({
      where: { jti: payload.jti },
      include: {
        users: {
          include: { student_profiles: true, operator_profiles: true },
        },
      },
    });

    if (
      !session ||
      session.expires_at.getTime() <= Date.now() ||
      session.users.status === 'DELETED' ||
      session.users.status === 'LOCKED'
    ) {
      if (required) {
        throw new UnauthorizedException('Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.');
      }
      const fallback = await this.prisma.users.findFirst({
        where: { id: fallbackUserId, status: { not: 'DELETED' } },
        include: { student_profiles: true, operator_profiles: true },
      });
      return {
        userId: fallback?.id || fallbackUserId,
        user: fallback ? mapUserFromPrisma(fallback) : null,
      };
    }

    return {
      userId: session.users.id,
      user: mapUserFromPrisma(session.users),
    };
  }

  async me(authorizationHeader?: string) {
    const resolved = await this.resolveSession(authorizationHeader, true);
    return { user: sanitizeUser(resolved.user!) };
  }
}

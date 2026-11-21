import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { AccountStatus, User, UserRole } from '../common/interfaces';
import { mapUserFromPrisma } from '../common/mappers';
import { comparePassword, hashPassword } from '../common/security/password.util';
import { extractBearerToken, sanitizeUser } from '../common/security/token.util';
import { generateId } from '../common/utils/id-generator.util';
import {
  isValidEmail,
  validatePasswordStrength,
  validatePhoneNumber,
} from '../common/validators/account.validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthDto, LoginDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Mục đích: Kiểm tra thông tin email, mật khẩu và trạng thái hoạt động của tài khoản trước khi cấp phiên đăng nhập.
   * Cách hoạt động: Chuẩn hóa email, truy vấn người dùng chưa bị xóa kèm hồ sơ sinh viên/nhân viên vận hành, đối chiếu mật khẩu băm qua comparePassword (ghi nhật ký cảnh báo nếu sai), rồi kiểm tra và từ chối nếu tài khoản đang chờ duyệt, bị từ chối hoặc bị khóa.
   */
  async validateCredentials(email: string, plainPass: string) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const password = plainPass || '';

    if (!normalizedEmail || !password) {
      throw new BadRequestException('Vui lòng nhập đầy đủ email và mật khẩu.');
    }

    const userRow = await this.prisma.users.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' }, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });

    let passwordValid = false;
    if (userRow) {
      passwordValid = await comparePassword(password, userRow.password_hash);
    }

    if (!userRow || !passwordValid) {
      await this.auditService.log({
        category: 'QUAN_TRI',
        actorName: normalizedEmail || 'Khách',
        actorId: 'anonymous',
        description: `Đăng nhập thất bại cho tài khoản ${normalizedEmail}`,
        status: 'WARNING',
      });
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    if (userRow.status === 'PENDING_APPROVAL') {
      throw new ForbiddenException('Tài khoản Nhân viên vận hành đang chờ Quản trị viên phê duyệt.');
    }
    if (userRow.status === 'REJECTED') {
      let rejectMessage = 'Đăng ký đã bị từ chối.';
      if (userRow.reject_reason) {
        rejectMessage = `Đăng ký đã bị từ chối: ${userRow.reject_reason}`;
      }
      throw new ForbiddenException(rejectMessage);
    }
    if (userRow.status === 'LOCKED') {
      throw new ForbiddenException('Tài khoản hiện đang bị khóa. Vui lòng liên hệ Quản trị viên.');
    }

    return userRow;
  }

  /**
   * Mục đích: Khởi tạo phiên làm việc trong cơ sở dữ liệu và ký chuỗi JWT cho người dùng đã xác thực.
   * Cách hoạt động: Xóa các phiên đã quá hạn khỏi bảng auth_sessions, tạo bản ghi phiên mới có thời hạn 24 giờ gắn mã jti duy nhất và ký token JWT chứa thông tin định danh cùng vai trò người dùng.
   */
  async generateJwtTokens(userId: string, role: UserRole) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const jti = generateId('jti');

    await this.prisma.auth_sessions.deleteMany({
      where: { expires_at: { lte: now } },
    });
    await this.prisma.auth_sessions.create({
      data: {
        jti,
        user_id: userId,
        role,
        created_at: now,
        expires_at: expiresAt,
      },
    });

    const token = await this.jwtService.signAsync({
      sub: userId,
      jti,
      role,
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Mục đích: Xử lý toàn bộ quy trình đăng nhập hệ thống từ kiểm tra thông tin đến cấp phát token và ghi nhật ký.
   * Cách hoạt động: Gọi validateCredentials để xác thực tài khoản và trạng thái, gọi generateJwtTokens để tạo JWT và lưu phiên đăng nhập, ghi nhận sự kiện vào nhật ký hệ thống rồi trả về token kèm thông tin người dùng đã làm sạch.
   */
  async login(dto: LoginDto) {
    const userRow = await this.validateCredentials(dto.email, dto.password);
    const { token, expiresAt } = await this.generateJwtTokens(userRow.id, userRow.role);

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: userRow.name,
      actorId: userRow.id,
      description: `Đăng nhập hệ thống với vai trò ${userRow.role}`,
      status: 'SUCCESS',
    });

    return {
      token,
      expiresAt,
      user: sanitizeUser(mapUserFromPrisma(userRow)),
    };
  }

  /**
   * Mục đích: Đăng ký tài khoản mới cho Sinh viên hoặc Nhân viên vận hành.
   * Cách hoạt động: Kiểm tra tính hợp lệ của họ tên, email, số điện thoại, độ mạnh mật khẩu và kiểm tra trùng lặp email, mã sinh viên hoặc mã nhân viên; sau đó băm mật khẩu, tạo bản ghi trong bảng users kèm hồ sơ tương ứng (Sinh viên có trạng thái ACTIVE, Nhân viên vận hành ở trạng thái PENDING_APPROVAL chờ duyệt) rồi ghi nhật ký hệ thống.
   */
  async registerUser(dto: CreateAuthDto) {
    const name = (dto.name || '').trim();
    const email = (dto.email || '').trim().toLowerCase();
    const password = dto.password || '';
    const phone = (dto.phone || '').trim();

    let requestedRole: UserRole = 'STUDENT';
    if (dto.role === 'OPERATOR') {
      requestedRole = 'OPERATOR';
    }

    if (!name || !email || !password || !phone) {
      throw new BadRequestException('Vui lòng điền đầy đủ họ tên, email, số điện thoại và mật khẩu.');
    }
    if (!isValidEmail(email)) {
      throw new BadRequestException('Định dạng email không hợp lệ.');
    }
    if (!validatePhoneNumber(phone)) {
      throw new BadRequestException('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
    }
    if (!validatePasswordStrength(password)) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const duplicateEmail = await this.prisma.users.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, status: { not: 'DELETED' } },
    });
    if (duplicateEmail) {
      throw new ConflictException('Email này đã được đăng ký trong hệ thống.');
    }

    if (requestedRole === 'STUDENT' && dto.studentId && dto.studentId.trim()) {
      const sid = dto.studentId.trim();
      const duplicateStudent = await this.prisma.student_profiles.findFirst({
        where: { student_id: sid, users: { status: { not: 'DELETED' } } },
      });
      if (duplicateStudent) {
        throw new ConflictException('Mã số sinh viên này đã tồn tại trong hệ thống.');
      }
    }

    if (requestedRole === 'OPERATOR') {
      if (!dto.staffId || !dto.staffId.trim()) {
        throw new BadRequestException('Nhân viên vận hành cần cung cấp Mã nhân viên công tác.');
      }
      const duplicateActiveStaff = await this.prisma.operator_profiles.findFirst({
        where: { staff_id: dto.staffId.trim(), users: { status: 'ACTIVE' } },
      });
      if (duplicateActiveStaff) {
        throw new ConflictException('Mã nhân viên này đã được cấp cho tài khoản khác.');
      }
    }

    const pwHash = await hashPassword(password);
    let userIdPrefix = 'user-stu';
    let initialStatus: AccountStatus = 'ACTIVE';
    if (requestedRole === 'OPERATOR') {
      userIdPrefix = 'user-ops';
      initialStatus = 'PENDING_APPROVAL';
    }
    const userId = generateId(userIdPrefix);

    await this.prisma.users.create({
      data: {
        id: userId,
        name,
        email,
        password_hash: pwHash,
        phone,
        role: requestedRole,
        status: initialStatus,
        citizen_id: dto.citizenId ? dto.citizenId.trim() : null,
      },
    });

    if (requestedRole === 'STUDENT') {
      await this.prisma.student_profiles.create({
        data: {
          id: generateId('sp'),
          user_id: userId,
          student_id: dto.studentId ? dto.studentId.trim() : '',
          university: dto.university ? dto.university.trim() : 'ĐHQG-HCM',
          balance: 100000,
          unpaid_fee: 0,
        },
      });
    } else {
      await this.prisma.operator_profiles.create({
        data: {
          id: generateId('op'),
          user_id: userId,
          staff_id: dto.staffId!.trim(),
          department: dto.department ? dto.department.trim() : 'Vận hành Hub',
        },
      });
    }

    const createdRow = await this.prisma.users.findUniqueOrThrow({
      where: { id: userId },
      include: { student_profiles: true, operator_profiles: true },
    });

    let auditDescription = `Đăng ký tài khoản Sinh viên mới (${createdRow.email})`;
    let responseMessage = 'Đăng ký tài khoản Sinh viên thành công. Bạn có thể đăng nhập ngay.';
    if (requestedRole === 'OPERATOR') {
      auditDescription = `Gửi hồ sơ đăng ký Nhân viên vận hành (${createdRow.email}) chờ phê duyệt`;
      responseMessage = 'Đăng ký thành công. Tài khoản Nhân viên vận hành đang chờ Quản trị viên phê duyệt.';
    }

    await this.auditService.log({
      category: 'QUAN_TRI',
      actorName: createdRow.name,
      actorId: createdRow.id,
      description: auditDescription,
      status: 'SUCCESS',
    });

    return {
      message: responseMessage,
      user: sanitizeUser(mapUserFromPrisma(createdRow)),
    };
  }

  /**
   * Mục đích: Đăng xuất tài khoản và thu hồi phiên đăng nhập hiện tại để token cũ không thể tái sử dụng.
   * Cách hoạt động: Tách token từ header Authorization, giải mã JWT để lấy mã phiên jti và mã người dùng, xóa phiên tương ứng khỏi bảng auth_sessions rồi ghi nhật ký đăng xuất nếu xác định được người dùng.
   */
  async revokeSession(authorizationHeader?: string) {
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
        actorUser = null;
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

  /**
   * Mục đích: Truy xuất thông tin người dùng dự phòng khi yêu cầu không gửi kèm token ở các API cho phép chế độ mặc định.
   * Cách hoạt động: Tìm bản ghi người dùng theo fallbackUserId trong bảng users (bỏ qua tài khoản đã xóa) và trả về mã người dùng cùng đối tượng User đã chuyển đổi.
   */
  private async resolveFallbackUser(
    fallbackUserId: string,
  ): Promise<{ userId: string; user: User | null }> {
    const fallback = await this.prisma.users.findFirst({
      where: { id: fallbackUserId, status: { not: 'DELETED' } },
      include: { student_profiles: true, operator_profiles: true },
    });
    return {
      userId: fallback?.id || fallbackUserId,
      user: fallback ? mapUserFromPrisma(fallback) : null,
    };
  }

  /**
   * Mục đích: Xác định người dùng hiện đang thực hiện yêu cầu dựa trên JWT trong header hoặc tài khoản dự phòng.
   * Cách hoạt động: Tách và xác thực chữ ký JWT từ header Authorization, kiểm tra phiên làm việc trong bảng auth_sessions còn hạn và tài khoản không bị khóa/xóa; nếu thiếu hoặc lỗi token thì ném lỗi UnauthorizedException khi bắt buộc đăng nhập, hoặc trả về người dùng dự phòng khi không bắt buộc.
   */
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
      return this.resolveFallbackUser(fallbackUserId);
    }

    let payload: { jti: string; sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ jti: string; sub: string }>(token);
    } catch {
      if (required) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      return this.resolveFallbackUser(fallbackUserId);
    }

    const session = await this.prisma.auth_sessions.findUnique({
      where: { jti: payload.jti },
      include: {
        users: {
          include: { student_profiles: true, operator_profiles: true },
        },
      },
    });

    const isSessionInvalid =
      !session ||
      session.expires_at.getTime() <= Date.now() ||
      session.users.status === 'DELETED' ||
      session.users.status === 'LOCKED';

    if (isSessionInvalid) {
      if (required) {
        throw new UnauthorizedException('Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.');
      }
      return this.resolveFallbackUser(fallbackUserId);
    }

    return {
      userId: session.users.id,
      user: mapUserFromPrisma(session.users),
    };
  }

  /**
   * Mục đích: Trả về thông tin tài khoản hiện đang đăng nhập dựa trên token xác thực hợp lệ.
   * Cách hoạt động: Gọi hàm resolveSession với cờ bắt buộc xác thực là true, sau đó loại bỏ thông tin nhạy cảm bằng sanitizeUser trước khi trả về.
   */
  async me(authorizationHeader?: string) {
    const resolved = await this.resolveSession(authorizationHeader, true);
    return { user: sanitizeUser(resolved.user!) };
  }
}

import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResetService {
  private readonly logger = new Logger(ResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Mục đích: Khôi phục toàn bộ cơ sở dữ liệu PostgreSQL về trạng thái dữ liệu mẫu ban đầu và chỉ cho phép Quản trị viên thực hiện.
   * Cách hoạt động: Xác thực phiên người dùng từ header Authorization, kiểm tra vai trò phải là ADMIN (ném lỗi ForbiddenException nếu là Sinh viên hoặc Nhân viên vận hành), sau đó đọc các câu lệnh INSERT từ tệp 02_seed.sql, xóa trắng toàn bộ bảng bằng TRUNCATE và chạy tuần tự từng câu lệnh INSERT để nạp lại dữ liệu gốc.
   */
  async resetDatabase(
    authorizationHeader?: string,
  ): Promise<{ success: boolean; message: string }> {
    const actor = await this.authService.resolveSession(
      authorizationHeader,
      false,
      'user-admin-01',
    );
    if (actor.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Quản trị viên mới có quyền khôi phục dữ liệu hệ thống.');
    }

    const candidates: string[] = [];
    if (process.env.SEED_SQL_PATH) {
      candidates.push(process.env.SEED_SQL_PATH);
    }
    candidates.push(
      '/app/database/init/02_seed.sql',
      path.resolve(process.cwd(), 'database/init/02_seed.sql'),
      path.resolve(process.cwd(), '../database/init/02_seed.sql'),
      path.resolve(__dirname, '../../../database/init/02_seed.sql'),
    );

    const seedPath = candidates.find((p) => fs.existsSync(p));
    if (!seedPath) {
      throw new InternalServerErrorException('Không tìm thấy tệp dữ liệu mẫu database/init/02_seed.sql.');
    }

    const rawSql = await fs.promises.readFile(seedPath, 'utf8');
    const statements = rawSql
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('INSERT '));

    await this.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE auth_sessions, dispatch_order_items, dispatch_orders, incidents, charging_sessions, rentals, parking_bookings, bookings, charging_points, private_vehicles, vehicles, scenarios, operator_profiles, student_profiles, users, hubs, audit_logs RESTART IDENTITY CASCADE;',
    );

    for (const stmt of statements) {
      await this.prisma.$executeRawUnsafe(stmt);
    }

    this.logger.log(`Reset PostgreSQL completed (${statements.length} rows inserted from ${seedPath})`);
    return {
      success: true,
      message: 'Data reset to initial snapshot successfully',
    };
  }
}

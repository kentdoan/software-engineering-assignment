import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResetService {
  private readonly logger = new Logger(ResetService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const candidates = [
      process.env.SEED_SQL_PATH,
      '/app/database/init/02_seed.sql',
      path.resolve(process.cwd(), 'database/init/02_seed.sql'),
      path.resolve(process.cwd(), '../database/init/02_seed.sql'),
      path.resolve(__dirname, '../../../database/init/02_seed.sql'),
    ].filter((p): p is string => Boolean(p));

    const seedPath = candidates.find((p) => fs.existsSync(p));
    if (!seedPath) {
      throw new InternalServerErrorException('Không tìm thấy tệp dữ liệu mẫu database/init/02_seed.sql.');
    }

    const rawSql = await fs.promises.readFile(seedPath, 'utf8');
    const statements = rawSql
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('INSERT '));

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'TRUNCATE TABLE auth_sessions, dispatch_order_items, dispatch_orders, incidents, charging_sessions, rentals, parking_bookings, bookings, charging_points, private_vehicles, vehicles, scenarios, operator_profiles, student_profiles, users, hubs, audit_logs RESTART IDENTITY CASCADE;',
      );
      for (const stmt of statements) {
        await tx.$executeRawUnsafe(stmt);
      }
    }, { timeout: 60_000, maxWait: 10_000 });

    this.logger.log(`Reset PostgreSQL completed (${statements.length} rows inserted from ${seedPath})`);
    return {
      success: true,
      message: 'Data reset to initial snapshot successfully',
    };
  }
}

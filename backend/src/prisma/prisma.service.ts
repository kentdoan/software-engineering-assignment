import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://semh_user:semh_password@localhost:5432/smart_emobility?schema=public';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  /**
   * Mục đích: Thiết lập kết nối tới cơ sở dữ liệu PostgreSQL ngay khi module Prisma được khởi tạo.
   * Cách hoạt động: Gọi phương thức $connect của PrismaClient để mở kết nối thông qua Pool đã cấu hình.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Mục đích: Đóng kết nối cơ sở dữ liệu và giải phóng hồ kết nối PostgreSQL khi ứng dụng dừng hoạt động.
   * Cách hoạt động: Ngắt kết nối PrismaClient bằng $disconnect rồi đóng toàn bộ kết nối trong Pool.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}

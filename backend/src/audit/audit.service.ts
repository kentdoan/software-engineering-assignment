import { Injectable } from '@nestjs/common';
import { AuditCategory, AuditLogEntry } from '../common/interfaces';
import { mapAuditLogFromPrisma } from '../common/mappers';
import { generateId } from '../common/utils/id-generator.util';
import { PrismaService } from '../prisma/prisma.service';

export interface AppendAuditInput {
  category: AuditCategory;
  actorName: string;
  actorId: string;
  description: string;
  ipAddress?: string;
  status?: 'SUCCESS' | 'WARNING' | 'ERROR';
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mục đích: Ghi nhận một dòng nhật ký kiểm toán mới cho mọi hành động quan trọng trong hệ thống.
   * Cách hoạt động: Sinh mã nhật ký duy nhất, điền địa chỉ IP mặc định và trạng thái SUCCESS nếu chưa được truyền vào, lưu bản ghi vào bảng audit_logs rồi trả về đối tượng AuditLogEntry đã chuẩn hóa.
   */
  async log(input: AppendAuditInput): Promise<AuditLogEntry> {
    const created = await this.prisma.audit_logs.create({
      data: {
        id: generateId('log'),
        category: input.category,
        actor_name: input.actorName,
        actor_id: input.actorId,
        description: input.description,
        ip_address: input.ipAddress || '127.0.0.1',
        status: input.status || 'SUCCESS',
      },
    });
    return mapAuditLogFromPrisma(created);
  }
}

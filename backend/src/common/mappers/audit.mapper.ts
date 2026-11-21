import { AuditLogEntry } from '../interfaces';

/**
 * Mục đích: Chuyển đổi bản ghi nhật ký kiểm toán từ Prisma sang đối tượng AuditLogEntry chuẩn.
 * Cách hoạt động: Chuyển mốc thời gian sang chuỗi ISO và ánh xạ danh mục, tác nhân thực hiện, mô tả hành động, địa chỉ IP và trạng thái kết quả sang camelCase.
 */
export function mapAuditLogFromPrisma(row: {
  id: string;
  timestamp: Date;
  category: AuditLogEntry['category'];
  actor_name: string;
  actor_id: string;
  description: string;
  ip_address: string;
  status: AuditLogEntry['status'];
}): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    category: row.category,
    actorName: row.actor_name,
    actorId: row.actor_id,
    description: row.description,
    ipAddress: row.ip_address,
    status: row.status,
  };
}

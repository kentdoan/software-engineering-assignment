import { AuditLogEntry } from './types';

function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatAuditLogsCsv(logs: AuditLogEntry[]): string {
  const header = ['Thời gian', 'Danh mục', 'Tác nhân', 'Mã tác nhân', 'Hành động', 'Địa chỉ IP', 'Trạng thái'];
  const rows = logs.map((item) => [
    escapeCsvCell(item.timestamp),
    escapeCsvCell(item.category),
    escapeCsvCell(item.actorName),
    escapeCsvCell(item.actorId),
    escapeCsvCell(item.description),
    escapeCsvCell(item.ipAddress),
    escapeCsvCell(item.status),
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

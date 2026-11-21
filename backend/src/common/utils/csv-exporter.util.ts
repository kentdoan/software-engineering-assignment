import { AuditLogEntry } from '../interfaces';

/**
 * Mục đích: Bao bọc và thoát ký tự đặc biệt cho một ô dữ liệu trước khi xuất ra định dạng CSV.
 * Cách hoạt động: Chuyển giá trị sang chuỗi, nếu chứa dấu phẩy, ngoặc kép hoặc xuống dòng thì nhân đôi dấu ngoặc kép bên trong và bọc toàn bộ chuỗi trong cặp ngoặc kép.
 */
function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Mục đích: Chuyển đổi danh sách nhật ký kiểm toán sang chuỗi nội dung tệp CSV có tiêu đề tiếng Việt.
 * Cách hoạt động: Tạo dòng tiêu đề gồm 7 cột thông tin nhật ký, duyệt từng bản ghi để làm sạch từng ô dữ liệu rồi ghép các dòng lại bằng ký tự xuống dòng.
 */
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

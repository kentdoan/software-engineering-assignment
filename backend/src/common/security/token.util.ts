import { User } from '../interfaces';

/**
 * Mục đích: Tách chuỗi JWT token gốc ra khỏi header Authorization của yêu cầu HTTP.
 * Cách hoạt động: Cắt khoảng trắng ở header, tách theo từ khóa Bearer (không phân biệt hoa thường) để lấy phần token đứng sau, hoặc trả về chính chuỗi header nếu client gửi trực tiếp token thô.
 */
export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;
  const parts = authorizationHeader.trim().split(/\s+/);
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return authorizationHeader.trim() || null;
}

/**
 * Mục đích: Loại bỏ các trường nhạy cảm của người dùng trước khi trả dữ liệu ra API cho phía giao diện.
 * Cách hoạt động: Dùng phép tách thuộc tính để bỏ trường passwordHash ra khỏi đối tượng User và trả về bản sao sạch chỉ chứa thông tin an toàn.
 */
export function sanitizeUser(user: User): User {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

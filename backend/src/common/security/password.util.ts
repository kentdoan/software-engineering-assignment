import * as bcrypt from 'bcryptjs';

/**
 * Mục đích: Băm mật khẩu dạng văn bản thô thành chuỗi mã hóa an toàn trước khi lưu vào cơ sở dữ liệu.
 * Cách hoạt động: Gọi hàm băm của thư viện bcryptjs với độ phức tạp salt là 10 vòng để sinh chuỗi băm bất đối xứng.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Mục đích: Kiểm tra mật khẩu người dùng nhập vào có khớp với chuỗi băm đang lưu trong cơ sở dữ liệu hay không.
 * Cách hoạt động: Trả về false ngay nếu chưa có chuỗi băm lưu trữ, ngược lại dùng bcryptjs để đối chiếu mật khẩu thô với chuỗi băm.
 */
export async function comparePassword(plain: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;
  return bcrypt.compare(plain, storedHash);
}

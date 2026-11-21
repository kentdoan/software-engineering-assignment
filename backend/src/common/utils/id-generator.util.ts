/**
 * Mục đích: Sinh mã định danh duy nhất cho các bản ghi cơ sở dữ liệu theo tiền tố nghiệp vụ.
 * Cách hoạt động: Kết hợp tiền tố truyền vào, mốc thời gian hiện tại tính bằng mili-giây và một số ngẫu nhiên 3 chữ số để tạo chuỗi mã khó trùng lặp.
 */
export function generateId(prefix: string): string {
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${Date.now()}-${rand}`;
}

/**
 * Mục đích: Tạo mã tham chiếu ngắn gọn, dễ đọc cho người dùng hiển thị trên giao diện (ví dụ BOOK-481205).
 * Cách hoạt động: Ghép tiền tố nghiệp vụ với 3 chữ số cuối của mốc thời gian hiện tại và 3 chữ số ngẫu nhiên.
 */
export function generateCode(prefix: string): string {
  const rand = Math.floor(100 + Math.random() * 900);
  const tail = String(Date.now()).slice(-3);
  return `${prefix}-${tail}${rand}`;
}

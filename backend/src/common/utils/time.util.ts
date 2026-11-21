/**
 * Mục đích: Chuyển đổi chuỗi giờ dạng HH:mm sang tổng số phút tính từ đầu ngày để thuận tiện tính toán lịch sạc.
 * Cách hoạt động: Tách chuỗi theo dấu hai chấm, chuẩn hóa phần giờ trong khoảng 0-23 và phần phút trong khoảng 0-59 rồi tính tổng số phút.
 */
export function timeToMinutes(timeStr: string): number {
  const [hStr, mStr] = (timeStr || '08:00').split(':');
  const h = Math.min(23, Math.max(0, Number(hStr) || 0));
  const m = Math.min(59, Math.max(0, Number(mStr) || 0));
  return h * 60 + m;
}

/**
 * Mục đích: Chuyển đổi tổng số phút trong ngày thành chuỗi định dạng HH:mm để hiển thị lên lịch trình.
 * Cách hoạt động: Chia lấy dư trong chu kỳ 1440 phút một ngày để giữ giờ hợp lệ, sau đó tính giờ và phút kèm đệm số 0 ở đầu nếu nhỏ hơn 10.
 */
export function minutesToTime(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

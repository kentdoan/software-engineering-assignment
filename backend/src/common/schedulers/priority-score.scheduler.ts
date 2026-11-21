import { timeToMinutes } from '../utils/time.util';

/**
 * Mục đích: Tính điểm ưu tiên sạc cho một phương tiện dựa trên mức độ thiếu hụt pin và độ gấp về giờ xuất phát.
 * Cách hoạt động: Tính phần trăm pin còn thiếu so với mức 100%, tính điểm khẩn cấp tỉ lệ nghịch với số phút còn lại đến giờ xuất phát dự kiến, rồi kết hợp hai thành phần để trả về điểm ưu tiên nguyên dương.
 */
export function calculatePriorityScore(
  batterySoc: number,
  targetDepartureTime: string,
  baseMinutes = 7 * 60,
): number {
  const deficit = Math.max(0, 100 - batterySoc);
  const depMins = timeToMinutes(targetDepartureTime);
  const urgencyMinutes = Math.max(30, depMins - baseMinutes);
  const urgencyBoost = Math.round((180 / urgencyMinutes) * 20);
  return Math.round(deficit * 0.8 + urgencyBoost);
}

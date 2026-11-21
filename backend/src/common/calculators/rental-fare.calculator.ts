/**
 * Mục đích: Tính tổng cước phí chuyến thuê xe dựa trên thời lượng sử dụng và loại phương tiện.
 * Cách hoạt động: Xác định giá mở khóa cơ bản và đơn giá theo phút (xe máy điện có cước cao hơn xe đạp điện), làm tròn thời lượng tối thiểu 1 phút rồi cộng tổng tiền VNĐ.
 */
export function calculateRentalFee(durationMinutes: number, vehicleType?: string): number {
  const baseFare = vehicleType === 'E_MOTORBIKE' ? 5000 : 3000;
  const perMinute = vehicleType === 'E_MOTORBIKE' ? 800 : 500;
  return baseFare + Math.max(1, durationMinutes) * perMinute;
}

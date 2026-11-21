import { Hub } from '../interfaces';

/**
 * Mục đích: Tính khoảng cách đường chim bay theo đơn vị kilômét giữa hai tọa độ GPS trên bề mặt Trái Đất.
 * Cách hoạt động: Áp dụng công thức Haversine với bán kính Trái Đất 6371 km dựa trên chênh lệch vĩ độ và kinh độ quy đổi sang radian, sau đó làm tròn đến 2 chữ số thập phân.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 100) / 100;
}

/**
 * Mục đích: Ước lượng quãng đường di chuyển của một chuyến thuê xe giữa trạm xuất phát và trạm đích.
 * Cách hoạt động: Trả về mức tối thiểu 1.2 km nếu không xác định được hai trạm hoặc nhận và trả tại cùng một trạm, ngược lại tính khoảng cách Haversine giữa hai trạm và làm tròn đến 1 chữ số thập phân.
 */
export function estimateTripDistanceKm(originHub: Hub | undefined, destHub: Hub | undefined): number {
  if (!originHub || !destHub || originHub.id === destHub.id) {
    return 1.2;
  }
  const dist = calculateHaversineDistance(
    originHub.latitude,
    originHub.longitude,
    destHub.latitude,
    destHub.longitude,
  );
  return Math.round(Math.max(1.2, dist) * 10) / 10;
}

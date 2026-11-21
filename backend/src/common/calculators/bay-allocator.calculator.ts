import { ParkingBooking, Vehicle } from '../interfaces';

/**
 * Mục đích: Tự động chọn ra chiếc xe có mức pin cao nhất đang sẵn sàng tại trạm Hub để phục vụ đặt nhanh hoặc đổi xe dự phòng.
 * Cách hoạt động: Lọc các xe thuộc trạm chỉ định có trạng thái AVAILABLE, đạt mức pin tối thiểu và khớp loại xe yêu cầu (nếu có), sau đó sắp xếp giảm dần theo phần trăm pin và trả về xe đứng đầu.
 */
export function autoAllocateHighestBatteryVehicle(
  vehicles: Vehicle[],
  hubId: string,
  vehicleType?: string,
  minBatterySoc = 20,
): Vehicle | null {
  const candidates = vehicles.filter((v) => {
    if (v.hubId !== hubId || v.status !== 'AVAILABLE' || v.batterySoc < minBatterySoc) {
      return false;
    }
    if (vehicleType && vehicleType !== 'ALL' && v.type !== vehicleType) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.batterySoc - a.batterySoc);
  return candidates[0];
}

/**
 * Mục đích: Cấp phát một mã ô đỗ xe cá nhân còn trống tại trạm Hub cho lượt đặt chỗ mới.
 * Cách hoạt động: Thu thập tập hợp các mã ô đỗ đang được giữ chỗ ở trạng thái ACTIVE tại trạm, rồi duyệt tuần tự từ 01 đến 30 theo mẫu P-{MÃ_TRẠM}-{SỐ} để chọn mã đầu tiên chưa có người đặt.
 */
export function assignParkingBayCode(
  hubId: string,
  existingBookings: ParkingBooking[],
): string {
  const occupiedCodes = new Set(
    existingBookings
      .filter((b) => b.hubId === hubId && b.status === 'ACTIVE')
      .map((b) => b.bayCode),
  );
  const hubSuffix = hubId.replace('hub-', '').toUpperCase().slice(0, 3);
  for (let i = 1; i <= 30; i++) {
    const code = `P-${hubSuffix}-${String(i).padStart(2, '0')}`;
    if (!occupiedCodes.has(code)) {
      return code;
    }
  }
  return `P-${hubSuffix}-99`;
}

/**
 * Mục đích: Chọn một mã ô đỗ trống tại trạm đích để hướng dẫn sinh viên đưa xe dùng chung vào khóa khi kết thúc chuyến đi.
 * Cách hoạt động: Lấy danh sách các mã ô đỗ đang có xe chiếm chỗ tại trạm đích, sau đó duyệt tuần tự từ 01 đến 40 theo mẫu D-{MÃ_TRẠM}-{SỐ} để trả về ô đỗ trống đầu tiên.
 */
export function assignReturnParkingSpace(hubId: string, vehicles: Vehicle[]): string {
  const usedBays = new Set(
    vehicles
      .filter((v) => v.hubId === hubId && v.bayCode)
      .map((v) => v.bayCode as string),
  );
  const hubPrefix = hubId.replace('hub-', '').toUpperCase().slice(0, 3);
  for (let i = 1; i <= 40; i++) {
    const candidate = `D-${hubPrefix}-${String(i).padStart(2, '0')}`;
    if (!usedBays.has(candidate)) {
      return candidate;
    }
  }
  return `D-${hubPrefix}-40`;
}

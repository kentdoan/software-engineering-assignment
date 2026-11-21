import { ChargingSession, PrivateVehicle } from '../interfaces';

/**
 * Mục đích: Chuyển đổi bản ghi xe điện cá nhân từ Prisma sang đối tượng PrivateVehicle chuẩn.
 * Cách hoạt động: Ánh xạ thông tin chủ sở hữu, biển số, mẫu xe, loại xe, chuẩn đầu sạc và dung lượng pin kWh sang định dạng camelCase.
 */
export function mapPrivateVehicleFromPrisma(row: {
  id: string;
  user_id: string;
  plate_number: string;
  model: string;
  vehicle_type: string;
  charger_type: string;
  battery_capacity_kwh: number;
}): PrivateVehicle {
  return {
    id: row.id,
    userId: row.user_id,
    plateNumber: row.plate_number,
    model: row.model,
    vehicleType: row.vehicle_type,
    chargerType: row.charger_type,
    batteryCapacityKwh: row.battery_capacity_kwh,
  };
}

/**
 * Mục đích: Chuyển đổi bản ghi phiên sạc từ Prisma sang đối tượng ChargingSession chuẩn.
 * Cách hoạt động: Gộp hai cột khóa ngoại private_vehicle_id và vehicle_id thành một trường vehicleId duy nhất dựa vào cờ is_private_vehicle, đồng thời ánh xạ toàn bộ thông số thời gian, phần trăm pin và điểm ưu tiên.
 */
export function mapChargingSessionFromPrisma(row: {
  id: string;
  code: string;
  user_id: string | null;
  vehicle_id: string | null;
  private_vehicle_id: string | null;
  vehicle_label: string;
  hub_id: string;
  charging_point_id: string;
  charging_point_code: string;
  bay_code: string;
  is_private_vehicle: boolean;
  session_date: string;
  start_time: string;
  end_time: string;
  current_soc: number;
  target_soc: number;
  priority_score: number;
  status: ChargingSession['status'];
  created_at: Date;
}): ChargingSession {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    vehicleId: (row.is_private_vehicle ? row.private_vehicle_id : row.vehicle_id) || '',
    vehicleLabel: row.vehicle_label,
    hubId: row.hub_id,
    chargingPointId: row.charging_point_id,
    chargingPointCode: row.charging_point_code,
    bayCode: row.bay_code,
    isPrivateVehicle: row.is_private_vehicle,
    date: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    currentSoc: row.current_soc,
    targetSoc: row.target_soc,
    priorityScore: row.priority_score,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

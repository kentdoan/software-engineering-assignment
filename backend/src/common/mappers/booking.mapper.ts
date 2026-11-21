import { Booking, ParkingBooking } from '../interfaces';
import { mapHubFromPrisma, mapVehicleFromPrisma } from './hub.mapper';

/**
 * Mục đích: Chuyển đổi bản ghi đặt giữ xe dùng chung từ Prisma sang đối tượng Booking chuẩn.
 * Cách hoạt động: Ánh xạ các thông tin cơ bản của phiếu đặt chỗ, chuyển các mốc thời gian sang chuỗi ISO, đồng thời ánh xạ lồng thông tin xe và trạm Hub đi kèm nếu có.
 */
export function mapBookingFromPrisma(row: {
  id: string;
  code: string | null;
  user_id: string;
  vehicle_id: string;
  hub_id: string;
  created_at: Date;
  expires_at: Date;
  status: Booking['status'];
  vehicles?: Parameters<typeof mapVehicleFromPrisma>[0] | null;
  hubs?: Parameters<typeof mapHubFromPrisma>[0] | null;
}): Booking {
  return {
    id: row.id,
    code: row.code ?? undefined,
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    hubId: row.hub_id,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    status: row.status,
    vehicle: row.vehicles ? mapVehicleFromPrisma(row.vehicles) : undefined,
    hub: row.hubs ? mapHubFromPrisma(row.hubs) : undefined,
  };
}

/**
 * Mục đích: Chuyển đổi bản ghi đặt chỗ đỗ xe cá nhân từ Prisma sang đối tượng ParkingBooking chuẩn.
 * Cách hoạt động: Ánh xạ mã đặt chỗ, thông tin trạm, biển số xe cá nhân, mã ô đỗ, giờ đến dự kiến và chuyển thời điểm hết hạn cùng ngày tạo sang chuỗi ISO.
 */
export function mapParkingBookingFromPrisma(row: {
  id: string;
  code: string;
  user_id: string;
  hub_id: string;
  hub_name: string;
  vehicle_plate: string;
  bay_code: string;
  arrival_time: string;
  expires_at: Date;
  status: ParkingBooking['status'];
  created_at: Date;
}): ParkingBooking {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    hubId: row.hub_id,
    hubName: row.hub_name,
    vehiclePlate: row.vehicle_plate,
    bayCode: row.bay_code,
    arrivalTime: row.arrival_time,
    expiresAt: row.expires_at.toISOString(),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

import { Rental } from '../interfaces';
import { mapHubFromPrisma, mapVehicleFromPrisma } from './hub.mapper';

/**
 * Mục đích: Chuyển đổi bản ghi chuyến thuê xe từ Prisma sang đối tượng Rental chuẩn để trả về hoặc xử lý nghiệp vụ.
 * Cách hoạt động: Ánh xạ đầy đủ thông tin chuyến đi, cước phí, ghi chú hư hỏng và làm sạch tên các quan hệ nối bảng của Prisma thành vehicle, originHub và destinationHub.
 */
export function mapRentalFromPrisma(row: {
  id: string;
  user_id: string;
  vehicle_id: string;
  booking_id: string | null;
  origin_hub_id: string;
  destination_hub_id: string | null;
  return_bay_code: string | null;
  start_time: Date;
  end_time: Date | null;
  duration_minutes: number | null;
  distance_km: number | null;
  fare: number | null;
  damaged_reported: boolean;
  damage_note: string | null;
  status: Rental['status'];
  vehicles?: Parameters<typeof mapVehicleFromPrisma>[0] | null;
  hubs_rentals_origin_hub_idTohubs?: Parameters<typeof mapHubFromPrisma>[0] | null;
  hubs_rentals_destination_hub_idTohubs?: Parameters<typeof mapHubFromPrisma>[0] | null;
}): Rental {
  return {
    id: row.id,
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    bookingId: row.booking_id,
    originHubId: row.origin_hub_id,
    destinationHubId: row.destination_hub_id,
    returnBayCode: row.return_bay_code,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time ? row.end_time.toISOString() : null,
    durationMinutes: row.duration_minutes,
    distanceKm: row.distance_km,
    fare: row.fare,
    damagedReported: row.damaged_reported,
    damageNote: row.damage_note ?? '',
    status: row.status,
    vehicle: row.vehicles ? mapVehicleFromPrisma(row.vehicles) : undefined,
    originHub: row.hubs_rentals_origin_hub_idTohubs
      ? mapHubFromPrisma(row.hubs_rentals_origin_hub_idTohubs)
      : undefined,
    destinationHub: row.hubs_rentals_destination_hub_idTohubs
      ? mapHubFromPrisma(row.hubs_rentals_destination_hub_idTohubs)
      : undefined,
  };
}

import { Hub, Vehicle, VehicleStatus } from './hub.types';

/** Mục đích: Thông tin một lượt thuê và di chuyển bằng xe điện dùng chung. */
export interface Rental {
  id: string;
  userId: string;
  vehicleId: string;
  bookingId?: string | null;
  originHubId: string;
  destinationHubId?: string | null;
  returnBayCode?: string | null;
  startTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  fare?: number | null;
  damagedReported?: boolean;
  damageNote?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  vehicle?: Vehicle;
  originHub?: Hub;
  destinationHub?: Hub;
}

/** Mục đích: Kết quả và biên lai điện tử trả về sau khi sinh viên hoàn tất trả xe tại trạm đích. */
export interface ReturnReceiptResponse {
  rental: Rental;
  vehicle: Vehicle;
  receipt: {
    fare: number;
    durationMinutes: number;
    distanceKm: number;
    bayCode: string;
    newBatterySoc: number;
    nextVehicleStatus: VehicleStatus;
    autoQueuedForCharging: boolean;
    balanceRemaining: number;
  };
}

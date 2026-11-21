import { Hub, Vehicle } from './hub.types';

/** Mục đích: Thông tin lượt đặt giữ xe điện dùng chung (giữ chỗ tối đa 15 phút). */
export interface Booking {
  id: string;
  code?: string;
  userId: string;
  vehicleId: string;
  hubId: string;
  createdAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  vehicle?: Vehicle;
  hub?: Hub;
}

/** Mục đích: Thông tin lượt đặt trước ô đỗ xe điện cá nhân tại trạm Hub. */
export interface ParkingBooking {
  id: string;
  code: string;
  userId: string;
  hubId: string;
  hubName: string;
  vehiclePlate: string;
  bayCode: string;
  arrivalTime: string;
  expiresAt: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  createdAt: string;
}

/** Mục đích: Gói dữ liệu đặt chỗ hiện hiệu và lịch sử đặt giữ xe/ô đỗ của sinh viên. */
export interface ActiveBookingsBundle {
  vehicleBooking: Booking | null;
  parkingBooking: ParkingBooking | null;
  historyBookings: Booking[];
  historyParkingBookings: ParkingBooking[];
}

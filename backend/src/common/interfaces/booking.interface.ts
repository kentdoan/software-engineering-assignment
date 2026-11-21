import { Hub } from './hub.interface';
import { Vehicle } from './vehicle.interface';

export type BookingStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

export interface Booking {
  id: string;
  code?: string;
  userId: string;
  vehicleId: string;
  hubId: string;
  createdAt: string;
  expiresAt: string;
  status: BookingStatus;
  vehicle?: Vehicle;
  hub?: Hub;
}

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
  status: BookingStatus;
  createdAt: string;
}

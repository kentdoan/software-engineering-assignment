import { Hub } from './hub.interface';
import { Vehicle } from './vehicle.interface';

export type RentalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

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
  status: RentalStatus;
  vehicle?: Vehicle;
  originHub?: Hub;
  destinationHub?: Hub;
}

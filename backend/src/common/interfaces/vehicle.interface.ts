export type VehicleStatus =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'IN_USE'
  | 'CHARGING'
  | 'UNDER_MAINTENANCE'
  | 'FAULTY';

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  hubId: string | null;
  batterySoc: number;
  status: VehicleStatus;
  model: string;
  bayCode?: string;
  qrCode?: string;
}

export interface PrivateVehicle {
  id: string;
  userId: string;
  plateNumber: string;
  model: string;
  vehicleType: string;
  chargerType: string;
  batteryCapacityKwh: number;
}

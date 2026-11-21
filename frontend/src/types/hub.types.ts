import { ChargingPoint } from './charging.types';

/** Mục đích: Trạng thái cân bằng tải và mức độ khả dụng hiện tại của một trạm Hub. */
export type HubStatus = 'NORMAL' | 'LOW_VEHICLES' | 'HIGH_OCCUPANCY';

/** Mục đích: Trạng thái vận hành hiện thời của phương tiện điện dùng chung. */
export type VehicleStatus =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'IN_USE'
  | 'CHARGING'
  | 'UNDER_MAINTENANCE'
  | 'FAULTY';

/** Mục đích: Thông tin chi tiết một phương tiện điện dùng chung thuộc đội xe của hệ thống. */
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

/** Mục đích: Thông tin trạm Hub cùng số liệu khả dụng xe, ô đỗ và trụ sạc tại ĐHQG-HCM. */
export interface Hub {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  totalDocks: number;
  totalChargingPorts: number;
  description?: string;
  availableVehicles?: number;
  availableDocks?: number;
  chargingVehicles?: number;
  availableChargingPorts?: number;
  distanceKm?: number;
  status?: HubStatus;
  vehicles?: Vehicle[];
  chargingPoints?: ChargingPoint[];
}

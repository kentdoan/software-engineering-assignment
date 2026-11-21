import { ChargingPoint } from './charging.interface';
import { Vehicle } from './vehicle.interface';

export type HubStatus = 'NORMAL' | 'LOW_VEHICLES' | 'HIGH_OCCUPANCY';

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

export interface HubSearchQuery {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  hasAvailableVehicles?: boolean;
  hasAvailableDocks?: boolean;
  hasAvailableCharging?: boolean;
}

export interface MonitoringStats {
  totalHubs: number;
  totalVehicles: number;
  availableVehicles: number;
  inUseVehicles: number;
  chargingVehicles: number;
  bookedVehicles: number;
  faultyVehicles: number;
  availableChargingPorts: number;
  activeIncidents: number;
  networkHealth: number;
}

export interface HubAlert {
  id: string;
  hubId: string;
  hubName: string;
  severity: 'WARNING' | 'CRITICAL';
  type: 'LOW_VEHICLES' | 'HIGH_OCCUPANCY' | 'CHARGING_SURGE';
  message: string;
  detectedAt: string;
}

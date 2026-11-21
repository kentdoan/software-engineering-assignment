export type ChargingPointStatus = 'AVAILABLE' | 'CHARGING' | 'RESERVED' | 'MAINTENANCE';

export interface ChargingPoint {
  id: string;
  hubId: string;
  code: string;
  bayCode: string;
  connectorType: string;
  powerKw: number;
  status: ChargingPointStatus;
}

export type ChargingSessionStatus = 'SCHEDULED' | 'CHARGING' | 'COMPLETED' | 'CANCELLED';

export interface ChargingSession {
  id: string;
  code: string;
  userId?: string | null;
  vehicleId: string;
  vehicleLabel: string;
  hubId: string;
  chargingPointId: string;
  chargingPointCode: string;
  bayCode: string;
  isPrivateVehicle: boolean;
  date: string;
  startTime: string;
  endTime: string;
  currentSoc: number;
  targetSoc: number;
  priorityScore: number;
  status: ChargingSessionStatus;
  createdAt: string;
}

export interface ChargingSlotProposal {
  chargingPointId: string;
  chargingPointCode: string;
  bayCode: string;
  connectorType: string;
  powerKw: number;
  startTime: string;
  endTime: string;
  estimatedMinutes: number;
  estimatedCostVnd: number;
}

export interface GreedyScheduleItem {
  vehicleId: string;
  plateNumber: string;
  model: string;
  currentSoc: number;
  targetSoc: number;
  targetDepartureTime: string;
  priorityScore: number;
  chargingPointId: string;
  chargingPointCode: string;
  bayCode: string;
  startTime: string;
  endTime: string;
}

import { Vehicle } from './vehicle.interface';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  targetHubId: string;
  actionType: string;
  intensity: number;
  warningThreshold: number;
}

export interface WhatIfRecommendation {
  id: string;
  sourceHubId: string;
  sourceHubName: string;
  targetHubId: string;
  targetHubName: string;
  recommendedVehicleCount: number;
  vehicleIds: string[];
  reason: string;
}

export interface SimulationStatus {
  isRunning: boolean;
  activeScenarioId: string | null;
  speed: number;
  passengerMultiplier: number;
  currentStep: number;
  totalSteps: number;
  logs: string[];
  recommendations?: WhatIfRecommendation[];
}

export interface SimRuntimeState {
  isRunning: boolean;
  activeScenarioId: string | null;
  speed: number;
  passengerMultiplier: number;
  currentStep: number;
  totalSteps: number;
  logs: string[];
  recommendations: WhatIfRecommendation[];
  timer: NodeJS.Timeout | null;
  preSimVehiclesSnapshot: Vehicle[] | null;
}

export interface SimulationTickOutcome {
  modifiedVehicles: Vehicle[];
  completed: boolean;
}

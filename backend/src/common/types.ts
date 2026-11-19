export type UserRole = 'STUDENT' | 'OPERATOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'LOCKED' | 'REJECTED' | 'DELETED';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  studentId?: string;
  university?: string;
  staffId?: string;
  department?: string;
  citizenId?: string;
  balance?: number;
  unpaidFee?: number;
  rejectReason?: string;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

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

export type DispatchStatus = 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface DispatchOrder {
  id: string;
  code: string;
  operatorId: string;
  sourceHubId: string;
  targetHubId: string;
  vehicleIds: string[];
  vehiclePlates: string[];
  note?: string;
  status: DispatchStatus;
  createdAt: string;
  completedAt?: string | null;
}

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface IncidentReport {
  id: string;
  code: string;
  reporterId: string;
  hubId: string;
  resourceType: 'VEHICLE' | 'CHARGING_POINT';
  resourceId: string;
  resourceLabel: string;
  incidentType: string;
  description: string;
  affectedSummary?: string;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

export type AuditCategory = 'QUAN_TRI' | 'CANH_BAO' | 'API' | 'VAN_HANH';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: AuditCategory;
  actorName: string;
  actorId: string;
  description: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

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

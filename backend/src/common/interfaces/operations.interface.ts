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

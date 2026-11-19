import {
  Booking,
  ChargingPoint,
  ChargingSession,
  DispatchOrder,
  Hub,
  IncidentReport,
  ParkingBooking,
  PrivateVehicle,
  Rental,
  Scenario,
  User,
  Vehicle,
  AuditLogEntry,
} from './types';

export function mapUserFromPrisma(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: User['role'];
  status: User['status'];
  citizen_id: string | null;
  reject_reason: string | null;
  created_at: Date;
  student_profiles?: {
    student_id: string | null;
    university: string | null;
    balance: number;
    unpaid_fee: number;
  } | null;
  operator_profiles?: {
    staff_id: string;
    department: string | null;
  } | null;
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    studentId: row.student_profiles?.student_id ?? undefined,
    university: row.student_profiles?.university ?? undefined,
    balance: row.student_profiles?.balance,
    unpaidFee: row.student_profiles?.unpaid_fee ?? 0,
    staffId: row.operator_profiles?.staff_id ?? undefined,
    department: row.operator_profiles?.department ?? undefined,
    citizenId: row.citizen_id ?? undefined,
    rejectReason: row.reject_reason ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

export function mapHubFromPrisma(row: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_docks: number;
  total_charging_ports: number;
  description: string | null;
}): Hub {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    totalDocks: row.total_docks,
    totalChargingPorts: row.total_charging_ports,
    description: row.description ?? undefined,
  };
}

export function mapVehicleFromPrisma(row: {
  id: string;
  plate_number: string;
  type: string;
  hub_id: string | null;
  battery_soc: number;
  status: Vehicle['status'];
  model: string;
  bay_code: string | null;
  qr_code: string | null;
}): Vehicle {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    type: row.type,
    hubId: row.hub_id,
    batterySoc: row.battery_soc,
    status: row.status,
    model: row.model,
    bayCode: row.bay_code ?? undefined,
    qrCode: row.qr_code ?? undefined,
  };
}

export function mapChargingPointFromPrisma(row: {
  id: string;
  hub_id: string;
  code: string;
  bay_code: string;
  connector_type: string;
  power_kw: number;
  status: ChargingPoint['status'];
}): ChargingPoint {
  return {
    id: row.id,
    hubId: row.hub_id,
    code: row.code,
    bayCode: row.bay_code,
    connectorType: row.connector_type,
    powerKw: row.power_kw,
    status: row.status,
  };
}

export function mapPrivateVehicleFromPrisma(row: {
  id: string;
  user_id: string;
  plate_number: string;
  model: string;
  vehicle_type: string;
  charger_type: string;
  battery_capacity_kwh: number;
}): PrivateVehicle {
  return {
    id: row.id,
    userId: row.user_id,
    plateNumber: row.plate_number,
    model: row.model,
    vehicleType: row.vehicle_type,
    chargerType: row.charger_type,
    batteryCapacityKwh: row.battery_capacity_kwh,
  };
}

export function mapChargingSessionFromPrisma(row: {
  id: string;
  code: string;
  user_id: string | null;
  vehicle_id: string | null;
  private_vehicle_id: string | null;
  vehicle_label: string;
  hub_id: string;
  charging_point_id: string;
  charging_point_code: string;
  bay_code: string;
  is_private_vehicle: boolean;
  session_date: string;
  start_time: string;
  end_time: string;
  current_soc: number;
  target_soc: number;
  priority_score: number;
  status: ChargingSession['status'];
  created_at: Date;
}): ChargingSession {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    vehicleId: (row.is_private_vehicle ? row.private_vehicle_id : row.vehicle_id) || '',
    vehicleLabel: row.vehicle_label,
    hubId: row.hub_id,
    chargingPointId: row.charging_point_id,
    chargingPointCode: row.charging_point_code,
    bayCode: row.bay_code,
    isPrivateVehicle: row.is_private_vehicle,
    date: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    currentSoc: row.current_soc,
    targetSoc: row.target_soc,
    priorityScore: row.priority_score,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export function mapBookingFromPrisma(row: {
  id: string;
  code: string | null;
  user_id: string;
  vehicle_id: string;
  hub_id: string;
  created_at: Date;
  expires_at: Date;
  status: Booking['status'];
  vehicles?: Parameters<typeof mapVehicleFromPrisma>[0] | null;
  hubs?: Parameters<typeof mapHubFromPrisma>[0] | null;
}): Booking {
  return {
    id: row.id,
    code: row.code ?? undefined,
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    hubId: row.hub_id,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    status: row.status,
    vehicle: row.vehicles ? mapVehicleFromPrisma(row.vehicles) : undefined,
    hub: row.hubs ? mapHubFromPrisma(row.hubs) : undefined,
  };
}

export function mapParkingBookingFromPrisma(row: {
  id: string;
  code: string;
  user_id: string;
  hub_id: string;
  hub_name: string;
  vehicle_plate: string;
  bay_code: string;
  arrival_time: string;
  expires_at: Date;
  status: ParkingBooking['status'];
  created_at: Date;
}): ParkingBooking {
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    hubId: row.hub_id,
    hubName: row.hub_name,
    vehiclePlate: row.vehicle_plate,
    bayCode: row.bay_code,
    arrivalTime: row.arrival_time,
    expiresAt: row.expires_at.toISOString(),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export function mapRentalFromPrisma(row: {
  id: string;
  user_id: string;
  vehicle_id: string;
  booking_id: string | null;
  origin_hub_id: string;
  destination_hub_id: string | null;
  return_bay_code: string | null;
  start_time: Date;
  end_time: Date | null;
  duration_minutes: number | null;
  distance_km: number | null;
  fare: number | null;
  damaged_reported: boolean;
  damage_note: string | null;
  status: Rental['status'];
  vehicles?: Parameters<typeof mapVehicleFromPrisma>[0] | null;
  hubs_rentals_origin_hub_idTohubs?: Parameters<typeof mapHubFromPrisma>[0] | null;
  hubs_rentals_destination_hub_idTohubs?: Parameters<typeof mapHubFromPrisma>[0] | null;
}): Rental {
  return {
    id: row.id,
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    bookingId: row.booking_id,
    originHubId: row.origin_hub_id,
    destinationHubId: row.destination_hub_id,
    returnBayCode: row.return_bay_code,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time ? row.end_time.toISOString() : null,
    durationMinutes: row.duration_minutes,
    distanceKm: row.distance_km,
    fare: row.fare,
    damagedReported: row.damaged_reported,
    damageNote: row.damage_note ?? '',
    status: row.status,
    vehicle: row.vehicles ? mapVehicleFromPrisma(row.vehicles) : undefined,
    originHub: row.hubs_rentals_origin_hub_idTohubs
      ? mapHubFromPrisma(row.hubs_rentals_origin_hub_idTohubs)
      : undefined,
    destinationHub: row.hubs_rentals_destination_hub_idTohubs
      ? mapHubFromPrisma(row.hubs_rentals_destination_hub_idTohubs)
      : undefined,
  };
}

export function mapDispatchOrderFromPrisma(row: {
  id: string;
  code: string;
  operator_id: string;
  source_hub_id: string;
  target_hub_id: string;
  note: string | null;
  status: DispatchOrder['status'];
  created_at: Date;
  completed_at: Date | null;
  dispatch_order_items: { vehicle_id: string; plate_number: string }[];
}): DispatchOrder {
  return {
    id: row.id,
    code: row.code,
    operatorId: row.operator_id,
    sourceHubId: row.source_hub_id,
    targetHubId: row.target_hub_id,
    vehicleIds: row.dispatch_order_items.map((item) => item.vehicle_id),
    vehiclePlates: row.dispatch_order_items.map((item) => item.plate_number),
    note: row.note ?? '',
    status: row.status,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
  };
}

export function mapIncidentFromPrisma(row: {
  id: string;
  code: string;
  reporter_id: string;
  hub_id: string;
  resource_type: IncidentReport['resourceType'];
  vehicle_id: string | null;
  charging_point_id: string | null;
  resource_label: string;
  incident_type: string;
  description: string;
  affected_summary: string | null;
  status: IncidentReport['status'];
  created_at: Date;
  resolved_at: Date | null;
}): IncidentReport {
  return {
    id: row.id,
    code: row.code,
    reporterId: row.reporter_id,
    hubId: row.hub_id,
    resourceType: row.resource_type,
    resourceId: (row.resource_type === 'VEHICLE' ? row.vehicle_id : row.charging_point_id) || '',
    resourceLabel: row.resource_label,
    incidentType: row.incident_type,
    description: row.description,
    affectedSummary: row.affected_summary ?? undefined,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
  };
}

export function mapAuditLogFromPrisma(row: {
  id: string;
  timestamp: Date;
  category: AuditLogEntry['category'];
  actor_name: string;
  actor_id: string;
  description: string;
  ip_address: string;
  status: AuditLogEntry['status'];
}): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    category: row.category,
    actorName: row.actor_name,
    actorId: row.actor_id,
    description: row.description,
    ipAddress: row.ip_address,
    status: row.status,
  };
}

export function mapScenarioFromPrisma(row: {
  id: string;
  name: string;
  description: string;
  target_hub_id: string;
  action_type: string;
  intensity: number;
  warning_threshold: number;
}): Scenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetHubId: row.target_hub_id,
    actionType: row.action_type,
    intensity: row.intensity,
    warningThreshold: row.warning_threshold,
  };
}

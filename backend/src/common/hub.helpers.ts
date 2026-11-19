import { calculateHaversineKm } from './geo.helpers';
import {
  ChargingPoint,
  Hub,
  HubAlert,
  HubStatus,
  IncidentReport,
  MonitoringStats,
  ParkingBooking,
  Vehicle,
} from './types';

export interface HubSearchQuery {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  hasAvailableVehicles?: boolean;
  hasAvailableDocks?: boolean;
  hasAvailableCharging?: boolean;
}

export function computeHubStats(
  hub: Hub,
  vehicles: Vehicle[],
  chargingPoints: ChargingPoint[] = [],
  parkingBookings: ParkingBooking[] = [],
): Hub {
  const hubVehicles = vehicles.filter((v) => v.hubId === hub.id);
  const availableVehicles = hubVehicles.filter((v) => v.status === 'AVAILABLE').length;
  const bookedVehicles = hubVehicles.filter((v) => v.status === 'BOOKED').length;
  const chargingVehicles = hubVehicles.filter((v) => v.status === 'CHARGING').length;
  const maintenanceVehicles = hubVehicles.filter(
    (v) => v.status === 'UNDER_MAINTENANCE' || v.status === 'FAULTY',
  ).length;
  const reservedPrivateDocks = parkingBookings.filter(
    (p) => p.hubId === hub.id && p.status === 'ACTIVE',
  ).length;

  const dockedVehiclesCount =
    availableVehicles +
    bookedVehicles +
    chargingVehicles +
    maintenanceVehicles +
    reservedPrivateDocks;
  const availableDocks = Math.max(0, hub.totalDocks - dockedVehiclesCount);

  const hubPoints = chargingPoints.filter((cp) => cp.hubId === hub.id);
  const availableChargingPorts =
    hubPoints.length > 0
      ? hubPoints.filter((cp) => cp.status === 'AVAILABLE').length
      : Math.max(0, hub.totalChargingPorts - chargingVehicles);

  let status: HubStatus = 'NORMAL';
  if (availableVehicles <= 2) {
    status = 'LOW_VEHICLES';
  } else if (availableDocks <= 2) {
    status = 'HIGH_OCCUPANCY';
  }

  return {
    ...hub,
    availableVehicles,
    availableDocks,
    chargingVehicles,
    availableChargingPorts,
    status,
    vehicles: hubVehicles,
    chargingPoints: hubPoints,
  };
}

export function filterHubsList(
  hubs: Hub[],
  query: HubSearchQuery,
): Hub[] {
  const qNorm = (query.q || '').trim().toLowerCase();
  const hasOrigin =
    typeof query.lat === 'number' &&
    !Number.isNaN(query.lat) &&
    typeof query.lng === 'number' &&
    !Number.isNaN(query.lng);

  return hubs
    .map((hub) => {
      if (!hasOrigin) return hub;
      const distanceKm = calculateHaversineKm(query.lat!, query.lng!, hub.latitude, hub.longitude);
      return { ...hub, distanceKm };
    })
    .filter((hub) => {
      if (qNorm) {
        const hay = `${hub.name} ${hub.description || ''}`.toLowerCase();
        if (!hay.includes(qNorm)) return false;
      }
      if (
        hasOrigin &&
        typeof query.radiusKm === 'number' &&
        query.radiusKm > 0 &&
        (hub.distanceKm ?? 0) > query.radiusKm
      ) {
        return false;
      }
      if (query.hasAvailableVehicles && (hub.availableVehicles ?? 0) <= 0) {
        return false;
      }
      if (query.hasAvailableDocks && (hub.availableDocks ?? 0) <= 0) {
        return false;
      }
      if (query.hasAvailableCharging && (hub.availableChargingPorts ?? 0) <= 0) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (hasOrigin) {
        return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      }
      return a.name.localeCompare(b.name, 'vi');
    });
}

export function buildHubAlerts(
  enrichedHubs: Hub[],
  vehicles: Vehicle[],
  chargingPoints: ChargingPoint[],
): HubAlert[] {
  const alerts: HubAlert[] = [];
  const now = new Date().toISOString();

  for (const hub of enrichedHubs) {
    const availVehicles = hub.availableVehicles ?? 0;
    const availDocks = hub.availableDocks ?? 0;
    const chargingCount = hub.chargingVehicles ?? 0;
    const totalPorts = hub.totalChargingPorts || 1;
    const lowBatteryAtHub = vehicles.filter(
      (v) => v.hubId === hub.id && v.batterySoc < 20 && v.status === 'AVAILABLE',
    ).length;

    if (availVehicles <= 2) {
      alerts.push({
        id: `alert-low-${hub.id}`,
        hubId: hub.id,
        hubName: hub.name,
        severity: availVehicles === 0 ? 'CRITICAL' : 'WARNING',
        type: 'LOW_VEHICLES',
        message: `${hub.name} chỉ còn ${availVehicles} xe sẵn sàng, cần điều chuyển bổ sung.`,
        detectedAt: now,
      });
    }

    if (availDocks <= 2) {
      alerts.push({
        id: `alert-dock-${hub.id}`,
        hubId: hub.id,
        hubName: hub.name,
        severity: availDocks === 0 ? 'CRITICAL' : 'WARNING',
        type: 'HIGH_OCCUPANCY',
        message: `${hub.name} gần đầy bãi đỗ (còn ${availDocks} ô trống).`,
        detectedAt: now,
      });
    }

    const hubPortsInUse = chargingPoints.filter(
      (cp) => cp.hubId === hub.id && (cp.status === 'CHARGING' || cp.status === 'RESERVED'),
    ).length;
    const effectiveChargeLoad = Math.max(chargingCount, hubPortsInUse);
    if (effectiveChargeLoad >= Math.max(2, totalPorts - 1) || lowBatteryAtHub >= 2) {
      alerts.push({
        id: `alert-charge-${hub.id}`,
        hubId: hub.id,
        hubName: hub.name,
        severity: effectiveChargeLoad >= totalPorts ? 'CRITICAL' : 'WARNING',
        type: 'CHARGING_SURGE',
        message: `Nhu cầu sạc tại ${hub.name} tăng cao (${effectiveChargeLoad}/${totalPorts} trụ đang hoạt động).`,
        detectedAt: now,
      });
    }
  }

  return alerts;
}

export function computeMonitoringStats(
  hubs: Hub[],
  vehicles: Vehicle[],
  chargingPoints: ChargingPoint[],
  incidents: IncidentReport[],
): MonitoringStats {
  const totalHubs = hubs.length;
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const inUseVehicles = vehicles.filter((v) => v.status === 'IN_USE').length;
  const chargingVehicles = vehicles.filter((v) => v.status === 'CHARGING').length;
  const bookedVehicles = vehicles.filter((v) => v.status === 'BOOKED').length;
  const faultyVehicles = vehicles.filter(
    (v) => v.status === 'FAULTY' || v.status === 'UNDER_MAINTENANCE',
  ).length;
  const availableChargingPorts = chargingPoints.filter((cp) => cp.status === 'AVAILABLE').length;
  const activeIncidents = incidents.filter((inc) => inc.status !== 'RESOLVED').length;

  const healthyCount = totalVehicles - faultyVehicles;
  const networkHealth = totalVehicles > 0 ? Math.round((healthyCount / totalVehicles) * 100) : 100;

  return {
    totalHubs,
    totalVehicles,
    availableVehicles,
    inUseVehicles,
    chargingVehicles,
    bookedVehicles,
    faultyVehicles,
    availableChargingPorts,
    activeIncidents,
    networkHealth,
  };
}

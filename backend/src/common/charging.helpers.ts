import { ChargingPoint, ChargingSlotProposal, PrivateVehicle, Vehicle } from './types';

export function timeToMinutes(timeStr: string): number {
  const [hStr, mStr] = (timeStr || '08:00').split(':');
  const h = Math.min(23, Math.max(0, Number(hStr) || 0));
  const m = Math.min(59, Math.max(0, Number(mStr) || 0));
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculatePriorityScore(
  batterySoc: number,
  targetDepartureTime: string,
  baseMinutes = 7 * 60,
): number {
  const deficit = Math.max(0, 100 - batterySoc);
  const depMins = timeToMinutes(targetDepartureTime);
  const urgencyMinutes = Math.max(30, depMins - baseMinutes);
  const urgencyBoost = Math.round((180 / urgencyMinutes) * 20);
  return Math.round(deficit * 0.8 + urgencyBoost);
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

export function buildGreedyChargingPlan(
  hubId: string,
  vehicles: Vehicle[],
  chargingPoints: ChargingPoint[],
  excludedPortIds: string[] = [],
  departureOverrides: Record<string, string> = {},
): GreedyScheduleItem[] {
  const activePorts = chargingPoints.filter(
    (cp) =>
      cp.hubId === hubId &&
      cp.status !== 'MAINTENANCE' &&
      !excludedPortIds.includes(cp.id),
  );
  if (activePorts.length === 0) return [];

  const candidateVehicles = vehicles.filter(
    (v) =>
      v.hubId === hubId &&
      (v.status === 'AVAILABLE' || v.status === 'CHARGING') &&
      v.batterySoc < 85 &&
      !excludedPortIds.includes(v.id),
  );

  const scored = candidateVehicles
    .map((v, idx) => {
      const targetDep = departureOverrides[v.id] || minutesToTime(10 * 60 + (idx % 5) * 45);
      const priorityScore = calculatePriorityScore(v.batterySoc, targetDep);
      return { vehicle: v, targetDep, priorityScore };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const portCursor = new Map<string, number>();
  const now = new Date();
  const baseStartMins = Math.max(7 * 60, now.getHours() * 60 + now.getMinutes());
  activePorts.forEach((p) => portCursor.set(p.id, baseStartMins));

  const schedule: GreedyScheduleItem[] = [];

  for (const item of scored) {
    let bestPort = activePorts[0];
    let earliestTime = portCursor.get(bestPort.id) ?? baseStartMins;

    for (const port of activePorts) {
      const t = portCursor.get(port.id) ?? baseStartMins;
      if (t < earliestTime) {
        earliestTime = t;
        bestPort = port;
      }
    }

    const durationMins = Math.max(20, Math.round(((90 - item.vehicle.batterySoc) / bestPort.powerKw) * 18));
    const endMins = earliestTime + durationMins;
    portCursor.set(bestPort.id, endMins + 10);

    schedule.push({
      vehicleId: item.vehicle.id,
      plateNumber: item.vehicle.plateNumber,
      model: item.vehicle.model,
      currentSoc: item.vehicle.batterySoc,
      targetSoc: 90,
      targetDepartureTime: item.targetDep,
      priorityScore: item.priorityScore,
      chargingPointId: bestPort.id,
      chargingPointCode: bestPort.code,
      bayCode: bestPort.bayCode,
      startTime: minutesToTime(earliestTime),
      endTime: minutesToTime(endMins),
    });
  }

  return schedule;
}

export function generatePrivateSlotProposals(
  hubId: string,
  chargingPoints: ChargingPoint[],
  vehicle: PrivateVehicle | null,
  preferredStartTime: string,
  currentSoc: number,
  targetSoc: number,
): ChargingSlotProposal[] {
  const availableAtHub = chargingPoints.filter(
    (cp) => cp.hubId === hubId && cp.status === 'AVAILABLE',
  );
  const compatiblePoints = availableAtHub.filter((cp) => {
    if (!vehicle) return true;
    return cp.connectorType === vehicle.chargerType || cp.connectorType === 'UNIVERSAL';
  });

  const pointsToUse = compatiblePoints.length > 0 ? compatiblePoints : availableAtHub;

  const capacityKwh = vehicle?.batteryCapacityKwh || 2.8;
  const deltaSoc = Math.max(10, targetSoc - currentSoc);
  const energyNeededKwh = (capacityKwh * deltaSoc) / 100;
  const startBaseMins = timeToMinutes(preferredStartTime);

  return pointsToUse.slice(0, 4).map((cp, idx) => {
    const startMins = startBaseMins + idx * 15;
    const estHours = energyNeededKwh / Math.max(1.5, cp.powerKw);
    const estimatedMinutes = Math.max(20, Math.min(180, Math.round(estHours * 60)));
    const tariffPerKwh = cp.powerKw >= 10 ? 4500 : cp.powerKw >= 7 ? 4100 : 3800;
    const estimatedCostVnd = Math.round(energyNeededKwh * tariffPerKwh);

    return {
      chargingPointId: cp.id,
      chargingPointCode: cp.code,
      bayCode: cp.bayCode,
      connectorType: cp.connectorType,
      powerKw: cp.powerKw,
      startTime: minutesToTime(startMins),
      endTime: minutesToTime(startMins + estimatedMinutes),
      estimatedMinutes,
      estimatedCostVnd,
    };
  });
}

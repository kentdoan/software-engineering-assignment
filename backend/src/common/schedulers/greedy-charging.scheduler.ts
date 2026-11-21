import { ChargingPoint, GreedyScheduleItem, Vehicle } from '../interfaces';
import { minutesToTime } from '../utils/time.util';
import { calculatePriorityScore } from './priority-score.scheduler';

/**
 * Mục đích: Lập kế hoạch phân bổ các xe pin yếu vào các trụ sạc tại một trạm Hub theo thuật toán tham lam ưu tiên.
 * Cách hoạt động: Lọc các trụ sạc không bảo trì (trừ các trụ bị loại trừ thủ công) và các xe tại trạm có pin dưới 85%, chấm điểm ưu tiên từng xe rồi sắp xếp giảm dần; với mỗi xe, chọn trụ sạc có mốc thời gian rảnh sớm nhất để gán lịch sạc đến mức 90% pin và tịnh tiến con trỏ thời gian của trụ đó thêm 10 phút nghỉ.
 */
export function runHeuristicGreedyMatch(
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

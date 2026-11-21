import { ChargingPoint, ChargingSlotProposal, PrivateVehicle } from '../interfaces';
import { minutesToTime, timeToMinutes } from '../utils/time.util';

/**
 * Mục đích: Đề xuất tối đa 4 khung giờ và trụ sạc phù hợp cho phương tiện điện cá nhân của sinh viên tại một trạm Hub.
 * Cách hoạt động: Ưu tiên lọc các trụ sạc đang trống và tương thích chuẩn đầu cắm với xe cá nhân (hoặc đầu cắm UNIVERSAL), tính lượng điện kWh cần nạp dựa trên mức pin mục tiêu để suy ra thời gian sạc và chi phí ước tính cho từng phương án.
 */
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

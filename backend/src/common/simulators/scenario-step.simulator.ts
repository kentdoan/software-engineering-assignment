import { Hub, Scenario, SimRuntimeState, SimulationTickOutcome, Vehicle } from '../interfaces';
import { generateRecommendations } from './what-if-advisor.simulator';

/**
 * Mục đích: Thực thi một bước tiến của kịch bản mô phỏng giả định và ghi nhận danh sách phương tiện bị thay đổi trạng thái.
 * Cách hoạt động: Tăng bước hiện tại lên 1, tính số lượt biến động dựa trên cường độ kịch bản và hệ số hành khách, rồi mô phỏng một trong ba tình huống VEHICLE_DRAIN (rút xe), DOCK_OVERFLOW (dồn trả xe) hoặc CHARGE_SURGE (tăng đột biến xe vào sạc); sau đó ghi nhật ký cảnh báo nếu vượt ngưỡng, cập nhật khuyến nghị điều phối và đánh dấu hoàn tất khi đủ số bước.
 */
export function computeSimulationStepChanges(
  state: SimRuntimeState,
  scenario: Scenario,
  hubs: Hub[],
  vehicles: Vehicle[],
): SimulationTickOutcome {
  state.currentStep += 1;
  const targetHub = hubs.find((h) => h.id === scenario.targetHubId);
  const otherHubs = hubs.filter((h) => h.id !== scenario.targetHubId);
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const intensityMultiplier = state.passengerMultiplier || 1;
  const stepsCount = Math.max(1, Math.round((scenario.intensity / 6) * intensityMultiplier));
  const modifiedVehicles: Vehicle[] = [];

  if (scenario.actionType === 'VEHICLE_DRAIN' && targetHub && otherHubs.length > 0) {
    const availAtTarget = vehicles.filter((v) => v.hubId === targetHub.id && v.status === 'AVAILABLE');
    const toMove = Math.min(stepsCount, availAtTarget.length);
    for (let i = 0; i < toMove; i++) {
      const v = availAtTarget[i];
      const destHub = otherHubs[Math.floor(Math.random() * otherHubs.length)];
      v.hubId = destHub.id;
      v.batterySoc = Math.max(15, v.batterySoc - 10);
      modifiedVehicles.push(v);
    }

    const remaining = vehicles.filter((v) => v.hubId === targetHub.id && v.status === 'AVAILABLE').length;
    state.logs.unshift(
      `[${timestamp}] Bước ${state.currentStep}: ${toMove} sinh viên nhận xe từ ${targetHub.name}. Xe còn lại: ${remaining}.`,
    );
    if (remaining <= scenario.warningThreshold) {
      state.logs.unshift(
        `[CẢNH BÁO] ${targetHub.name} sắp cạn kiệt xe (${remaining} <= ngưỡng ${scenario.warningThreshold}).`,
      );
    }
  } else if (scenario.actionType === 'DOCK_OVERFLOW' && targetHub && otherHubs.length > 0) {
    const dockedAtTarget = vehicles.filter((v) => v.hubId === targetHub.id);
    const freeDocks = Math.max(0, targetHub.totalDocks - dockedAtTarget.length);
    const availElsewhere = vehicles.filter((v) => v.hubId !== targetHub.id && v.status === 'AVAILABLE');
    const toMove = Math.min(stepsCount, availElsewhere.length, freeDocks);
    for (let i = 0; i < toMove; i++) {
      const v = availElsewhere[i];
      v.hubId = targetHub.id;
      v.batterySoc = Math.max(10, v.batterySoc - 12);
      modifiedVehicles.push(v);
    }

    const newFreeDocks = Math.max(0, targetHub.totalDocks - vehicles.filter((v) => v.hubId === targetHub.id).length);
    state.logs.unshift(
      `[${timestamp}] Bước ${state.currentStep}: ${toMove} lượt trả xe đổ về ${targetHub.name}. Ô đỗ trống: ${newFreeDocks}.`,
    );
    if (newFreeDocks <= scenario.warningThreshold) {
      state.logs.unshift(
        `[CẢNH BÁO] ${targetHub.name} sắp đầy bãi đỗ (còn ${newFreeDocks} ô trống).`,
      );
    }
  } else if (scenario.actionType === 'CHARGE_SURGE' && targetHub) {
    const lowBat = vehicles.filter((v) => v.hubId === targetHub.id && v.status === 'AVAILABLE');
    const toCharge = Math.min(stepsCount, lowBat.length);
    for (let i = 0; i < toCharge; i++) {
      lowBat[i].batterySoc = Math.max(12, Math.floor(Math.random() * 18) + 8);
      lowBat[i].status = 'CHARGING';
      modifiedVehicles.push(lowBat[i]);
    }

    const totalCharging = vehicles.filter((v) => v.hubId === targetHub.id && v.status === 'CHARGING').length;
    state.logs.unshift(
      `[${timestamp}] Bước ${state.currentStep}: ${toCharge} xe pin thấp vào sạc tại ${targetHub.name}. Trụ sạc đang dùng: ${totalCharging}/${targetHub.totalChargingPorts}.`,
    );
    if (totalCharging >= scenario.warningThreshold) {
      state.logs.unshift(
        `[CẢNH BÁO] Quá tải trụ sạc tại ${targetHub.name} (${totalCharging}/${targetHub.totalChargingPorts}).`,
      );
    }
  }

  state.recommendations = generateRecommendations(hubs, vehicles, state.activeScenarioId);

  if (state.logs.length > 40) {
    state.logs = state.logs.slice(0, 40);
  }

  const completed = state.currentStep >= state.totalSteps;
  if (completed) {
    state.isRunning = false;
    state.logs.unshift(`[${timestamp}] Hoàn tất chu kỳ mô phỏng (${state.totalSteps} bước).`);
  }

  return { modifiedVehicles, completed };
}

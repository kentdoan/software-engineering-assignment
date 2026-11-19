import { generateId } from './id.helpers';
import { Hub, Scenario, SimulationStatus, Vehicle, WhatIfRecommendation } from './types';

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

export function createInitialSimState(): SimRuntimeState {
  return {
    isRunning: false,
    activeScenarioId: null,
    speed: 1,
    passengerMultiplier: 1,
    currentStep: 0,
    totalSteps: 20,
    logs: [],
    recommendations: [],
    timer: null,
    preSimVehiclesSnapshot: null,
  };
}

export function toSimulationStatusDto(state: SimRuntimeState): SimulationStatus {
  return {
    isRunning: state.isRunning,
    activeScenarioId: state.activeScenarioId,
    speed: state.speed,
    passengerMultiplier: state.passengerMultiplier,
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    logs: state.logs,
    recommendations: state.recommendations,
  };
}

export function buildWhatIfRecommendations(
  hubs: Hub[],
  vehicles: Vehicle[],
  activeScenarioId?: string | null,
): WhatIfRecommendation[] {
  const surplusHubs: { hub: Hub; available: Vehicle[] }[] = [];
  const deficitHubs: { hub: Hub; count: number }[] = [];

  for (const hub of hubs) {
    const avail = vehicles.filter((v) => v.hubId === hub.id && v.status === 'AVAILABLE' && v.batterySoc >= 35);
    if (avail.length >= 6) {
      surplusHubs.push({ hub, available: avail.sort((a, b) => b.batterySoc - a.batterySoc) });
    } else if (avail.length <= 2) {
      deficitHubs.push({ hub, count: avail.length });
    }
  }

  const recommendations: WhatIfRecommendation[] = [];

  for (const deficit of deficitHubs) {
    const source = surplusHubs.find((s) => s.available.length >= 4 && s.hub.id !== deficit.hub.id);
    if (!source) continue;

    const needed = Math.min(3, Math.max(1, 3 - deficit.count));
    const picked = source.available.splice(0, needed);
    recommendations.push({
      id: generateId('rec'),
      sourceHubId: source.hub.id,
      sourceHubName: source.hub.name,
      targetHubId: deficit.hub.id,
      targetHubName: deficit.hub.name,
      recommendedVehicleCount: picked.length,
      vehicleIds: picked.map((v) => v.id),
      reason:
        activeScenarioId === 'METRO_PEAK_HOUR'
          ? `Bù đắp thiếu hụt giờ cao điểm tại ${deficit.hub.name} (còn ${deficit.count} xe)`
          : `Cân bằng mạng lưới: chuyển ${picked.length} xe pin cao từ ${source.hub.name} về ${deficit.hub.name}`,
    });
  }

  if (recommendations.length === 0 && hubs.length >= 2) {
    const sorted = [...hubs]
      .map((hub) => ({
        hub,
        avail: vehicles.filter((v) => v.hubId === hub.id && v.status === 'AVAILABLE'),
      }))
      .sort((a, b) => b.avail.length - a.avail.length);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    if (top && bottom && top.hub.id !== bottom.hub.id && top.avail.length > bottom.avail.length + 1) {
      const picked = top.avail.slice(0, 2);
      recommendations.push({
        id: generateId('rec'),
        sourceHubId: top.hub.id,
        sourceHubName: top.hub.name,
        targetHubId: bottom.hub.id,
        targetHubName: bottom.hub.name,
        recommendedVehicleCount: picked.length,
        vehicleIds: picked.map((v) => v.id),
        reason: `Tối ưu phân bổ xe từ trạm dư thừa (${top.hub.name}) sang trạm thấp nhất (${bottom.hub.name}).`,
      });
    }
  }

  return recommendations;
}

export interface SimulationTickOutcome {
  modifiedVehicles: Vehicle[];
  completed: boolean;
}

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

  state.recommendations = buildWhatIfRecommendations(hubs, vehicles, state.activeScenarioId);

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

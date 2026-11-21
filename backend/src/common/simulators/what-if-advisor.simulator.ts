import { Hub, Vehicle, WhatIfRecommendation } from '../interfaces';
import { generateId } from '../utils/id-generator.util';

/**
 * Mục đích: Phân tích phân bố xe hiện tại trên mạng lưới để sinh các khuyến nghị điều chuyển cân bằng giữa các trạm Hub.
 * Cách hoạt động: Phân loại các trạm dư thừa (từ 6 xe sẵn sàng pin từ 35% trở lên) và các trạm thiếu hụt (từ 2 xe sẵn sàng trở xuống) để ghép cặp đề xuất chuyển 1 đến 3 xe; nếu chưa có cặp nào vượt ngưỡng thì đề xuất tối ưu từ trạm nhiều xe nhất sang trạm ít xe nhất.
 */
export function generateRecommendations(
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

import React, { useCallback, useEffect, useState } from 'react';
import { ChargingPortSelector } from '../../components/operator/ChargingPortSelector';
import { GreedyScheduleTable } from '../../components/operator/GreedyScheduleTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { chargingApi } from '../../services/charging.api';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { ChargingPoint, GreedyScheduleItem } from '../../types/charging.types';
import { Hub } from '../../types/hub.types';

interface OperatorChargingPageProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Lập lịch sạc thông minh tính toán độ ưu tiên phương tiện pin thấp và phân bổ vào các trụ sạc trống.
 */
export const OperatorChargingPage: React.FC<OperatorChargingPageProps> = ({ notify }) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [hubId, setHubId] = useState('hub-01');
  const [points, setPoints] = useState<ChargingPoint[]>([]);
  const [plan, setPlan] = useState<GreedyScheduleItem[]>([]);
  const [excludedPortIds, setExcludedPortIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPlan = useCallback(
    async (targetHub = hubId, excluded = excludedPortIds) => {
      try {
        const res = await chargingApi.getPriorityPlan(targetHub, excluded);
        setPoints(res.chargingPoints);
        setPlan(res.proposedPlan);
      } catch (err) {
        notify('error', getErrorMessage(err));
      }
    },
    [hubId, excludedPortIds, notify],
  );

  useEffect(() => {
    hubsApi.getAll().then(setHubs).catch(() => {});
  }, []);

  useEffect(() => {
    void loadPlan(hubId, excludedPortIds);
  }, [hubId, excludedPortIds, loadPlan]);

  const toggleExcludePort = (portId: string) => {
    setExcludedPortIds((prev) =>
      prev.includes(portId) ? prev.filter((id) => id !== portId) : [...prev, portId],
    );
  };

  const handleApplySchedule = async () => {
    setLoading(true);
    try {
      const res = await chargingApi.applySmartSchedule({
        hubId,
        excludedPortIds,
      });
      notify('success', res.message);
      await loadPlan(hubId, excludedPortIds);
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lập lịch Sạc thông minh"
        description="Thuật toán tham lam sắp xếp xe pin thấp theo điểm ưu tiên, loại trừ trụ bảo trì và phân bổ tối ưu vào trụ sạc trống"
        action={
          <select
            aria-label="Chọn Hub lập lịch sạc"
            value={hubId}
            onChange={(e) => {
              setHubId(e.target.value);
              setExcludedPortIds([]);
            }}
            className="rounded-full border border-[#dfe5e1] bg-white px-4 py-2 text-xs font-bold text-[#1b211e] outline-none focus:border-[#006a4e]"
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        }
      />

      <ChargingPortSelector
        points={points}
        excludedPortIds={excludedPortIds}
        onToggleExcludePort={toggleExcludePort}
      />

      <GreedyScheduleTable
        plan={plan}
        loading={loading}
        onApplySchedule={() => void handleApplySchedule()}
      />
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { BatteryCharging, CheckCircle2, Zap } from 'lucide-react';
import { chargingApi, getErrorMessage, hubsApi } from '../../services/api';
import { ChargingPoint, GreedyScheduleItem, Hub } from '../../types';
import { renderChargingPointBadge, StatusBadge } from '../ui/Badges';

interface OperatorChargingViewProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const OperatorChargingView: React.FC<OperatorChargingViewProps> = ({ notify }) => {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1b211e]">Lập lịch Sạc thông minh</h2>
          <p className="mt-1 text-sm text-[#59645e]">
            Thuật toán tham lam sắp xếp xe pin thấp theo điểm ưu tiên, loại trừ trụ bảo trì và phân bổ tối ưu vào trụ sạc trống
          </p>
        </div>

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
      </div>

      {/* Charging Points Row (Allows toggling temporary exclusion) */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
            <Zap className="h-4 w-4 text-[#006a4e]" />
            <span>Trạng thái trụ sạc tại trạm (Nhấp để tạm loại trừ khỏi thuật toán)</span>
          </h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {points.map((pt) => {
            const isMaint = pt.status === 'MAINTENANCE';
            const isManualExcluded = !isMaint && excludedPortIds.includes(pt.id);
            const isExcluded = isMaint || isManualExcluded;
            return (
              <button
                key={pt.id}
                type="button"
                disabled={isMaint}
                onClick={() => toggleExcludePort(pt.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  isExcluded
                    ? 'border-rose-200 bg-rose-50/70 opacity-75'
                    : 'border-[#dfe5e1] bg-[#f8f9fa] hover:border-[#006a4e]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-[#1b211e]">{pt.code}</span>
                  <span className="text-[10px] font-bold text-[#006a4e]">{pt.powerKw}kW</span>
                </div>
                <p className="mt-1 text-[11px] text-[#59645e]">{pt.connectorType}</p>
                <div className="mt-2">
                  {isManualExcluded ? (
                    <StatusBadge variant="danger">Tạm loại trừ</StatusBadge>
                  ) : (
                    renderChargingPointBadge(pt.status)
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Greedy Proposed Schedule Table */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
              <BatteryCharging className="h-4 w-4 text-[#006a4e]" />
              <span>Bảng phương án phân bổ sạc đề xuất ({plan.length} xe)</span>
            </h3>
            <p className="mt-0.5 text-xs text-[#59645e]">
              Thứ tự ưu tiên tính theo mức hao hụt pin và khung giờ xuất bến kế tiếp
            </p>
          </div>
          <button
            type="button"
            disabled={loading || plan.length === 0}
            onClick={handleApplySchedule}
            className="inline-flex items-center gap-2 rounded-full bg-[#006a4e] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{loading ? 'Đang áp dụng...' : 'Áp dụng lịch sạc thông minh'}</span>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
                <th className="px-3 py-2.5 font-bold">Biển số</th>
                <th className="px-3 py-2.5 font-bold">Pin hiện tại</th>
                <th className="px-3 py-2.5 font-bold">Điểm ưu tiên</th>
                <th className="px-3 py-2.5 font-bold">Trụ / Ô sạc gán</th>
                <th className="px-3 py-2.5 font-bold">Khung giờ sạc dự kiến</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe5e1]">
              {plan.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[#59645e]">
                    Không có xe nào dưới 85% pin cần lập lịch tại Hub này.
                  </td>
                </tr>
              ) : (
                plan.map((row) => (
                  <tr key={row.vehicleId}>
                    <td className="px-3 py-2.5 font-bold text-[#1b211e]">
                      {row.plateNumber} <span className="font-normal text-[#59645e]">({row.model})</span>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-amber-700">{row.currentSoc}% → {row.targetSoc}%</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant="emerald">{row.priorityScore} điểm</StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-[#006a4e]">
                      {row.chargingPointCode} ({row.bayCode})
                    </td>
                    <td className="px-3 py-2.5 text-[#59645e]">
                      {row.startTime} - {row.endTime}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

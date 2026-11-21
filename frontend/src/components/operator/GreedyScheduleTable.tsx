import React from 'react';
import { BatteryCharging, CheckCircle2 } from 'lucide-react';
import { GreedyScheduleItem } from '../../types/charging.types';
import { StatusBadge } from '../ui/Badges';

interface GreedyScheduleTableProps {
  plan: GreedyScheduleItem[];
  loading: boolean;
  onApplySchedule: () => void;
}

/**
 * Mục đích: Hiển thị bảng phương án phân bổ sạc tham lam đề xuất kèm nút áp dụng lịch sạc thông minh.
 */
export const GreedyScheduleTable: React.FC<GreedyScheduleTableProps> = ({
  plan,
  loading,
  onApplySchedule,
}) => (
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
        onClick={onApplySchedule}
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
                <td className="px-3 py-2.5 font-bold text-amber-700">
                  {row.currentSoc}% → {row.targetSoc}%
                </td>
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
);

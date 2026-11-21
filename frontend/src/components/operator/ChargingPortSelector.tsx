import React from 'react';
import { Zap } from 'lucide-react';
import { ChargingPoint } from '../../types/charging.types';
import { renderChargingPointBadge, StatusBadge } from '../ui/Badges';

interface ChargingPortSelectorProps {
  points: ChargingPoint[];
  excludedPortIds: string[];
  onToggleExcludePort: (portId: string) => void;
}

/**
 * Mục đích: Hiển thị lưới trụ sạc tại trạm để nhân viên vận hành xem trạng thái và nhấp tạm loại trừ trụ khỏi thuật toán lập lịch.
 */
export const ChargingPortSelector: React.FC<ChargingPortSelectorProps> = ({
  points,
  excludedPortIds,
  onToggleExcludePort,
}) => (
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
            onClick={() => onToggleExcludePort(pt.id)}
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
);

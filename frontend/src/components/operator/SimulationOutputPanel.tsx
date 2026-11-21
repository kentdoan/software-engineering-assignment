import React from 'react';
import { ArrowRightLeft, Sparkles } from 'lucide-react';
import { SimulationStatus, WhatIfRecommendation } from '../../types/operations.types';

interface SimulationOutputPanelProps {
  status: SimulationStatus | null;
  onApplyRecommendation: (rec: WhatIfRecommendation) => void;
}

/**
 * Mục đích: Hiển thị thanh tiến trình mô phỏng, nhật ký sự kiện thời gian thực và các khuyến nghị điều phối tự động.
 */
export const SimulationOutputPanel: React.FC<SimulationOutputPanelProps> = ({
  status,
  onApplyRecommendation,
}) => {
  const pct = status ? Math.round((status.currentStep / status.totalSteps) * 100) : 0;

  return (
    <div className="space-y-4 lg:col-span-7">
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-[#1b211e]">
          <span>Tiến trình mô phỏng</span>
          <span className="text-[#006a4e]">
            Bước {status?.currentStep ?? 0} / {status?.totalSteps ?? 20} ({pct}%)
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#e9efec]">
          <div
            className="h-full rounded-full bg-[#006a4e] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 h-[210px] overflow-y-auto rounded-2xl border border-[#dfe5e1] bg-[#1b211e] p-4 font-mono text-[11px] leading-relaxed text-[#ccebdd]">
          {(status?.logs || []).length === 0 ? (
            <span className="text-[#87938c]">
              Nhấn "Chạy mô phỏng" để quan sát diễn biến kịch bản theo từng bước thời gian...
            </span>
          ) : (
            status?.logs.map((line, i) => (
              <div key={i} className={line.includes('[CẢNH BÁO]') ? 'font-bold text-amber-300' : ''}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-[#ccebdd] bg-[#e6f5ee] p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-[#00513b]">
          <Sparkles className="h-4 w-4" />
          <span>Khuyến nghị điều phối tự động</span>
        </h3>
        <div className="mt-3 space-y-2.5">
          {(status?.recommendations || []).length === 0 ? (
            <p className="text-xs text-[#00513b]">
              Phân bố phương tiện hiện tại ở mức ổn định, chưa cần điều phối khẩn cấp.
            </p>
          ) : (
            status?.recommendations?.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 shadow-sm"
              >
                <div>
                  <p className="text-xs font-bold text-[#1b211e]">
                    {rec.sourceHubName} → {rec.targetHubName} ({rec.recommendedVehicleCount} xe)
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#59645e]">{rec.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyRecommendation(rec)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#006a4e] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#00513b]"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Tạo lệnh ngay
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

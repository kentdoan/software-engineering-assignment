import React from 'react';
import { AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { HubAlert } from '../../types/operations.types';

interface HubAlertsPanelProps {
  alerts: HubAlert[];
  onGoToDispatch: (targetHubId?: string) => void;
}

/**
 * Mục đích: Hiển thị danh sách cảnh báo mất cân bằng tải tại các trạm Hub kèm nút chuyển nhanh sang tạo lệnh điều phối.
 */
export const HubAlertsPanel: React.FC<HubAlertsPanelProps> = ({ alerts, onGoToDispatch }) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm lg:col-span-5">
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span>Cảnh báo mất cân bằng tải</span>
      </h3>
      <span className="rounded-full bg-[#e9efec] px-2.5 py-0.5 text-xs font-bold text-[#59645e]">
        {alerts.length}
      </span>
    </div>

    <div className="mt-4 space-y-3">
      {alerts.length === 0 ? (
        <div className="rounded-2xl bg-[#e6f5ee] p-6 text-center text-xs font-medium text-[#00513b]">
          Mạng lưới 6 trạm đang ở trạng thái cân bằng tối ưu, chưa phát sinh cảnh báo.
        </div>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-2xl border p-4 ${
              alert.severity === 'CRITICAL'
                ? 'border-rose-200 bg-rose-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`text-[11px] font-bold uppercase ${
                  alert.severity === 'CRITICAL' ? 'text-rose-800' : 'text-amber-800'
                }`}
              >
                {alert.hubName}
              </span>
              <span className="text-[10px] font-bold text-[#59645e]">{alert.type}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#1b211e]">{alert.message}</p>
            <button
              type="button"
              onClick={() => onGoToDispatch(alert.hubId)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#006a4e] shadow-sm hover:bg-[#e6f5ee]"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Điều phối xe ngay</span>
            </button>
          </div>
        ))
      )}
    </div>
  </div>
);

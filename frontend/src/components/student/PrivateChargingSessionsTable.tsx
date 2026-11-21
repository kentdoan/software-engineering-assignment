import React from 'react';
import { BatteryCharging, XCircle } from 'lucide-react';
import { ChargingSession } from '../../types/charging.types';
import { StatusBadge } from '../ui/Badges';

interface PrivateChargingSessionsTableProps {
  sessions: ChargingSession[];
  onCancelSession: (id: string) => void;
}

/**
 * Mục đích: Hiển thị bảng danh sách các lịch sạc xe điện cá nhân đã đặt của sinh viên và nút hủy lịch.
 */
export const PrivateChargingSessionsTable: React.FC<PrivateChargingSessionsTableProps> = ({
  sessions,
  onCancelSession,
}) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
    <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
      <BatteryCharging className="h-4 w-4 text-[#006a4e]" />
      <span>Lịch sạc cá nhân đã đặt</span>
    </h3>

    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
            <th className="px-3 py-2.5 font-bold">Mã lịch</th>
            <th className="px-3 py-2.5 font-bold">Phương tiện</th>
            <th className="px-3 py-2.5 font-bold">Trụ / Ô sạc</th>
            <th className="px-3 py-2.5 font-bold">Thời gian</th>
            <th className="px-3 py-2.5 font-bold">Trạng thái</th>
            <th className="px-3 py-2.5 font-bold text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#dfe5e1]">
          {sessions.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-[#59645e]">
                Chưa có lịch đặt sạc cá nhân nào.
              </td>
            </tr>
          ) : (
            sessions.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2.5 font-bold text-[#1b211e]">{s.code}</td>
                <td className="px-3 py-2.5 text-[#59645e]">{s.vehicleLabel}</td>
                <td className="px-3 py-2.5 font-medium text-[#006a4e]">
                  {s.chargingPointCode} ({s.bayCode})
                </td>
                <td className="px-3 py-2.5 text-[#59645e]">
                  {s.date} · {s.startTime} - {s.endTime}
                </td>
                <td className="px-3 py-2.5">
                  {s.status === 'SCHEDULED' && <StatusBadge variant="info">Đã đặt lịch</StatusBadge>}
                  {s.status === 'CHARGING' && <StatusBadge variant="warning">Đang sạc</StatusBadge>}
                  {s.status === 'CANCELLED' && <StatusBadge variant="neutral">Đã hủy</StatusBadge>}
                  {s.status === 'COMPLETED' && <StatusBadge variant="success">Hoàn tất</StatusBadge>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {s.status === 'SCHEDULED' && (
                    <button
                      type="button"
                      onClick={() => onCancelSession(s.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Hủy
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

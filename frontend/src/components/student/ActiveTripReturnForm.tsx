import React from 'react';
import { AlertTriangle, BatteryCharging, Clock } from 'lucide-react';
import { Hub } from '../../types/hub.types';
import { Rental } from '../../types/rental.types';

interface ActiveTripReturnFormProps {
  activeRental: Rental | null;
  hubs: Hub[];
  destHubId: string;
  damagedReported: boolean;
  damageNote: string;
  elapsedSeconds: number;
  submitting: boolean;
  onChangeDestHubId: (hubId: string) => void;
  onChangeDamagedReported: (checked: boolean) => void;
  onChangeDamageNote: (note: string) => void;
  onSubmitReturn: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Hiển thị đồng hồ đếm thời gian chuyến đi đang diễn ra cùng biểu mẫu chọn trạm trả xe và báo cáo hư hỏng.
 */
export const ActiveTripReturnForm: React.FC<ActiveTripReturnFormProps> = ({
  activeRental,
  hubs,
  destHubId,
  damagedReported,
  damageNote,
  elapsedSeconds,
  submitting,
  onChangeDestHubId,
  onChangeDamagedReported,
  onChangeDamageNote,
  onSubmitReturn,
}) => {
  if (!activeRental) {
    return (
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-bold text-[#1b211e]">Hiện không có chuyến đi nào đang chạy</p>
        <p className="mt-1 text-xs text-[#59645e]">
          Chọn "Khám phá & Đặt xe" hoặc "Nhận xe & QR" để bắt đầu hành trình xanh tiếp theo.
        </p>
      </div>
    );
  }

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="rounded-3xl border border-[#006a4e] bg-white p-6 shadow-sm lg:col-span-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccebdd] px-3 py-1 text-xs font-bold text-[#00513b]">
          <Clock className="h-3.5 w-3.5" /> Chuyến đi đang diễn ra
        </span>
        <h3 className="mt-4 text-2xl font-bold text-[#1b211e]">
          {activeRental.vehicle?.plateNumber || activeRental.vehicleId}
        </h3>
        <p className="text-xs text-[#59645e]">
          {activeRental.vehicle?.model} · Xuất phát từ {activeRental.originHub?.name}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-[#f8f9fa] p-4">
          <div>
            <p className="text-[11px] font-medium text-[#59645e]">Thời gian</p>
            <p className="mt-1 text-xl font-bold text-[#006a4e]">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#59645e]">Mức pin hiện tại</p>
            <p className="mt-1 flex items-center gap-1 text-xl font-bold text-[#1b211e]">
              <BatteryCharging className="h-5 w-5 text-[#006a4e]" />
              {activeRental.vehicle?.batterySoc ?? '--'}%
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={onSubmitReturn}
        className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7"
      >
        <h3 className="text-lg font-bold text-[#1b211e]">Xác nhận trả xe tại trạm</h3>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#1b211e]">Chọn Hub trả xe</label>
          <select
            value={destHubId}
            onChange={(e) => onChangeDestHubId(e.target.value)}
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id} disabled={(h.availableDocks ?? 0) <= 0}>
                {h.name} (Còn {h.availableDocks ?? 0} ô đỗ trống)
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-3.5 text-xs font-medium text-[#1b211e]">
          <input
            type="checkbox"
            checked={damagedReported}
            onChange={(e) => onChangeDamagedReported(e.target.checked)}
            className="h-4 w-4 accent-[#006a4e]"
          />
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>Báo cáo xe có hư hỏng hoặc bất thường kỹ thuật sau chuyến đi</span>
        </label>

        {damagedReported && (
          <textarea
            rows={2}
            value={damageNote}
            onChange={(e) => onChangeDamageNote(e.target.value)}
            placeholder="Mô tả ngắn tình trạng hư hỏng (phanh, lốp, đèn, khóa...)"
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2 text-sm outline-none focus:border-[#006a4e]"
          />
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#006a4e] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-60"
        >
          {submitting ? 'Đang xử lý trả xe...' : 'Hoàn tất trả xe & Thanh toán'}
        </button>
      </form>
    </div>
  );
};

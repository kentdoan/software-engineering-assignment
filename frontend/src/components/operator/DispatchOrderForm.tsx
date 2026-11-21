import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Hub } from '../../types/hub.types';

interface DispatchOrderFormProps {
  hubs: Hub[];
  sourceHubId: string;
  targetHubId: string;
  selectedVehicleIds: string[];
  note: string;
  submitting: boolean;
  onChangeSourceHubId: (hubId: string) => void;
  onChangeTargetHubId: (hubId: string) => void;
  onToggleVehicle: (vehicleId: string) => void;
  onChangeNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Biểu mẫu tạo lệnh điều chuyển phương tiện từ trạm nguồn sang trạm đích kèm lựa chọn xe khả dụng.
 */
export const DispatchOrderForm: React.FC<DispatchOrderFormProps> = ({
  hubs,
  sourceHubId,
  targetHubId,
  selectedVehicleIds,
  note,
  submitting,
  onChangeSourceHubId,
  onChangeTargetHubId,
  onToggleVehicle,
  onChangeNote,
  onSubmit,
}) => {
  const sourceHub = hubs.find((h) => h.id === sourceHubId);
  const targetHub = hubs.find((h) => h.id === targetHubId);
  const movableVehicles = (sourceHub?.vehicles || []).filter((v) => v.status === 'AVAILABLE');

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-6"
    >
      <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
        <ArrowRightLeft className="h-4 w-4 text-[#006a4e]" />
        <span>Tạo lệnh điều chuyển mới</span>
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trạm nguồn (Chuyển đi)</label>
          <select
            value={sourceHubId}
            onChange={(e) => onChangeSourceHubId(e.target.value)}
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2.5 text-xs font-medium outline-none focus:border-[#006a4e]"
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.availableVehicles ?? 0} xe sẵn sàng)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trạm đích (Tiếp nhận)</label>
          <select
            value={targetHubId}
            onChange={(e) => onChangeTargetHubId(e.target.value)}
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2.5 text-xs font-medium outline-none focus:border-[#006a4e]"
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} (Còn {h.availableDocks ?? 0} ô trống)
              </option>
            ))}
          </select>
        </div>
      </div>

      {targetHub && (
        <p className="rounded-xl bg-[#e6f5ee] px-3.5 py-2 text-xs text-[#00513b]">
          Sức chứa còn trống tại <strong>{targetHub.name}</strong>: <strong>{targetHub.availableDocks ?? 0}</strong> ô đỗ.
        </p>
      )}

      <div>
        <p className="mb-2 text-xs font-bold text-[#1b211e]">
          Chọn phương tiện cần điều chuyển ({selectedVehicleIds.length} đã chọn)
        </p>
        <div className="grid max-h-[210px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {movableVehicles.map((v) => {
            const checked = selectedVehicleIds.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onToggleVehicle(v.id)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                  checked
                    ? 'border-[#006a4e] bg-[#ccebdd] text-[#00513b]'
                    : 'border-[#dfe5e1] bg-[#f8f9fa] text-[#1b211e]'
                }`}
              >
                <span className="font-bold">{v.plateNumber}</span>
                <span className="text-[11px] opacity-85">{v.batterySoc}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <input
        value={note}
        onChange={(e) => onChangeNote(e.target.value)}
        placeholder="Ghi chú vận hành (VD: Bổ sung giờ cao điểm)"
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
      />

      <button
        type="submit"
        disabled={submitting || selectedVehicleIds.length === 0}
        className="w-full rounded-full bg-[#006a4e] py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-50"
      >
        {submitting ? 'Đang tạo lệnh...' : 'Phát hành lệnh điều phối'}
      </button>
    </form>
  );
};

import React from 'react';
import { BatteryCharging, QrCode, Unlock } from 'lucide-react';
import { Hub } from '../../types/hub.types';
import { Rental } from '../../types/rental.types';

interface DirectQrPickupPanelProps {
  hubs: Hub[];
  selectedHubId: string;
  qrInput: string;
  activeRental: Rental | null;
  loading: boolean;
  onSelectHubId: (hubId: string) => void;
  onChangeQrInput: (value: string) => void;
  onSubmitQr: (e: React.FormEvent) => void;
  onPickupByQrOrVehicle: (payload: { qrCode?: string; vehicleId?: string }) => void;
}

/**
 * Mục đích: Cung cấp khung nhập mã QR trên xe và danh sách xe sẵn sàng theo trạm để sinh viên quét nhận xe trực tiếp.
 */
export const DirectQrPickupPanel: React.FC<DirectQrPickupPanelProps> = ({
  hubs,
  selectedHubId,
  qrInput,
  activeRental,
  loading,
  onSelectHubId,
  onChangeQrInput,
  onSubmitQr,
  onPickupByQrOrVehicle,
}) => {
  const currentHub = hubs.find((h) => h.id === selectedHubId);
  const directCandidates = (currentHub?.vehicles || []).filter((v) => v.status === 'AVAILABLE');

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Biểu mẫu nhập hoặc quét mã QR */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-5">
        <div className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
          <QrCode className="h-5 w-5 text-[#006a4e]" />
          <span>Nhập / Quét mã QR trên xe</span>
        </div>
        <p className="mt-1 text-xs text-[#59645e]">
          Nhập mã QR (ví dụ: QR-59-EM01) hoặc chọn nhanh xe ở trạm bên phải để mô phỏng quét mã.
        </p>

        <form onSubmit={onSubmitQr} className="mt-4 space-y-3">
          <input
            required
            value={qrInput}
            onChange={(e) => onChangeQrInput(e.target.value)}
            placeholder="Nhập mã QR hoặc biển số (VD: QR-59-EM01)"
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || Boolean(activeRental)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#006a4e] py-2.5 text-sm font-bold text-white hover:bg-[#00513b] disabled:opacity-50"
          >
            <Unlock className="h-4 w-4" />
            <span>Mở khóa bằng mã QR</span>
          </button>
        </form>
      </div>

      {/* Chọn nhanh xe trực tiếp tại trạm */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#1b211e]">Nhận xe trực tiếp tại trạm</h3>
          <select
            aria-label="Chọn Hub nhận xe"
            value={selectedHubId}
            onChange={(e) => onSelectHubId(e.target.value)}
            className="rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-1.5 text-xs font-medium outline-none focus:border-[#006a4e]"
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.availableVehicles ?? 0} xe)
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {directCandidates.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-3"
            >
              <div>
                <p className="text-sm font-bold text-[#1b211e]">{v.plateNumber}</p>
                <p className="text-[11px] text-[#59645e]">
                  {v.qrCode || `QR-${v.plateNumber}`} ·{' '}
                  <span
                    className={`inline-flex items-center gap-0.5 font-bold ${
                      v.batterySoc < 20 ? 'text-rose-600' : 'text-[#006a4e]'
                    }`}
                  >
                    <BatteryCharging className="h-3 w-3" /> {v.batterySoc}%
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={loading || Boolean(activeRental) || v.batterySoc < 20}
                onClick={() => onPickupByQrOrVehicle({ qrCode: v.qrCode || v.plateNumber })}
                className="rounded-full border border-[#006a4e] bg-white px-3 py-1.5 text-xs font-bold text-[#006a4e] hover:bg-[#006a4e] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {v.batterySoc < 20 ? 'Pin yếu' : 'Quét nhận'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

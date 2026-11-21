import React from 'react';
import { BatteryCharging, CarFront, Sparkles } from 'lucide-react';
import { Hub } from '../../types/hub.types';
import { renderHubStatusBadge } from '../ui/Badges';

interface HubReservationPanelProps {
  hub: Hub | null;
  vehicleTypeFilter: string;
  parkingPlate: string;
  parkingArrivalTime: string;
  actionLoading: boolean;
  onChangeVehicleTypeFilter: (value: string) => void;
  onChangeParkingPlate: (value: string) => void;
  onChangeParkingArrivalTime: (value: string) => void;
  onReserveVehicle: (vehicleId?: string, fastReserve?: boolean) => void;
  onBookParking: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Hiển thị chi tiết trạm Hub được chọn gồm đặt xe nhanh thông minh, danh sách xe sẵn sàng và đặt chỗ đỗ cá nhân.
 */
export const HubReservationPanel: React.FC<HubReservationPanelProps> = ({
  hub,
  vehicleTypeFilter,
  parkingPlate,
  parkingArrivalTime,
  actionLoading,
  onChangeVehicleTypeFilter,
  onChangeParkingPlate,
  onChangeParkingArrivalTime,
  onReserveVehicle,
  onBookParking,
}) => {
  if (!hub) {
    return (
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-8 text-center text-sm text-[#59645e]">
        Chọn một trạm Hub trên bản đồ để xem chi tiết phương tiện và đặt chỗ.
      </div>
    );
  }

  const availVehiclesList = (hub.vehicles || []).filter((v) => v.status === 'AVAILABLE');

  return (
    <>
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#1b211e]">{hub.name}</h3>
            <p className="mt-1 text-xs text-[#59645e]">{hub.description}</p>
          </div>
          {renderHubStatusBadge(hub.status)}
        </div>

        {/* Khối đặt nhanh thông minh (chọn xe mức pin cao nhất >= 20%) */}
        <div className="mt-4 rounded-2xl border border-[#ccebdd] bg-[#e6f5ee] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00513b]">
              <Sparkles className="h-4 w-4" /> Đặt nhanh thông minh
            </span>
            <select
              aria-label="Loại xe đặt nhanh"
              value={vehicleTypeFilter}
              onChange={(e) => onChangeVehicleTypeFilter(e.target.value)}
              className="rounded-full border border-[#a8dbc3] bg-white px-2.5 py-1 text-xs font-medium text-[#1b211e] outline-none"
            >
              <option value="ALL">Mọi loại xe</option>
              <option value="E-Bike">E-Bike</option>
              <option value="E-Scooter">E-Scooter</option>
            </select>
          </div>
          <p className="mt-1.5 text-xs text-[#00513b]/90">
            Hệ thống tự động chọn phương tiện có mức pin cao nhất (từ 20% trở lên) và giữ chỗ trong 15 phút.
          </p>
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onReserveVehicle(undefined, true)}
            className="mt-3 w-full rounded-full bg-[#006a4e] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-60"
          >
            {actionLoading ? 'Đang xử lý...' : 'Đặt nhanh xe pin cao nhất'}
          </button>
        </div>

        {/* Danh sách xe sẵn sàng tại trạm */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#1b211e]">
              Xe sẵn sàng tại trạm ({availVehiclesList.length})
            </h4>
          </div>

          <div className="mt-2.5 max-h-[250px] space-y-2 overflow-y-auto pr-1">
            {availVehiclesList.length === 0 ? (
              <p className="rounded-xl bg-[#f8f9fa] p-4 text-center text-xs text-[#59645e]">
                Trạm hiện không còn xe sẵn sàng.
              </p>
            ) : (
              availVehiclesList.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1b211e]">{v.plateNumber}</span>
                      <span className="rounded-full bg-[#e9efec] px-2 py-0.5 text-[10px] font-medium text-[#59645e]">
                        {v.type}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#59645e]">
                      <span>{v.model}</span>
                      <span>·</span>
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          v.batterySoc < 20 ? 'text-rose-600' : 'text-[#006a4e]'
                        }`}
                      >
                        <BatteryCharging className="h-3.5 w-3.5" /> {v.batterySoc}%
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={actionLoading || v.batterySoc < 20}
                    onClick={() => onReserveVehicle(v.id, false)}
                    className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#006a4e] ring-1 ring-[#006a4e] transition hover:bg-[#006a4e] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {v.batterySoc < 20 ? 'Pin yếu' : 'Đặt xe'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Biểu mẫu đặt trước ô đỗ xe cá nhân */}
      <form
        onSubmit={onBookParking}
        className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-[#1b211e]">
          <CarFront className="h-4 w-4 text-[#006a4e]" />
          <span>Đặt chỗ đỗ xe cá nhân tại {hub.name}</span>
        </div>
        <p className="mt-1 text-xs text-[#59645e]">
          Ô đỗ còn trống: <strong className="text-[#006a4e]">{hub.availableDocks ?? 0}</strong>/{hub.totalDocks}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            required
            value={parkingPlate}
            onChange={(e) => onChangeParkingPlate(e.target.value)}
            placeholder="Biển số (VD: 59-MD1-123.45)"
            className="rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
          />
          <input
            type="time"
            value={parkingArrivalTime}
            onChange={(e) => onChangeParkingArrivalTime(e.target.value)}
            className="rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={actionLoading}
          className="mt-3 w-full rounded-full border border-[#006a4e] bg-white py-2 text-xs font-bold text-[#006a4e] transition hover:bg-[#e6f5ee] disabled:opacity-60"
        >
          Đặt trước ô đỗ xe cá nhân
        </button>
      </form>
    </>
  );
};

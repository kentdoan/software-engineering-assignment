import React from 'react';
import { Bike, Compass, ParkingSquare, Search, Zap } from 'lucide-react';

interface HubSearchFilterBarProps {
  searchText: string;
  radiusKm: string;
  onlyAvailableVehicles: boolean;
  onlyAvailableDocks: boolean;
  onlyAvailableCharging: boolean;
  onChangeSearchText: (value: string) => void;
  onChangeRadiusKm: (value: string) => void;
  onToggleAvailableVehicles: () => void;
  onToggleAvailableDocks: () => void;
  onToggleAvailableCharging: () => void;
}

/**
 * Mục đích: Thanh tìm kiếm tên trạm Hub, lọc theo bán kính Haversine và lọc nhanh theo tài nguyên khả dụng.
 */
export const HubSearchFilterBar: React.FC<HubSearchFilterBarProps> = ({
  searchText,
  radiusKm,
  onlyAvailableVehicles,
  onlyAvailableDocks,
  onlyAvailableCharging,
  onChangeSearchText,
  onChangeRadiusKm,
  onToggleAvailableVehicles,
  onToggleAvailableDocks,
  onToggleAvailableCharging,
}) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#59645e]" />
        <input
          value={searchText}
          onChange={(e) => onChangeSearchText(e.target.value)}
          placeholder="Tìm tên trạm Hub (VD: Metro, Bách Khoa, KTX Khu A, UIT...)"
          className="w-full rounded-full border border-[#dfe5e1] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>

      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-[#006a4e]" />
        <select
          aria-label="Lọc bán kính"
          value={radiusKm}
          onChange={(e) => onChangeRadiusKm(e.target.value)}
          className="rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2 text-xs font-medium text-[#1b211e] outline-none focus:border-[#006a4e]"
        >
          <option value="">Toàn khu ĐHQG-HCM</option>
          <option value="0.5">Trong bán kính 0.5 km</option>
          <option value="1">Trong bán kính 1.0 km</option>
          <option value="2">Trong bán kính 2.0 km</option>
          <option value="5">Trong bán kính 5.0 km</option>
        </select>
      </div>
    </div>

    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onToggleAvailableVehicles}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          onlyAvailableVehicles
            ? 'border-[#006a4e] bg-[#ccebdd] text-[#00513b]'
            : 'border-[#dfe5e1] bg-white text-[#59645e] hover:bg-[#e9efec]'
        }`}
      >
        <Bike className="h-3.5 w-3.5" /> Còn xe sẵn sàng
      </button>
      <button
        type="button"
        onClick={onToggleAvailableDocks}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          onlyAvailableDocks
            ? 'border-[#006a4e] bg-[#ccebdd] text-[#00513b]'
            : 'border-[#dfe5e1] bg-white text-[#59645e] hover:bg-[#e9efec]'
        }`}
      >
        <ParkingSquare className="h-3.5 w-3.5" /> Còn ô đỗ trống
      </button>
      <button
        type="button"
        onClick={onToggleAvailableCharging}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          onlyAvailableCharging
            ? 'border-[#006a4e] bg-[#ccebdd] text-[#00513b]'
            : 'border-[#dfe5e1] bg-white text-[#59645e] hover:bg-[#e9efec]'
        }`}
      >
        <Zap className="h-3.5 w-3.5" /> Còn trụ sạc trống
      </button>
    </div>
  </div>
);

import React, { useCallback, useEffect, useState } from 'react';
import {
  BatteryCharging,
  Bike,
  CarFront,
  Compass,
  MapPin,
  ParkingSquare,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { VNU_DEFAULT_CENTER } from '../../constants/initialData';
import { bookingsApi, getErrorMessage, hubsApi } from '../../services/api';
import { Hub } from '../../types';
import { renderHubStatusBadge } from '../ui/Badges';
import { MapView } from './MapView';

interface StudentHubExplorerProps {
  onBooked: () => Promise<void>;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const StudentHubExplorer: React.FC<StudentHubExplorerProps> = ({ onBooked, notify }) => {
  const [searchText, setSearchText] = useState('');
  const [radiusKm, setRadiusKm] = useState<string>('');
  const [onlyAvailableVehicles, setOnlyAvailableVehicles] = useState(false);
  const [onlyAvailableDocks, setOnlyAvailableDocks] = useState(false);
  const [onlyAvailableCharging, setOnlyAvailableCharging] = useState(false);

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [selectedHubDetail, setSelectedHubDetail] = useState<Hub | null>(null);
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('ALL');
  const [parkingPlate, setParkingPlate] = useState('');
  const [parkingArrivalTime, setParkingArrivalTime] = useState('09:30');

  const fetchHubs = useCallback(async () => {
    setLoadingHubs(true);
    try {
      const list = await hubsApi.getAll({
        q: searchText || undefined,
        lat: VNU_DEFAULT_CENTER.latitude,
        lng: VNU_DEFAULT_CENTER.longitude,
        radiusKm: radiusKm ? Number(radiusKm) : undefined,
        hasAvailableVehicles: onlyAvailableVehicles || undefined,
        hasAvailableDocks: onlyAvailableDocks || undefined,
        hasAvailableCharging: onlyAvailableCharging || undefined,
      });
      setHubs(list);
      if (list.length > 0 && (!selectedHubId || !list.some((h) => h.id === selectedHubId))) {
        setSelectedHubId(list[0].id);
      }
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setLoadingHubs(false);
    }
  }, [
    searchText,
    radiusKm,
    onlyAvailableVehicles,
    onlyAvailableDocks,
    onlyAvailableCharging,
    selectedHubId,
    notify,
  ]);

  useEffect(() => {
    void fetchHubs();
  }, [fetchHubs]);

  useEffect(() => {
    if (!selectedHubId) {
      setSelectedHubDetail(null);
      return;
    }
    let mounted = true;
    hubsApi
      .getOne(selectedHubId)
      .then((detail) => {
        if (mounted) setSelectedHubDetail(detail);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [selectedHubId, hubs]);

  const handleReserveVehicle = async (vehicleId?: string, fastReserve = false) => {
    if (!selectedHubId) return;
    setActionLoading(true);
    try {
      const booking = await bookingsApi.create({
        hubId: selectedHubId,
        vehicleId,
        vehicleType: fastReserve ? vehicleTypeFilter : undefined,
        fastReserve,
      });
      notify(
        'success',
        `Đã giữ xe ${booking.vehicle?.plateNumber || ''} trong 15 phút (Mã ${booking.code}).`,
      );
      await fetchHubs();
      await onBooked();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBookParking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHubId) return;
    setActionLoading(true);
    try {
      const p = await bookingsApi.createParking({
        hubId: selectedHubId,
        vehiclePlate: parkingPlate,
        arrivalTime: parkingArrivalTime,
      });
      setParkingPlate('');
      notify('success', `Đã giữ ô đỗ ${p.bayCode} tại ${p.hubName} (Mã ${p.code}).`);
      await fetchHubs();
      await onBooked();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const availVehiclesList = (selectedHubDetail?.vehicles || []).filter(
    (v) => v.status === 'AVAILABLE',
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Tìm kiếm Hub & Đặt chỗ</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Tra cứu trạm xe điện quanh Khu đô thị ĐHQG-HCM, đặt giữ xe trong 15 phút hoặc đặt ô đỗ xe cá nhân
        </p>
      </div>

      {/* UC-STU-01 Search & Haversine Radius Filter Bar */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#59645e]" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm tên trạm Hub (VD: Metro, Bách Khoa, KTX Khu A, UIT...)"
              className="w-full rounded-full border border-[#dfe5e1] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#006a4e]" />
            <select
              aria-label="Lọc bán kính"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
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
            onClick={() => setOnlyAvailableVehicles((v) => !v)}
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
            onClick={() => setOnlyAvailableDocks((v) => !v)}
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
            onClick={() => setOnlyAvailableCharging((v) => !v)}
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

      {/* Main 2-column Workspace matching Figma */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Interactive Map & Hub Cards */}
        <div className="space-y-4 lg:col-span-7">
          <MapView
            hubs={hubs}
            selectedHubId={selectedHubId}
            onSelectHub={(hub) => setSelectedHubId(hub.id)}
            heightClass="h-[340px]"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {loadingHubs && hubs.length === 0 ? (
              <div className="col-span-2 rounded-2xl border border-[#dfe5e1] bg-white p-6 text-center text-sm text-[#59645e]">
                Đang tải danh sách trạm Hub...
              </div>
            ) : hubs.length === 0 ? (
              <div className="col-span-2 rounded-2xl border border-[#dfe5e1] bg-white p-6 text-center text-sm text-[#59645e]">
                Không tìm thấy trạm Hub nào phù hợp bộ lọc hiện tại.
              </div>
            ) : (
              hubs.map((hub) => {
                const isSelected = hub.id === selectedHubId;
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => setSelectedHubId(hub.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[#006a4e] bg-[#e6f5ee] shadow-sm'
                        : 'border-[#dfe5e1] bg-white hover:border-[#006a4e]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#1b211e]">{hub.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#59645e]">
                          <MapPin className="h-3 w-3" />
                          Cách trung tâm {hub.distanceKm ?? 0.5} km
                        </p>
                      </div>
                      {renderHubStatusBadge(hub.status)}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#dfe5e1]/80 pt-3 text-center">
                      <div>
                        <p className="text-base font-bold text-[#006a4e]">{hub.availableVehicles ?? 0}</p>
                        <p className="text-[11px] text-[#59645e]">Xe sẵn sàng</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#1b211e]">{hub.availableDocks ?? 0}</p>
                        <p className="text-[11px] text-[#59645e]">Ô đỗ trống</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#1b211e]">
                          {hub.availableChargingPorts ?? 0}
                        </p>
                        <p className="text-[11px] text-[#59645e]">Trụ trống</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Hub Detail & Reservation Panel (UC-STU-02 & UC-STU-03) */}
        <div className="space-y-4 lg:col-span-5">
          {selectedHubDetail ? (
            <>
              <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#1b211e]">{selectedHubDetail.name}</h3>
                    <p className="mt-1 text-xs text-[#59645e]">{selectedHubDetail.description}</p>
                  </div>
                  {renderHubStatusBadge(selectedHubDetail.status)}
                </div>

                {/* Fast Reserve Card (UC-STU-02 Auto-select highest battery) */}
                <div className="mt-4 rounded-2xl border border-[#ccebdd] bg-[#e6f5ee] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00513b]">
                      <Sparkles className="h-4 w-4" /> Đặt nhanh thông minh
                    </span>
                    <select
                      aria-label="Loại xe đặt nhanh"
                      value={vehicleTypeFilter}
                      onChange={(e) => setVehicleTypeFilter(e.target.value)}
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
                    onClick={() => handleReserveVehicle(undefined, true)}
                    className="mt-3 w-full rounded-full bg-[#006a4e] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-60"
                  >
                    {actionLoading ? 'Đang xử lý...' : 'Đặt nhanh xe pin cao nhất'}
                  </button>
                </div>

                {/* Available Vehicle List */}
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
                            onClick={() => handleReserveVehicle(v.id, false)}
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

              {/* UC-STU-03 Book Private EV Parking Bay */}
              <form
                onSubmit={handleBookParking}
                className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#1b211e]">
                  <CarFront className="h-4 w-4 text-[#006a4e]" />
                  <span>Đặt chỗ đỗ xe cá nhân tại {selectedHubDetail.name}</span>
                </div>
                <p className="mt-1 text-xs text-[#59645e]">
                  Ô đỗ còn trống: <strong className="text-[#006a4e]">{selectedHubDetail.availableDocks ?? 0}</strong>/{selectedHubDetail.totalDocks}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input
                    required
                    value={parkingPlate}
                    onChange={(e) => setParkingPlate(e.target.value)}
                    placeholder="Biển số (VD: 59-MD1-123.45)"
                    className="rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
                  />
                  <input
                    type="time"
                    value={parkingArrivalTime}
                    onChange={(e) => setParkingArrivalTime(e.target.value)}
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
          ) : (
            <div className="rounded-3xl border border-[#dfe5e1] bg-white p-8 text-center text-sm text-[#59645e]">
              Chọn một trạm Hub trên bản đồ để xem chi tiết phương tiện và đặt chỗ.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

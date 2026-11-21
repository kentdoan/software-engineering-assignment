import React, { useCallback, useEffect, useState } from 'react';
import { MapView } from '../../components/map/MapView';
import { HubCardList } from '../../components/student/HubCardList';
import { HubReservationPanel } from '../../components/student/HubReservationPanel';
import { HubSearchFilterBar } from '../../components/student/HubSearchFilterBar';
import { PageHeader } from '../../components/ui/PageHeader';
import { VNU_DEFAULT_CENTER } from '../../constants/initialData';
import { bookingsApi } from '../../services/bookings.api';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { Hub } from '../../types/hub.types';

interface StudentExplorePageProps {
  onBooked: () => Promise<void>;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Khám phá Hub & Đặt chỗ giúp sinh viên tra cứu bản đồ trạm, lọc tài nguyên, đặt xe hoặc đặt ô đỗ cá nhân.
 */
export const StudentExplorePage: React.FC<StudentExplorePageProps> = ({ onBooked, notify }) => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tìm kiếm Hub & Đặt chỗ"
        description="Tra cứu trạm xe điện quanh Khu đô thị ĐHQG-HCM, đặt giữ xe trong 15 phút hoặc đặt ô đỗ xe cá nhân"
      />

      <HubSearchFilterBar
        searchText={searchText}
        radiusKm={radiusKm}
        onlyAvailableVehicles={onlyAvailableVehicles}
        onlyAvailableDocks={onlyAvailableDocks}
        onlyAvailableCharging={onlyAvailableCharging}
        onChangeSearchText={setSearchText}
        onChangeRadiusKm={setRadiusKm}
        onToggleAvailableVehicles={() => setOnlyAvailableVehicles((v) => !v)}
        onToggleAvailableDocks={() => setOnlyAvailableDocks((v) => !v)}
        onToggleAvailableCharging={() => setOnlyAvailableCharging((v) => !v)}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <MapView
            hubs={hubs}
            selectedHubId={selectedHubId}
            onSelectHub={(hub) => setSelectedHubId(hub.id)}
            heightClass="h-[340px]"
          />

          <HubCardList
            hubs={hubs}
            selectedHubId={selectedHubId}
            loading={loadingHubs}
            onSelectHub={setSelectedHubId}
          />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <HubReservationPanel
            hub={selectedHubDetail}
            vehicleTypeFilter={vehicleTypeFilter}
            parkingPlate={parkingPlate}
            parkingArrivalTime={parkingArrivalTime}
            actionLoading={actionLoading}
            onChangeVehicleTypeFilter={setVehicleTypeFilter}
            onChangeParkingPlate={setParkingPlate}
            onChangeParkingArrivalTime={setParkingArrivalTime}
            onReserveVehicle={handleReserveVehicle}
            onBookParking={handleBookParking}
          />
        </div>
      </div>
    </div>
  );
};

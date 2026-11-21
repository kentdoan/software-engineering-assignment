import React, { useCallback, useEffect, useState } from 'react';
import { Activity, BatteryCharging, Bike, ShieldAlert } from 'lucide-react';
import { MapView } from '../../components/map/MapView';
import { HubAlertsPanel } from '../../components/operator/HubAlertsPanel';
import { NetworkHubsTable } from '../../components/operator/NetworkHubsTable';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { monitoringApi } from '../../services/monitoring.api';
import { Hub } from '../../types/hub.types';
import { HubAlert, MonitoringStats } from '../../types/operations.types';

interface OperatorMonitorPageProps {
  onGoToDispatch: (targetHubId?: string) => void;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Giám sát mạng lưới Hub tổng hợp chỉ số KPI, bản đồ trực tuyến, bảng trạm và cảnh báo vận hành.
 */
export const OperatorMonitorPage: React.FC<OperatorMonitorPageProps> = ({
  onGoToDispatch,
  notify,
}) => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [alerts, setAlerts] = useState<HubAlert[]>([]);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const [s, h, a] = await Promise.all([
        monitoringApi.getStats(),
        hubsApi.getAll(),
        monitoringApi.getAlerts(),
      ]);
      setStats(s);
      setHubs(h);
      setAlerts(a);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [notify]);

  useEffect(() => {
    void loadSnapshot();
    const timer = setInterval(() => void loadSnapshot(), 5000);
    return () => clearInterval(timer);
  }, [loadSnapshot]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giám sát Mạng lưới Trạm Hub"
        description="Theo dõi thời gian thực mật độ phương tiện, ô đỗ trống, công suất sạc và cảnh báo vận hành tại 6 Hub VNU-HCM"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Xe sẵn sàng"
          value={`${stats?.availableVehicles ?? '--'} / ${stats?.totalVehicles ?? '--'}`}
          sublabel={`${stats?.inUseVehicles ?? 0} đang chạy · ${stats?.bookedVehicles ?? 0} giữ chỗ`}
          icon={<Bike className="h-5 w-5" />}
          accent="emerald"
        />
        <MetricCard
          label="Hoạt động sạc"
          value={stats?.chargingVehicles ?? '--'}
          sublabel={`${stats?.availableChargingPorts ?? 0} trụ trống sẵn sàng`}
          icon={<BatteryCharging className="h-5 w-5" />}
          accent="amber"
        />
        <MetricCard
          label="Sức khỏe đội xe"
          value={`${stats?.networkHealth ?? 100}%`}
          sublabel={`${stats?.faultyVehicles ?? 0} xe đang bảo trì / lỗi`}
          icon={<Activity className="h-5 w-5" />}
          accent="sky"
        />
        <MetricCard
          label="Cảnh báo & Sự cố"
          value={alerts.length + (stats?.activeIncidents ?? 0)}
          sublabel={`${stats?.activeIncidents ?? 0} sự cố thiết bị đang mở`}
          icon={<ShieldAlert className="h-5 w-5" />}
          accent={alerts.length > 0 || (stats?.activeIncidents ?? 0) > 0 ? 'rose' : 'emerald'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <MapView
            hubs={hubs}
            selectedHubId={selectedHubId}
            onSelectHub={(h) => setSelectedHubId(h.id)}
            heightClass="h-[310px]"
          />

          <NetworkHubsTable
            hubs={hubs}
            selectedHubId={selectedHubId}
            onSelectHub={setSelectedHubId}
          />
        </div>

        <HubAlertsPanel alerts={alerts} onGoToDispatch={onGoToDispatch} />
      </div>
    </div>
  );
};

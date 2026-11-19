import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BatteryCharging,
  Bike,
  ShieldAlert,
} from 'lucide-react';
import { getErrorMessage, hubsApi, monitoringApi } from '../../services/api';
import { Hub, HubAlert, MonitoringStats } from '../../types';
import { MapView } from '../student/MapView';
import { MetricCard, renderHubStatusBadge } from '../ui/Badges';

interface OperatorMonitorViewProps {
  onGoToDispatch: (targetHubId?: string) => void;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const OperatorMonitorView: React.FC<OperatorMonitorViewProps> = ({
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
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Giám sát Mạng lưới Trạm Hub</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Theo dõi thời gian thực mật độ phương tiện, ô đỗ trống, công suất sạc và cảnh báo vận hành tại 6 Hub VNU-HCM
        </p>
      </div>

      {/* KPI Row matching Figma Operator Monitor */}
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

          {/* Hub Summary Table */}
          <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#1b211e]">Bảng thông số từng trạm Hub</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
                    <th className="px-3 py-2.5 font-bold">Tên trạm</th>
                    <th className="px-3 py-2.5 font-bold text-center">Xe sẵn sàng</th>
                    <th className="px-3 py-2.5 font-bold text-center">Ô trống</th>
                    <th className="px-3 py-2.5 font-bold text-center">Trụ trống</th>
                    <th className="px-3 py-2.5 font-bold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dfe5e1]">
                  {hubs.map((hub) => (
                    <tr
                      key={hub.id}
                      onClick={() => setSelectedHubId(hub.id)}
                      className={`cursor-pointer transition hover:bg-[#f8f9fa] ${
                        selectedHubId === hub.id ? 'bg-[#e6f5ee]/60' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 font-bold text-[#1b211e]">{hub.name}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-[#006a4e]">
                        {hub.availableVehicles ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[#1b211e]">
                        {hub.availableDocks ?? 0}/{hub.totalDocks}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[#1b211e]">
                        {hub.availableChargingPorts ?? 0}/{hub.totalChargingPorts}
                      </td>
                      <td className="px-3 py-2.5">{renderHubStatusBadge(hub.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Active Alerts Panel */}
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
      </div>
    </div>
  );
};

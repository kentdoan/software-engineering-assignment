import React from 'react';
import { Hub } from '../../types/hub.types';
import { renderHubStatusBadge } from '../ui/Badges';

interface NetworkHubsTableProps {
  hubs: Hub[];
  selectedHubId: string | null;
  onSelectHub: (hubId: string) => void;
}

/**
 * Mục đích: Hiển thị bảng thông số trực tuyến của 6 trạm Hub giúp nhân viên vận hành chọn và theo dõi trạng thái từng trạm.
 */
export const NetworkHubsTable: React.FC<NetworkHubsTableProps> = ({
  hubs,
  selectedHubId,
  onSelectHub,
}) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
    <h3 className="text-base font-bold text-[#1b211e]">Bảng thông số từng trạm Hub</h3>
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
            <th className="px-3 py-2.5 font-bold">Tên trạm</th>
            <th className="px-3 py-2.5 text-center font-bold">Xe sẵn sàng</th>
            <th className="px-3 py-2.5 text-center font-bold">Ô trống</th>
            <th className="px-3 py-2.5 text-center font-bold">Trụ trống</th>
            <th className="px-3 py-2.5 font-bold">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#dfe5e1]">
          {hubs.map((hub) => (
            <tr
              key={hub.id}
              onClick={() => onSelectHub(hub.id)}
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
);

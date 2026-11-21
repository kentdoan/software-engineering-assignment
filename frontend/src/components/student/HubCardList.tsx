import React from 'react';
import { MapPin } from 'lucide-react';
import { Hub } from '../../types/hub.types';
import { renderHubStatusBadge } from '../ui/Badges';

interface HubCardListProps {
  hubs: Hub[];
  selectedHubId: string | null;
  loading: boolean;
  onSelectHub: (hubId: string) => void;
}

/**
 * Mục đích: Hiển thị danh sách thẻ thông tin tóm tắt của các trạm Hub bên dưới bản đồ để sinh viên chọn nhanh.
 */
export const HubCardList: React.FC<HubCardListProps> = ({
  hubs,
  selectedHubId,
  loading,
  onSelectHub,
}) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {loading && hubs.length === 0 ? (
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
            onClick={() => onSelectHub(hub.id)}
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
);

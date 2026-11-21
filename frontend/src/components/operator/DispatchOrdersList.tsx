import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Hub } from '../../types/hub.types';
import { DispatchOrder } from '../../types/operations.types';
import { formatTimeShort } from '../../utils/formatters';
import { renderDispatchBadge } from '../ui/Badges';

interface DispatchOrdersListProps {
  hubs: Hub[];
  orders: DispatchOrder[];
  onComplete: (orderId: string) => void;
  onCancel: (orderId: string) => void;
}

/**
 * Mục đích: Hiển thị danh sách lệnh điều phối phương tiện và nút xác nhận tiếp nhận hoặc hủy lệnh.
 */
export const DispatchOrdersList: React.FC<DispatchOrdersListProps> = ({
  hubs,
  orders,
  onComplete,
  onCancel,
}) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-6">
    <h3 className="text-base font-bold text-[#1b211e]">Danh sách lệnh điều phối</h3>
    <div className="mt-4 space-y-3">
      {orders.length === 0 ? (
        <p className="rounded-2xl bg-[#f8f9fa] p-6 text-center text-xs text-[#59645e]">
          Chưa có lệnh điều phối nào.
        </p>
      ) : (
        orders.map((order) => {
          const src = hubs.find((h) => h.id === order.sourceHubId)?.name || order.sourceHubId;
          const dst = hubs.find((h) => h.id === order.targetHubId)?.name || order.targetHubId;
          return (
            <div key={order.id} className="rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-[#1b211e]">{order.code}</span>
                  <span className="ml-2 text-xs text-[#59645e]">
                    {formatTimeShort(order.createdAt)}
                  </span>
                </div>
                {renderDispatchBadge(order.status)}
              </div>
              <p className="mt-1.5 text-xs font-medium text-[#1b211e]">
                {src} → {dst}
              </p>
              <p className="mt-1 text-xs text-[#59645e]">
                Phương tiện ({order.vehiclePlates.length}): {order.vehiclePlates.join(', ')}
              </p>
              {order.note && (
                <p className="mt-1 text-[11px] italic text-[#59645e]">Ghi chú: {order.note}</p>
              )}

              {order.status === 'IN_TRANSIT' && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onComplete(order.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#006a4e] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#00513b]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn tất tiếp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel(order.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Hủy lệnh
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
);

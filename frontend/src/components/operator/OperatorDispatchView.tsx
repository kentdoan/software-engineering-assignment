import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, XCircle } from 'lucide-react';
import { dispatchApi, getErrorMessage, hubsApi } from '../../services/api';
import { DispatchOrder, Hub } from '../../types';
import { formatTimeShort, renderDispatchBadge } from '../ui/Badges';

interface OperatorDispatchViewProps {
  initialTargetHubId?: string;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const OperatorDispatchView: React.FC<OperatorDispatchViewProps> = ({
  initialTargetHubId,
  notify,
}) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [sourceHubId, setSourceHubId] = useState('hub-04');
  const [targetHubId, setTargetHubId] = useState(initialTargetHubId || 'hub-01');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [hList, oList] = await Promise.all([hubsApi.getAll(), dispatchApi.list()]);
      setHubs(hList);
      setOrders(oList);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [notify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialTargetHubId) {
      setTargetHubId(initialTargetHubId);
    }
  }, [initialTargetHubId]);

  const sourceHub = hubs.find((h) => h.id === sourceHubId);
  const targetHub = hubs.find((h) => h.id === targetHubId);
  const movableVehicles = (sourceHub?.vehicles || []).filter((v) => v.status === 'AVAILABLE');

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await dispatchApi.create({
        sourceHubId,
        targetHubId,
        vehicleIds: selectedVehicleIds,
        note,
      });
      setSelectedVehicleIds([]);
      setNote('');
      notify('success', `Đã tạo lệnh điều phối ${created.code} (${created.vehiclePlates.length} xe).`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const updated = await dispatchApi.complete(id);
      notify('success', `Đã hoàn tất tiếp nhận lệnh ${updated.code} vào Hub đích.`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await dispatchApi.cancel(id);
      notify('warning', `Đã hủy lệnh ${updated.code}, hoàn xe về Hub nguồn.`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Điều phối Phương tiện giữa các Hub</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Cân bằng phân bố đội xe từ trạm dư thừa sang trạm có nguy cơ thiếu xe giờ cao điểm
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Create Dispatch Order */}
        <form
          onSubmit={handleCreateOrder}
          className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-6"
        >
          <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
            <ArrowRightLeft className="h-4 w-4 text-[#006a4e]" />
            <span>Tạo lệnh điều chuyển mới</span>
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trạm nguồn (Chuyển đi)</label>
              <select
                value={sourceHubId}
                onChange={(e) => {
                  setSourceHubId(e.target.value);
                  setSelectedVehicleIds([]);
                }}
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2.5 text-xs font-medium outline-none focus:border-[#006a4e]"
              >
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.availableVehicles ?? 0} xe sẵn sàng)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trạm đích (Tiếp nhận)</label>
              <select
                value={targetHubId}
                onChange={(e) => setTargetHubId(e.target.value)}
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2.5 text-xs font-medium outline-none focus:border-[#006a4e]"
              >
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (Còn {h.availableDocks ?? 0} ô trống)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {targetHub && (
            <p className="rounded-xl bg-[#e6f5ee] px-3.5 py-2 text-xs text-[#00513b]">
              Sức chứa còn trống tại <strong>{targetHub.name}</strong>: <strong>{targetHub.availableDocks ?? 0}</strong> ô đỗ.
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-bold text-[#1b211e]">
              Chọn phương tiện cần điều chuyển ({selectedVehicleIds.length} đã chọn)
            </p>
            <div className="grid max-h-[210px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {movableVehicles.map((v) => {
                const checked = selectedVehicleIds.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVehicle(v.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                      checked
                        ? 'border-[#006a4e] bg-[#ccebdd] text-[#00513b]'
                        : 'border-[#dfe5e1] bg-[#f8f9fa] text-[#1b211e]'
                    }`}
                  >
                    <span className="font-bold">{v.plateNumber}</span>
                    <span className="text-[11px] opacity-85">{v.batterySoc}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú vận hành (VD: Bổ sung giờ cao điểm)"
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
          />

          <button
            type="submit"
            disabled={submitting || selectedVehicleIds.length === 0}
            className="w-full rounded-full bg-[#006a4e] py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-50"
          >
            {submitting ? 'Đang tạo lệnh...' : 'Phát hành lệnh điều phối'}
          </button>
        </form>

        {/* Right: Dispatch Orders Table */}
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
                  <div
                    key={order.id}
                    className="rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-[#1b211e]">{order.code}</span>
                        <span className="ml-2 text-xs text-[#59645e]">{formatTimeShort(order.createdAt)}</span>
                      </div>
                      {renderDispatchBadge(order.status)}
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-[#1b211e]">
                      {src} → {dst}
                    </p>
                    <p className="mt-1 text-xs text-[#59645e]">
                      Phương tiện ({order.vehiclePlates.length}): {order.vehiclePlates.join(', ')}
                    </p>
                    {order.note && <p className="mt-1 text-[11px] italic text-[#59645e]">Ghi chú: {order.note}</p>}

                    {order.status === 'IN_TRANSIT' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleComplete(order.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#006a4e] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#00513b]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn tất tiếp nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(order.id)}
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
      </div>
    </div>
  );
};

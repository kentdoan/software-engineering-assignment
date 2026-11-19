import React, { useEffect, useState } from 'react';
import { AlertTriangle, BatteryCharging, CheckCircle2, QrCode, Unlock } from 'lucide-react';
import { getErrorMessage, hubsApi, rentalsApi } from '../../services/api';
import { Booking, Hub, Rental } from '../../types';
import { formatTimeShort } from '../ui/Badges';

interface StudentPickupViewProps {
  activeBooking: Booking | null;
  activeRental: Rental | null;
  onPickupComplete: () => Promise<void>;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const StudentPickupView: React.FC<StudentPickupViewProps> = ({
  activeBooking,
  activeRental,
  onPickupComplete,
  notify,
}) => {
  const [subTab, setSubTab] = useState<'MY_BOOKING' | 'DIRECT_QR'>(
    activeBooking ? 'MY_BOOKING' : 'DIRECT_QR',
  );
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selectedHubId, setSelectedHubId] = useState('hub-01');
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pickupError, setPickupError] = useState('');

  useEffect(() => {
    hubsApi
      .getAll()
      .then((list) => {
        setHubs(list);
        if (list.length > 0) setSelectedHubId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const currentHub = hubs.find((h) => h.id === selectedHubId);
  const directCandidates = (currentHub?.vehicles || []).filter((v) => v.status === 'AVAILABLE');

  const handlePickupByBooking = async () => {
    if (!activeBooking) return;
    setPickupError('');
    setLoading(true);
    try {
      await rentalsApi.pickup({ bookingId: activeBooking.id });
      notify('success', 'Mở khóa xe từ lượt đặt thành công. Chúc bạn di chuyển an toàn!');
      await onPickupComplete();
    } catch (err) {
      const msg = getErrorMessage(err);
      setPickupError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupByQrOrVehicle = async (payload: { qrCode?: string; vehicleId?: string }) => {
    setPickupError('');
    setLoading(true);
    try {
      await rentalsApi.pickup(payload);
      setQrInput('');
      notify('success', 'Quét mã mở khóa xe thành công! Bắt đầu tính giờ chuyến đi.');
      await onPickupComplete();
    } catch (err) {
      const msg = getErrorMessage(err);
      setPickupError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Nhận xe tại trạm Hub</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Mở khóa phương tiện từ lượt đặt trước hoặc quét trực tiếp mã QR gắn trên ghi đông xe
        </p>
      </div>

      {activeRental && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold">Bạn đang có chuyến đi đang hoạt động</p>
            <p className="mt-0.5 text-xs">
              Xe {activeRental.vehicle?.plateNumber || activeRental.vehicleId} đã mở khóa lúc{' '}
              {formatTimeShort(activeRental.startTime)}. Hãy chuyển sang mục "Chuyến đi & Đổi/Hủy" để trả xe.
            </p>
          </div>
        </div>
      )}

      {pickupError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pickupError}</span>
        </div>
      )}

      {/* Segmented Tabs matching Figma Student Pickup screen */}
      <div className="inline-flex rounded-full border border-[#dfe5e1] bg-[#f1f5f3] p-1">
        <button
          type="button"
          onClick={() => setSubTab('MY_BOOKING')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition ${
            subTab === 'MY_BOOKING' ? 'bg-[#006a4e] text-white' : 'text-[#59645e] hover:text-[#1b211e]'
          }`}
        >
          Lượt đặt của tôi {activeBooking ? '(1)' : '(0)'}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('DIRECT_QR')}
          className={`rounded-full px-5 py-2 text-xs font-bold transition ${
            subTab === 'DIRECT_QR' ? 'bg-[#006a4e] text-white' : 'text-[#59645e] hover:text-[#1b211e]'
          }`}
        >
          Hub gần bạn & Quét QR
        </button>
      </div>

      {subTab === 'MY_BOOKING' ? (
        <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
          {activeBooking ? (
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1.5">
                <span className="inline-block rounded-full bg-[#ccebdd] px-3 py-0.5 text-xs font-bold text-[#00513b]">
                  Đang giữ chỗ · {activeBooking.code}
                </span>
                <h3 className="text-lg font-bold text-[#1b211e]">
                  {activeBooking.vehicle?.plateNumber} — {activeBooking.vehicle?.model}
                </h3>
                <p className="text-xs text-[#59645e]">
                  Trạm: <strong className="text-[#1b211e]">{activeBooking.hub?.name}</strong> · Pin hiện tại:{' '}
                  <strong className="text-[#006a4e]">{activeBooking.vehicle?.batterySoc}%</strong> · Hết hạn lúc{' '}
                  {formatTimeShort(activeBooking.expiresAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={loading || Boolean(activeRental)}
                onClick={handlePickupByBooking}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#006a4e] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-50"
              >
                <Unlock className="h-4 w-4" />
                <span>{loading ? 'Đang mở khóa...' : 'Xác nhận mở khóa nhận xe'}</span>
              </button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-[#1b211e]">Bạn chưa có lượt đặt giữ xe nào.</p>
              <p className="mt-1 text-xs text-[#59645e]">
                Hãy chuyển sang tab "Hub gần bạn & Quét QR" để nhận xe trực tiếp tại trạm.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* QR Code Scanner Form */}
          <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-5">
            <div className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
              <QrCode className="h-5 w-5 text-[#006a4e]" />
              <span>Nhập / Quét mã QR trên xe</span>
            </div>
            <p className="mt-1 text-xs text-[#59645e]">
              Nhập mã QR (ví dụ: QR-59-EM01) hoặc chọn nhanh xe ở trạm bên phải để mô phỏng quét mã.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (qrInput.trim()) {
                  void handlePickupByQrOrVehicle({ qrCode: qrInput.trim() });
                }
              }}
              className="mt-4 space-y-3"
            >
              <input
                required
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Nhập mã QR hoặc biển số (VD: QR-59-EM01)"
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
              />
              <button
                type="submit"
                disabled={loading || Boolean(activeRental)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#006a4e] py-2.5 text-sm font-bold text-white hover:bg-[#00513b] disabled:opacity-50"
              >
                <Unlock className="h-4 w-4" />
                <span>Mở khóa bằng mã QR</span>
              </button>
            </form>
          </div>

          {/* Nearby Hub Direct Vehicle Picker */}
          <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[#1b211e]">Nhận xe trực tiếp tại trạm</h3>
              <select
                aria-label="Chọn Hub nhận xe"
                value={selectedHubId}
                onChange={(e) => setSelectedHubId(e.target.value)}
                className="rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-1.5 text-xs font-medium outline-none focus:border-[#006a4e]"
              >
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.availableVehicles ?? 0} xe)
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {directCandidates.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[#1b211e]">{v.plateNumber}</p>
                    <p className="text-[11px] text-[#59645e]">
                      {v.qrCode || `QR-${v.plateNumber}`} ·{' '}
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          v.batterySoc < 20 ? 'text-rose-600' : 'text-[#006a4e]'
                        }`}
                      >
                        <BatteryCharging className="h-3 w-3" /> {v.batterySoc}%
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading || Boolean(activeRental) || v.batterySoc < 20}
                    onClick={() => handlePickupByQrOrVehicle({ qrCode: v.qrCode || v.plateNumber })}
                    className="rounded-full border border-[#006a4e] bg-white px-3 py-1.5 text-xs font-bold text-[#006a4e] hover:bg-[#006a4e] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {v.batterySoc < 20 ? 'Pin yếu' : 'Quét nhận'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

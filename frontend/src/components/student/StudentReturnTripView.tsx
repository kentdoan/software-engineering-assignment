import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Clock,
  ParkingSquare,
  Receipt,
  XCircle,
} from 'lucide-react';
import { bookingsApi, getErrorMessage, hubsApi, rentalsApi } from '../../services/api';
import { Booking, Hub, ParkingBooking, Rental, ReturnReceiptResponse } from '../../types';
import { formatTimeShort, formatVnd } from '../ui/Badges';

interface StudentReturnTripViewProps {
  activeBooking: Booking | null;
  activeParkingBooking: ParkingBooking | null;
  activeRental: Rental | null;
  onUpdated: () => Promise<void>;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const StudentReturnTripView: React.FC<StudentReturnTripViewProps> = ({
  activeBooking,
  activeParkingBooking,
  activeRental,
  onUpdated,
  notify,
}) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [destHubId, setDestHubId] = useState('hub-02');
  const [damagedReported, setDamagedReported] = useState(false);
  const [damageNote, setDamageNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastReceipt, setLastReceipt] = useState<ReturnReceiptResponse | null>(null);
  const [history, setHistory] = useState<Rental[]>([]);

  useEffect(() => {
    hubsApi.getAll().then(setHubs).catch(() => {});
    rentalsApi.getHistory().then(setHistory).catch(() => {});
  }, [activeRental]);

  useEffect(() => {
    if (!activeRental) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const diff = Math.max(
        1,
        Math.floor((Date.now() - new Date(activeRental.startTime).getTime()) / 1000),
      );
      setElapsedSeconds(diff);
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeRental]);

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRental) return;
    setSubmitting(true);
    try {
      const res = await rentalsApi.returnVehicle({
        rentalId: activeRental.id,
        destinationHubId: destHubId,
        damagedReported,
        damageNote,
      });
      setLastReceipt(res);
      setDamagedReported(false);
      setDamageNote('');
      notify(
        res.receipt.autoQueuedForCharging ? 'warning' : 'success',
        `Trả xe thành công tại ô ${res.receipt.bayCode}. Phí: ${formatVnd(res.receipt.fare)}.`,
      );
      await onUpdated();
      const hist = await rentalsApi.getHistory();
      setHistory(hist);
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string, label: string) => {
    setSubmitting(true);
    try {
      await bookingsApi.cancel(id);
      notify('info', `Đã hủy lượt ${label} và giải phóng tài nguyên.`);
      await onUpdated();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Chuyến đi hiện tại & Quản lý đặt chỗ</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Theo dõi thời gian di chuyển, trả xe theo ô đỗ chỉ định và hủy lượt giữ xe khi thay đổi kế hoạch
        </p>
      </div>

      {/* UC-STU-06 Active Bookings (Vehicle & Private Parking) */}
      {(activeBooking || activeParkingBooking) && (
        <div className="grid gap-4 md:grid-cols-2">
          {activeBooking && (
            <div className="rounded-3xl border border-[#ccebdd] bg-[#e6f5ee] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase text-[#00513b]">
                    Giữ xe đang hiệu lực · {activeBooking.code}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-[#1b211e]">
                    {activeBooking.vehicle?.plateNumber} ({activeBooking.vehicle?.model})
                  </h3>
                  <p className="mt-1 text-xs text-[#59645e]">
                    Trạm: {activeBooking.hub?.name} · Giữ đến {formatTimeShort(activeBooking.expiresAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCancel(activeBooking.id, 'giữ xe')}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Hủy giữ xe
                </button>
              </div>
            </div>
          )}

          {activeParkingBooking && (
            <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-[#006a4e]">
                    <ParkingSquare className="h-3.5 w-3.5" /> Đặt chỗ đỗ · {activeParkingBooking.code}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-[#1b211e]">
                    Ô đỗ {activeParkingBooking.bayCode} · Biển số {activeParkingBooking.vehiclePlate}
                  </h3>
                  <p className="mt-1 text-xs text-[#59645e]">
                    {activeParkingBooking.hubName} · Giờ dự kiến {activeParkingBooking.arrivalTime}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCancel(activeParkingBooking.id, 'đỗ xe cá nhân')}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <XCircle className="h-3.5 w-3.5" /> Hủy ô đỗ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UC-STU-05 Active Trip & Return Vehicle */}
      {activeRental ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-[#006a4e] bg-white p-6 shadow-sm lg:col-span-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccebdd] px-3 py-1 text-xs font-bold text-[#00513b]">
              <Clock className="h-3.5 w-3.5" /> Chuyến đi đang diễn ra
            </span>
            <h3 className="mt-4 text-2xl font-bold text-[#1b211e]">
              {activeRental.vehicle?.plateNumber || activeRental.vehicleId}
            </h3>
            <p className="text-xs text-[#59645e]">
              {activeRental.vehicle?.model} · Xuất phát từ {activeRental.originHub?.name}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-[#f8f9fa] p-4">
              <div>
                <p className="text-[11px] font-medium text-[#59645e]">Thời gian</p>
                <p className="mt-1 text-xl font-bold text-[#006a4e]">
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#59645e]">Mức pin hiện tại</p>
                <p className="mt-1 flex items-center gap-1 text-xl font-bold text-[#1b211e]">
                  <BatteryCharging className="h-5 w-5 text-[#006a4e]" />
                  {activeRental.vehicle?.batterySoc ?? '--'}%
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleReturn}
            className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7"
          >
            <h3 className="text-lg font-bold text-[#1b211e]">Xác nhận trả xe tại trạm</h3>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#1b211e]">Chọn Hub trả xe</label>
              <select
                value={destHubId}
                onChange={(e) => setDestHubId(e.target.value)}
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
              >
                {hubs.map((h) => (
                  <option key={h.id} value={h.id} disabled={(h.availableDocks ?? 0) <= 0}>
                    {h.name} (Còn {h.availableDocks ?? 0} ô đỗ trống)
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-3.5 text-xs font-medium text-[#1b211e]">
              <input
                type="checkbox"
                checked={damagedReported}
                onChange={(e) => setDamagedReported(e.target.checked)}
                className="h-4 w-4 accent-[#006a4e]"
              />
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Báo cáo xe có hư hỏng hoặc bất thường kỹ thuật sau chuyến đi</span>
            </label>

            {damagedReported && (
              <textarea
                rows={2}
                value={damageNote}
                onChange={(e) => setDamageNote(e.target.value)}
                placeholder="Mô tả ngắn tình trạng hư hỏng (phanh, lốp, đèn, khóa...)"
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2 text-sm outline-none focus:border-[#006a4e]"
              />
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#006a4e] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-60"
            >
              {submitting ? 'Đang xử lý trả xe...' : 'Hoàn tất trả xe & Thanh toán'}
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-[#1b211e]">Hiện không có chuyến đi nào đang chạy</p>
          <p className="mt-1 text-xs text-[#59645e]">
            Chọn "Khám phá & Đặt xe" hoặc "Nhận xe & QR" để bắt đầu hành trình xanh tiếp theo.
          </p>
        </div>
      )}

      {/* Digital Return Receipt */}
      {lastReceipt && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-2 text-base font-bold text-emerald-900">
            <Receipt className="h-5 w-5" />
            <span>Biên lai điện tử hoàn tất chuyến đi</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] text-[#59645e]">Ô đỗ chỉ định</p>
              <p className="mt-1 text-base font-bold text-[#006a4e]">{lastReceipt.receipt.bayCode}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] text-[#59645e]">Quãng đường / Thời gian</p>
              <p className="mt-1 text-base font-bold text-[#1b211e]">
                {lastReceipt.receipt.distanceKm} km · {lastReceipt.receipt.durationMinutes} phút
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] text-[#59645e]">Tổng cước phí</p>
              <p className="mt-1 text-base font-bold text-[#1b211e]">{formatVnd(lastReceipt.receipt.fare)}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-[11px] text-[#59645e]">Pin sau chuyến đi</p>
              <p className="mt-1 text-base font-bold text-[#006a4e]">
                {lastReceipt.receipt.newBatterySoc}%{' '}
                {lastReceipt.receipt.autoQueuedForCharging ? '(Đã đưa vào hàng đợi sạc)' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trip History Table */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-[#1b211e]">Lịch sử chuyến đi đã hoàn tất</h3>
        {history.length === 0 ? (
          <p className="mt-3 text-xs text-[#59645e]">Chưa có chuyến đi nào được ghi nhận trong phiên này.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
                  <th className="px-3 py-2.5 font-bold">Phương tiện</th>
                  <th className="px-3 py-2.5 font-bold">Lộ trình</th>
                  <th className="px-3 py-2.5 font-bold">Thời lượng</th>
                  <th className="px-3 py-2.5 font-bold">Ô đỗ trả</th>
                  <th className="px-3 py-2.5 font-bold">Cước phí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe5e1]">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2.5 font-bold text-[#1b211e]">
                      {item.vehicle?.plateNumber || item.vehicleId}
                    </td>
                    <td className="px-3 py-2.5 text-[#59645e]">
                      {item.originHub?.name || item.originHubId} →{' '}
                      {item.destinationHub?.name || item.destinationHubId}
                    </td>
                    <td className="px-3 py-2.5 text-[#59645e]">{item.durationMinutes} phút</td>
                    <td className="px-3 py-2.5 font-medium text-[#006a4e]">
                      {item.returnBayCode || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-[#1b211e]">{formatVnd(item.fare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { ParkingSquare, XCircle } from 'lucide-react';
import { Booking, ParkingBooking } from '../../types/booking.types';
import { formatTimeShort } from '../../utils/formatters';

interface ActiveBookingsBannerProps {
  activeBooking: Booking | null;
  activeParkingBooking: ParkingBooking | null;
  submitting: boolean;
  onCancel: (id: string, label: string) => void;
}

/**
 * Mục đích: Hiển thị các lượt giữ xe điện và giữ chỗ đỗ cá nhân đang hiệu lực cùng nút hủy đặt chỗ nhanh.
 */
export const ActiveBookingsBanner: React.FC<ActiveBookingsBannerProps> = ({
  activeBooking,
  activeParkingBooking,
  submitting,
  onCancel,
}) => {
  if (!activeBooking && !activeParkingBooking) return null;

  return (
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
              onClick={() => onCancel(activeBooking.id, 'giữ xe')}
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
              onClick={() => onCancel(activeParkingBooking.id, 'đỗ xe cá nhân')}
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <XCircle className="h-3.5 w-3.5" /> Hủy ô đỗ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

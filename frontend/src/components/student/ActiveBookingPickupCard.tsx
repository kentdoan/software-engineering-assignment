import React from 'react';
import { Unlock } from 'lucide-react';
import { Booking } from '../../types/booking.types';
import { Rental } from '../../types/rental.types';
import { formatTimeShort } from '../../utils/formatters';

interface ActiveBookingPickupCardProps {
  activeBooking: Booking | null;
  activeRental: Rental | null;
  loading: boolean;
  onPickupByBooking: () => void;
}

/**
 * Mục đích: Hiển thị thông tin lượt đặt giữ xe hiện tại của sinh viên và nút xác nhận mở khóa nhận xe tại trạm.
 */
export const ActiveBookingPickupCard: React.FC<ActiveBookingPickupCardProps> = ({
  activeBooking,
  activeRental,
  loading,
  onPickupByBooking,
}) => (
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
          onClick={onPickupByBooking}
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
);

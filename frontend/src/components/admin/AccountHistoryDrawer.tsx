import React from 'react';
import { X } from 'lucide-react';
import { Booking, ParkingBooking } from '../../types/booking.types';
import { ChargingSession } from '../../types/charging.types';
import { Rental } from '../../types/rental.types';
import { User } from '../../types/user.types';
import { formatTimeShort, formatVnd } from '../../utils/formatters';
import { renderAccountStatusBadge } from '../ui/Badges';
import { ROLE_LABELS } from './AccountsTable';

export interface AccountHistoryData {
  user: User;
  bookings: Booking[];
  rentals: Rental[];
  chargingSessions: ChargingSession[];
  parkingBookings: ParkingBooking[];
}

interface AccountHistoryDrawerProps {
  data: AccountHistoryData | null;
  onClose: () => void;
}

/**
 * Mục đích: Ngăn kéo bên phải hiển thị hồ sơ chi tiết, lịch sử chuyến đi và lượt đặt chỗ của một tài khoản (z-[1200]).
 */
export const AccountHistoryDrawer: React.FC<AccountHistoryDrawerProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end bg-black/40 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#dfe5e1] px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-[#1b211e]">{data.user.name}</h3>
            <p className="text-xs text-[#59645e]">{data.user.email}</p>
          </div>
          <button
            type="button"
            aria-label="Đóng chi tiết tài khoản"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#59645e] hover:bg-[#e9efec]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
          <div className="space-y-1.5 rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-4">
            <div className="flex justify-between">
              <span className="text-[#59645e]">Vai trò:</span>
              <span className="font-bold">{ROLE_LABELS[data.user.role]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#59645e]">Trạng thái:</span>
              {renderAccountStatusBadge(data.user.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-[#59645e]">Số điện thoại:</span>
              <span className="font-medium">{data.user.phone}</span>
            </div>
            {data.user.rejectReason && (
              <p className="pt-1 text-rose-700">Ghi chú: {data.user.rejectReason}</p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-[#1b211e]">
              Lịch sử chuyến đi ({data.rentals.length})
            </h4>
            {data.rentals.length === 0 ? (
              <p className="mt-1.5 text-[#59645e]">Chưa có chuyến đi nào.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {data.rentals.map((r) => (
                  <div key={r.id} className="rounded-xl border border-[#dfe5e1] p-3">
                    <p className="font-bold text-[#1b211e]">
                      {r.originHubId} → {r.destinationHubId || 'Đang chạy'}
                    </p>
                    <p className="mt-0.5 text-[#59645e]">
                      Bắt đầu: {formatTimeShort(r.startTime)} · Cước: {formatVnd(r.fare)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold text-[#1b211e]">
              Lịch đặt chỗ & Sạc cá nhân ({data.bookings.length + data.chargingSessions.length})
            </h4>
            <p className="mt-1 text-[#59645e]">
              Giữ xe: {data.bookings.length} · Ô đỗ cá nhân: {data.parkingBookings.length} · Phiên sạc:{' '}
              {data.chargingSessions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

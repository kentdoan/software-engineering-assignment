import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ActiveBookingPickupCard } from '../../components/student/ActiveBookingPickupCard';
import { DirectQrPickupPanel } from '../../components/student/DirectQrPickupPanel';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { rentalsApi } from '../../services/rentals.api';
import { Booking } from '../../types/booking.types';
import { Hub } from '../../types/hub.types';
import { Rental } from '../../types/rental.types';
import { formatTimeShort } from '../../utils/formatters';

interface StudentPickupPageProps {
  activeBooking: Booking | null;
  activeRental: Rental | null;
  onPickupComplete: () => Promise<void>;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Nhận xe & Quét QR hỗ trợ sinh viên mở khóa xe từ lượt đặt giữ trước hoặc quét QR trực tiếp tại trạm.
 */
export const StudentPickupPage: React.FC<StudentPickupPageProps> = ({
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

  const handlePickupByBooking = async () => {
    if (!activeBooking) return;
    setPickupError('');
    setLoading(true);
    try {
      await rentalsApi.pickup({ bookingId: activeBooking.id });
      notify('success', 'Mở khóa xe từ lượt đặt thành công. Chúc bạn di chuyển an toàn!');
      await onPickupComplete();
    } catch (err) {
      setPickupError(getErrorMessage(err));
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
      setPickupError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQr = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrInput.trim()) {
      void handlePickupByQrOrVehicle({ qrCode: qrInput.trim() });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhận xe tại trạm Hub"
        description="Mở khóa phương tiện từ lượt đặt trước hoặc quét trực tiếp mã QR gắn trên ghi đông xe"
      />

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
        <ActiveBookingPickupCard
          activeBooking={activeBooking}
          activeRental={activeRental}
          loading={loading}
          onPickupByBooking={() => void handlePickupByBooking()}
        />
      ) : (
        <DirectQrPickupPanel
          hubs={hubs}
          selectedHubId={selectedHubId}
          qrInput={qrInput}
          activeRental={activeRental}
          loading={loading}
          onSelectHubId={setSelectedHubId}
          onChangeQrInput={setQrInput}
          onSubmitQr={handleSubmitQr}
          onPickupByQrOrVehicle={(payload) => void handlePickupByQrOrVehicle(payload)}
        />
      )}
    </div>
  );
};

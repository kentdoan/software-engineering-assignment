import React, { useEffect, useState } from 'react';
import { ActiveBookingsBanner } from '../../components/student/ActiveBookingsBanner';
import { ActiveTripReturnForm } from '../../components/student/ActiveTripReturnForm';
import { ReturnReceiptCard } from '../../components/student/ReturnReceiptCard';
import { TripHistoryTable } from '../../components/student/TripHistoryTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { bookingsApi } from '../../services/bookings.api';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { rentalsApi } from '../../services/rentals.api';
import { Booking, ParkingBooking } from '../../types/booking.types';
import { Hub } from '../../types/hub.types';
import { Rental, ReturnReceiptResponse } from '../../types/rental.types';
import { formatVnd } from '../../utils/formatters';

interface StudentTripPageProps {
  activeBooking: Booking | null;
  activeParkingBooking: ParkingBooking | null;
  activeRental: Rental | null;
  onUpdated: () => Promise<void>;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Chuyến đi & Quản lý đặt chỗ theo dõi hành trình đang chạy, trả xe, biên lai điện tử và hủy giữ chỗ.
 */
export const StudentTripPage: React.FC<StudentTripPageProps> = ({
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chuyến đi hiện tại & Quản lý đặt chỗ"
        description="Theo dõi thời gian di chuyển, trả xe theo ô đỗ chỉ định và hủy lượt giữ xe khi thay đổi kế hoạch"
      />

      <ActiveBookingsBanner
        activeBooking={activeBooking}
        activeParkingBooking={activeParkingBooking}
        submitting={submitting}
        onCancel={(id, label) => void handleCancel(id, label)}
      />

      <ActiveTripReturnForm
        activeRental={activeRental}
        hubs={hubs}
        destHubId={destHubId}
        damagedReported={damagedReported}
        damageNote={damageNote}
        elapsedSeconds={elapsedSeconds}
        submitting={submitting}
        onChangeDestHubId={setDestHubId}
        onChangeDamagedReported={setDamagedReported}
        onChangeDamageNote={setDamageNote}
        onSubmitReturn={handleReturn}
      />

      {lastReceipt && <ReturnReceiptCard receiptData={lastReceipt} />}

      <TripHistoryTable history={history} />
    </div>
  );
};

import { ActiveBookingsBundle, Booking, ParkingBooking } from '../types/booking.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API đặt giữ xe dùng chung, giữ chỗ đỗ xe cá nhân và hủy đặt chỗ.
 */
export const bookingsApi = {
  /**
   * Mục đích: Tạo lượt đặt giữ xe dùng chung trong 15 phút (theo xe chỉ định hoặc chọn nhanh pin cao nhất) qua POST /bookings.
   */
  create: async (payload: {
    hubId: string;
    vehicleId?: string;
    vehicleType?: string;
    fastReserve?: boolean;
  }): Promise<Booking> => {
    const res = await api.post('/bookings', payload);
    return res.data;
  },

  /**
   * Mục đích: Tạo lượt đặt trước ô đỗ dành cho xe điện cá nhân tại Hub qua POST /bookings/parking.
   */
  createParking: async (payload: {
    hubId: string;
    vehiclePlate: string;
    arrivalTime?: string;
  }): Promise<ParkingBooking> => {
    const res = await api.post('/bookings/parking', payload);
    return res.data;
  },

  /**
   * Mục đích: Lấy gói thông tin các lượt đặt giữ xe và ô đỗ đang hiệu lực cùng lịch sử của sinh viên từ GET /bookings/active.
   */
  getActive: async (): Promise<ActiveBookingsBundle> => {
    const res = await api.get('/bookings/active');
    return res.data;
  },

  /**
   * Mục đích: Hủy lượt đặt giữ xe hoặc đặt ô đỗ đang hiệu lực để giải phóng tài nguyên qua POST /bookings/:id/cancel.
   */
  cancel: async (bookingId: string): Promise<{ message: string }> => {
    const res = await api.post(`/bookings/${bookingId}/cancel`);
    return res.data;
  },
};

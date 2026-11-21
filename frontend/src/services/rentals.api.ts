import { Rental, ReturnReceiptResponse } from '../types/rental.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API mở khóa nhận xe, theo dõi chuyến đi đang chạy, trả xe và xem lịch sử chuyến đi.
 */
export const rentalsApi = {
  /**
   * Mục đích: Xác nhận mở khóa nhận xe từ lượt đặt trước hoặc quét mã QR trực tiếp qua POST /rentals/pickup.
   */
  pickup: async (payload: {
    bookingId?: string;
    vehicleId?: string;
    qrCode?: string;
  }): Promise<Rental> => {
    const res = await api.post('/rentals/pickup', payload);
    return res.data;
  },

  /**
   * Mục đích: Lấy thông tin chuyến đi đang hoạt động của sinh viên từ GET /rentals/active.
   */
  getActive: async (): Promise<Rental | null> => {
    const res = await api.get('/rentals/active');
    return res.data || null;
  },

  /**
   * Mục đích: Tải danh sách các chuyến đi đã hoàn tất của sinh viên từ GET /rentals/history.
   */
  getHistory: async (): Promise<Rental[]> => {
    const res = await api.get('/rentals/history');
    return res.data;
  },

  /**
   * Mục đích: Hoàn tất trả xe tại trạm đích, báo cáo hư hỏng nếu có và nhận biên lai điện tử qua POST /rentals/return.
   */
  returnVehicle: async (payload: {
    rentalId?: string;
    destinationHubId: string;
    damagedReported?: boolean;
    damageNote?: string;
  }): Promise<ReturnReceiptResponse> => {
    const res = await api.post('/rentals/return', payload);
    return res.data;
  },
};

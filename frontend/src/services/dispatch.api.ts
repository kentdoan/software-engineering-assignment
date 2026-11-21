import { DispatchOrder } from '../types/operations.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API điều phối phương tiện cân bằng tải giữa các trạm Hub.
 */
export const dispatchApi = {
  /**
   * Mục đích: Lấy danh sách các lệnh điều chuyển phương tiện hiện có từ GET /dispatch.
   */
  list: async (): Promise<DispatchOrder[]> => {
    const res = await api.get('/dispatch');
    return res.data;
  },

  /**
   * Mục đích: Tạo lệnh điều chuyển mới từ trạm nguồn sang trạm đích qua POST /dispatch.
   */
  create: async (payload: {
    sourceHubId: string;
    targetHubId: string;
    vehicleIds: string[];
    note?: string;
  }): Promise<DispatchOrder> => {
    const res = await api.post('/dispatch', payload);
    return res.data;
  },

  /**
   * Mục đích: Xác nhận hoàn tất tiếp nhận lệnh điều phối tại trạm đích qua POST /dispatch/:id/complete.
   */
  complete: async (id: string): Promise<DispatchOrder> => {
    const res = await api.post(`/dispatch/${id}/complete`);
    return res.data;
  },

  /**
   * Mục đích: Hủy lệnh điều phối đang chuyển và hoàn phương tiện về trạm nguồn qua POST /dispatch/:id/cancel.
   */
  cancel: async (id: string): Promise<DispatchOrder> => {
    const res = await api.post(`/dispatch/${id}/cancel`);
    return res.data;
  },
};

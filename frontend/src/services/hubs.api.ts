import { Hub } from '../types/hub.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API tra cứu danh sách và thông tin chi tiết các trạm Hub.
 */
export const hubsApi = {
  /**
   * Mục đích: Lấy danh sách trạm Hub kèm bộ lọc tìm kiếm, bán kính Haversine và tài nguyên khả dụng từ GET /hubs.
   */
  getAll: async (params?: {
    q?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    hasAvailableVehicles?: boolean;
    hasAvailableDocks?: boolean;
    hasAvailableCharging?: boolean;
  }): Promise<Hub[]> => {
    const res = await api.get('/hubs', { params });
    return res.data;
  },

  /**
   * Mục đích: Truy xuất thông tin chi tiết của một trạm Hub kèm danh sách xe và trụ sạc từ GET /hubs/:id.
   */
  getOne: async (id: string): Promise<Hub> => {
    const res = await api.get(`/hubs/${id}`);
    return res.data;
  },
};

import { HubAlert, MonitoringStats } from '../types/operations.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API giám sát chỉ số vận hành và cảnh báo mất cân bằng mạng lưới Hub.
 */
export const monitoringApi = {
  /**
   * Mục đích: Lấy các chỉ số thống kê tổng hợp về xe, trụ sạc và sức khỏe đội xe từ GET /monitoring/stats.
   */
  getStats: async (): Promise<MonitoringStats> => {
    const res = await api.get('/monitoring/stats');
    return res.data;
  },

  /**
   * Mục đích: Lấy danh sách cảnh báo thiếu xe, đầy bãi hoặc quá tải sạc từ GET /monitoring/alerts.
   */
  getAlerts: async (): Promise<HubAlert[]> => {
    const res = await api.get('/monitoring/alerts');
    return res.data;
  },
};

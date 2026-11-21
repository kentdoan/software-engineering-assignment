import { IncidentReport } from '../types/operations.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API báo cáo sự cố kỹ thuật, cô lập bảo trì và hoàn tất khắc phục thiết bị.
 */
export const incidentsApi = {
  /**
   * Mục đích: Lấy danh sách hồ sơ sự cố thiết bị theo trạng thái từ GET /incidents.
   */
  list: async (status = 'ALL'): Promise<IncidentReport[]> => {
    const res = await api.get('/incidents', { params: { status } });
    return res.data;
  },

  /**
   * Mục đích: Ghi nhận sự cố cho phương tiện hoặc trụ sạc và cô lập thiết bị qua POST /incidents.
   */
  report: async (payload: {
    hubId: string;
    resourceType: 'VEHICLE' | 'CHARGING_POINT';
    resourceId: string;
    incidentType: string;
    description: string;
  }): Promise<IncidentReport> => {
    const res = await api.post('/incidents', payload);
    return res.data;
  },

  /**
   * Mục đích: Đánh dấu sự cố đã khắc phục xong và đưa thiết bị hoạt động trở lại qua POST /incidents/:id/resolve.
   */
  resolve: async (id: string): Promise<IncidentReport> => {
    const res = await api.post(`/incidents/${id}/resolve`);
    return res.data;
  },
};

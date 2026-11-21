import { api } from './httpClient';

/**
 * Mục đích: Hàm gọi API khôi phục toàn bộ cơ sở dữ liệu mẫu ban đầu (chỉ dành cho Quản trị viên).
 */
export const resetApi = {
  /**
   * Mục đích: Gửi yêu cầu POST /reset-data để đưa dữ liệu hệ thống về snapshot gốc.
   */
  resetData: async (): Promise<void> => {
    await api.post('/reset-data');
  },
};

import { Scenario, SimulationStatus } from '../types/operations.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API điều khiển kịch bản mô phỏng What-If và theo dõi khuyến nghị tự động.
 */
export const simulationApi = {
  /**
   * Mục đích: Lấy danh sách các kịch bản mô phỏng áp lực lưu lượng có sẵn từ GET /simulation/scenarios.
   */
  getScenarios: async (): Promise<Scenario[]> => {
    const res = await api.get('/simulation/scenarios');
    return res.data;
  },

  /**
   * Mục đích: Đọc trạng thái tiến trình, nhật ký và danh sách khuyến nghị mô phỏng từ GET /simulation/status.
   */
  getStatus: async (): Promise<SimulationStatus> => {
    const res = await api.get('/simulation/status');
    return res.data;
  },

  /**
   * Mục đích: Khởi chạy một kịch bản mô phỏng với tốc độ và hệ số lưu lượng chỉ định qua POST /simulation/start.
   */
  start: async (
    scenarioId: string,
    speed = 1,
    passengerMultiplier = 1,
  ): Promise<SimulationStatus> => {
    const res = await api.post('/simulation/start', { scenarioId, speed, passengerMultiplier });
    return res.data;
  },

  /**
   * Mục đích: Tạm dừng phiên mô phỏng đang chạy qua POST /simulation/pause.
   */
  pause: async (): Promise<SimulationStatus> => {
    const res = await api.post('/simulation/pause');
    return res.data;
  },

  /**
   * Mục đích: Đặt lại trạng thái dữ liệu mô phỏng về snapshot ban đầu qua POST /simulation/reset.
   */
  reset: async (): Promise<SimulationStatus> => {
    const res = await api.post('/simulation/reset');
    return res.data;
  },
};

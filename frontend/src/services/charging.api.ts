import {
  ChargingPoint,
  ChargingSession,
  ChargingSlotProposal,
  GreedyScheduleItem,
  PrivateVehicle,
} from '../types/charging.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API quản lý xe điện cá nhân, đặt lịch sạc và lập lịch sạc thông minh.
 */
export const chargingApi = {
  /**
   * Mục đích: Lấy danh sách xe điện cá nhân đã đăng ký của sinh viên từ GET /charging/private-vehicles.
   */
  listPrivateVehicles: async (): Promise<PrivateVehicle[]> => {
    const res = await api.get('/charging/private-vehicles');
    return res.data;
  },

  /**
   * Mục đích: Đăng ký thêm phương tiện điện cá nhân mới qua POST /charging/private-vehicles.
   */
  registerPrivateVehicle: async (payload: {
    plateNumber: string;
    model: string;
    vehicleType: string;
    chargerType: string;
    batteryCapacityKwh: number;
  }): Promise<PrivateVehicle> => {
    const res = await api.post('/charging/private-vehicles', payload);
    return res.data;
  },

  /**
   * Mục đích: Lấy danh sách trụ sạc và trạng thái theo trạm Hub từ GET /charging/points.
   */
  listPoints: async (hubId?: string): Promise<ChargingPoint[]> => {
    const res = await api.get('/charging/points', { params: hubId ? { hubId } : undefined });
    return res.data;
  },

  /**
   * Mục đích: Yêu cầu hệ thống gợi ý các trụ sạc tương thích và khung giờ tối ưu qua POST /charging/slots/propose.
   */
  proposeSlots: async (payload: {
    hubId: string;
    privateVehicleId?: string;
    startTime: string;
    currentSoc: number;
    targetSoc: number;
  }): Promise<{ hubId: string; proposals: ChargingSlotProposal[] }> => {
    const res = await api.post('/charging/slots/propose', payload);
    return res.data;
  },

  /**
   * Mục đích: Xác nhận đặt lịch sạc cho xe điện cá nhân tại trụ sạc được chọn qua POST /charging/bookings.
   */
  bookPrivateSlot: async (payload: {
    hubId: string;
    privateVehicleId: string;
    chargingPointId: string;
    date?: string;
    startTime: string;
    endTime: string;
    currentSoc: number;
    targetSoc: number;
  }): Promise<ChargingSession> => {
    const res = await api.post('/charging/bookings', payload);
    return res.data;
  },

  /**
   * Mục đích: Lấy danh sách các phiên đặt sạc (lọc theo Hub hoặc chỉ của người dùng hiện tại) từ GET /charging/bookings.
   */
  listSessions: async (params?: { hubId?: string; onlyMine?: boolean }): Promise<ChargingSession[]> => {
    const res = await api.get('/charging/bookings', {
      params: {
        hubId: params?.hubId,
        onlyMine: params?.onlyMine ? 'true' : undefined,
      },
    });
    return res.data;
  },

  /**
   * Mục đích: Hủy một lịch đặt sạc cá nhân đang ở trạng thái chờ qua POST /charging/bookings/:id/cancel.
   */
  cancelSession: async (id: string): Promise<ChargingSession> => {
    const res = await api.post(`/charging/bookings/${id}/cancel`);
    return res.data;
  },

  /**
   * Mục đích: Tính toán danh sách ưu tiên và phương án phân bổ sạc tham lam tại một Hub từ GET /charging/priority-list.
   */
  getPriorityPlan: async (
    hubId: string,
    excludePortIds: string[] = [],
  ): Promise<{
    hubId: string;
    chargingPoints: ChargingPoint[];
    proposedPlan: GreedyScheduleItem[];
  }> => {
    const res = await api.get('/charging/priority-list', {
      params: {
        hubId,
        excludePortIds: excludePortIds.join(','),
      },
    });
    return res.data;
  },

  /**
   * Mục đích: Áp dụng lịch sạc thông minh đã tính toán cho trạm Hub qua POST /charging/schedule/apply.
   */
  applySmartSchedule: async (payload: {
    hubId: string;
    excludedPortIds: string[];
    departureOverrides?: Record<string, string>;
  }): Promise<{ message: string; appliedSessions: ChargingSession[] }> => {
    const res = await api.post('/charging/schedule/apply', payload);
    return res.data;
  },
};

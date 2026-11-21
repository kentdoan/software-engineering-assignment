/** Mục đích: Thông tin phương tiện điện cá nhân do sinh viên đăng ký sử dụng dịch vụ sạc tại Hub. */
export interface PrivateVehicle {
  id: string;
  userId: string;
  plateNumber: string;
  model: string;
  vehicleType: string;
  chargerType: string;
  batteryCapacityKwh: number;
}

/** Mục đích: Trạng thái hoạt động hiện tại của một trụ sạc điện tại trạm Hub. */
export type ChargingPointStatus = 'AVAILABLE' | 'CHARGING' | 'RESERVED' | 'MAINTENANCE';

/** Mục đích: Thông tin kỹ thuật và trạng thái của một trụ sạc cụ thể tại trạm Hub. */
export interface ChargingPoint {
  id: string;
  hubId: string;
  code: string;
  bayCode: string;
  connectorType: string;
  powerKw: number;
  status: ChargingPointStatus;
}

/** Mục đích: Thông tin một phiên sạc hoặc lịch đặt sạc (cho xe dùng chung hoặc xe cá nhân). */
export interface ChargingSession {
  id: string;
  code: string;
  userId?: string | null;
  vehicleId: string;
  vehicleLabel: string;
  hubId: string;
  chargingPointId: string;
  chargingPointCode: string;
  bayCode: string;
  isPrivateVehicle: boolean;
  date: string;
  startTime: string;
  endTime: string;
  currentSoc: number;
  targetSoc: number;
  priorityScore: number;
  status: 'SCHEDULED' | 'CHARGING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

/** Mục đích: Đề xuất khung giờ và trụ sạc tương thích khi sinh viên tìm chỗ sạc xe cá nhân. */
export interface ChargingSlotProposal {
  chargingPointId: string;
  chargingPointCode: string;
  bayCode: string;
  connectorType: string;
  powerKw: number;
  startTime: string;
  endTime: string;
  estimatedMinutes: number;
  estimatedCostVnd: number;
}

/** Mục đích: Một hạng mục phân bổ xe vào trụ sạc theo thuật toán lập lịch tham lam ưu tiên. */
export interface GreedyScheduleItem {
  vehicleId: string;
  plateNumber: string;
  model: string;
  currentSoc: number;
  targetSoc: number;
  targetDepartureTime: string;
  priorityScore: number;
  chargingPointId: string;
  chargingPointCode: string;
  bayCode: string;
  startTime: string;
  endTime: string;
}

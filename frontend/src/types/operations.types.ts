/** Mục đích: Thông tin lệnh điều chuyển phương tiện giữa trạm nguồn và trạm đích. */
export interface DispatchOrder {
  id: string;
  code: string;
  operatorId: string;
  sourceHubId: string;
  targetHubId: string;
  vehicleIds: string[];
  vehiclePlates: string[];
  note?: string;
  status: 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  completedAt?: string | null;
}

/** Mục đích: Hồ sơ báo cáo sự cố và cô lập bảo trì đối với phương tiện hoặc trụ sạc. */
export interface IncidentReport {
  id: string;
  code: string;
  reporterId: string;
  hubId: string;
  resourceType: 'VEHICLE' | 'CHARGING_POINT';
  resourceId: string;
  resourceLabel: string;
  incidentType: string;
  description: string;
  affectedSummary?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string | null;
}

/** Mục đích: Chỉ số tổng hợp tình trạng đội xe, trụ sạc và sự cố trên toàn mạng lưới Hub. */
export interface MonitoringStats {
  totalHubs: number;
  totalVehicles: number;
  availableVehicles: number;
  inUseVehicles: number;
  chargingVehicles: number;
  bookedVehicles: number;
  faultyVehicles: number;
  availableChargingPorts: number;
  activeIncidents: number;
  networkHealth: number;
}

/** Mục đích: Cảnh báo mất cân bằng tải (thiếu xe, sắp đầy bãi, quá tải sạc) tại một trạm Hub. */
export interface HubAlert {
  id: string;
  hubId: string;
  hubName: string;
  severity: 'WARNING' | 'CRITICAL';
  type: 'LOW_VEHICLES' | 'HIGH_OCCUPANCY' | 'CHARGING_SURGE';
  message: string;
  detectedAt: string;
}

/** Mục đích: Cấu hình một kịch bản mô phỏng áp lực lưu lượng What-If. */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  targetHubId: string;
  actionType: string;
  intensity: number;
  warningThreshold: number;
}

/** Mục đích: Khuyến nghị điều phối xe tự động sinh ra từ kết quả mô phỏng kịch bản. */
export interface WhatIfRecommendation {
  id: string;
  sourceHubId: string;
  sourceHubName: string;
  targetHubId: string;
  targetHubName: string;
  recommendedVehicleCount: number;
  vehicleIds: string[];
  reason: string;
}

/** Mục đích: Trạng thái tiến trình, nhật ký và khuyến nghị của bộ mô phỏng What-If hiện hành. */
export interface SimulationStatus {
  isRunning: boolean;
  activeScenarioId: string | null;
  speed: number;
  passengerMultiplier: number;
  currentStep: number;
  totalSteps: number;
  logs: string[];
  recommendations?: WhatIfRecommendation[];
}

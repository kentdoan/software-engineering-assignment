import { DispatchOrder, IncidentReport, Scenario } from '../interfaces';

/**
 * Mục đích: Chuyển đổi bản ghi lệnh điều phối xe từ Prisma sang đối tượng DispatchOrder chuẩn.
 * Cách hoạt động: Ánh xạ thông tin trạm nguồn, trạm đích, ghi chú, trạng thái và trích xuất danh sách bảng con dispatch_order_items thành hai mảng vehicleIds và vehiclePlates.
 */
export function mapDispatchOrderFromPrisma(row: {
  id: string;
  code: string;
  operator_id: string;
  source_hub_id: string;
  target_hub_id: string;
  note: string | null;
  status: DispatchOrder['status'];
  created_at: Date;
  completed_at: Date | null;
  dispatch_order_items: { vehicle_id: string; plate_number: string }[];
}): DispatchOrder {
  return {
    id: row.id,
    code: row.code,
    operatorId: row.operator_id,
    sourceHubId: row.source_hub_id,
    targetHubId: row.target_hub_id,
    vehicleIds: row.dispatch_order_items.map((item) => item.vehicle_id),
    vehiclePlates: row.dispatch_order_items.map((item) => item.plate_number),
    note: row.note ?? '',
    status: row.status,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
  };
}

/**
 * Mục đích: Chuyển đổi bản ghi báo cáo sự cố từ Prisma sang đối tượng IncidentReport chuẩn.
 * Cách hoạt động: Chọn vehicle_id hoặc charging_point_id làm resourceId tùy theo loại thiết bị gặp sự cố, đồng thời ánh xạ các trường mô tả, tóm tắt ảnh hưởng và thời điểm xử lý.
 */
export function mapIncidentFromPrisma(row: {
  id: string;
  code: string;
  reporter_id: string;
  hub_id: string;
  resource_type: IncidentReport['resourceType'];
  vehicle_id: string | null;
  charging_point_id: string | null;
  resource_label: string;
  incident_type: string;
  description: string;
  affected_summary: string | null;
  status: IncidentReport['status'];
  created_at: Date;
  resolved_at: Date | null;
}): IncidentReport {
  return {
    id: row.id,
    code: row.code,
    reporterId: row.reporter_id,
    hubId: row.hub_id,
    resourceType: row.resource_type,
    resourceId: (row.resource_type === 'VEHICLE' ? row.vehicle_id : row.charging_point_id) || '',
    resourceLabel: row.resource_label,
    incidentType: row.incident_type,
    description: row.description,
    affectedSummary: row.affected_summary ?? undefined,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
  };
}

/**
 * Mục đích: Chuyển đổi bản ghi kịch bản mô phỏng từ Prisma sang đối tượng Scenario chuẩn.
 * Cách hoạt động: Ánh xạ mã kịch bản, tên, mô tả, trạm mục tiêu, loại hành động, cường độ và ngưỡng cảnh báo từ cấu trúc snake_case sang camelCase.
 */
export function mapScenarioFromPrisma(row: {
  id: string;
  name: string;
  description: string;
  target_hub_id: string;
  action_type: string;
  intensity: number;
  warning_threshold: number;
}): Scenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetHubId: row.target_hub_id,
    actionType: row.action_type,
    intensity: row.intensity,
    warningThreshold: row.warning_threshold,
  };
}

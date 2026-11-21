import { ChargingPoint, Hub, Vehicle } from '../interfaces';

/**
 * Mục đích: Chuyển đổi bản ghi trạm Hub từ Prisma sang đối tượng Hub chuẩn của miền nghiệp vụ.
 * Cách hoạt động: Ánh xạ trực tiếp các trường định danh, tên, tọa độ và sức chứa từ dạng snake_case sang camelCase, đồng thời chuyển mô tả null thành undefined.
 */
export function mapHubFromPrisma(row: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_docks: number;
  total_charging_ports: number;
  description: string | null;
}): Hub {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    totalDocks: row.total_docks,
    totalChargingPorts: row.total_charging_ports,
    description: row.description ?? undefined,
  };
}

/**
 * Mục đích: Chuyển đổi bản ghi phương tiện dùng chung từ Prisma sang đối tượng Vehicle chuẩn.
 * Cách hoạt động: Ánh xạ biển số, loại xe, mã trạm, phần trăm pin, trạng thái và các trường tùy chọn như vị trí đỗ và mã QR từ định dạng cơ sở dữ liệu sang camelCase.
 */
export function mapVehicleFromPrisma(row: {
  id: string;
  plate_number: string;
  type: string;
  hub_id: string | null;
  battery_soc: number;
  status: Vehicle['status'];
  model: string;
  bay_code: string | null;
  qr_code: string | null;
}): Vehicle {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    type: row.type,
    hubId: row.hub_id,
    batterySoc: row.battery_soc,
    status: row.status,
    model: row.model,
    bayCode: row.bay_code ?? undefined,
    qrCode: row.qr_code ?? undefined,
  };
}

/**
 * Mục đích: Chuyển đổi bản ghi trụ sạc từ Prisma sang đối tượng ChargingPoint chuẩn.
 * Cách hoạt động: Ánh xạ mã trụ, vị trí ô đỗ, loại đầu cắm, công suất kW và trạng thái trụ sạc từ cấu trúc bảng charging_points sang đối tượng camelCase.
 */
export function mapChargingPointFromPrisma(row: {
  id: string;
  hub_id: string;
  code: string;
  bay_code: string;
  connector_type: string;
  power_kw: number;
  status: ChargingPoint['status'];
}): ChargingPoint {
  return {
    id: row.id,
    hubId: row.hub_id,
    code: row.code,
    bayCode: row.bay_code,
    connectorType: row.connector_type,
    powerKw: row.power_kw,
    status: row.status,
  };
}

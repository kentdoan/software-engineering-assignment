import { Injectable } from '@nestjs/common';
import {
  buildHubAlerts,
  computeHubStats,
  computeMonitoringStats,
} from '../common/calculators/hub-stats.calculator';
import { Hub, HubAlert, MonitoringStats } from '../common/interfaces';
import {
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapIncidentFromPrisma,
  mapParkingBookingFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mục đích: Tổng hợp trạng thái toàn mạng lưới và các chỉ số thống kê sức khỏe phục vụ bảng điều khiển giám sát.
   * Cách hoạt động: Đọc lần lượt dữ liệu trạm, phương tiện, trụ sạc và báo cáo sự cố từ cơ sở dữ liệu, ánh xạ sang định dạng chuẩn rồi gọi hàm tính toán chỉ số tổng quan và sức khỏe mạng lưới.
   */
  async getConsolidatedNetworkState(): Promise<MonitoringStats> {
    const hubRows = await this.prisma.hubs.findMany();
    const vehRows = await this.prisma.vehicles.findMany();
    const cpRows = await this.prisma.charging_points.findMany();
    const incRows = await this.prisma.incidents.findMany();

    const hubs = hubRows.map(mapHubFromPrisma);
    const vehicles = vehRows.map(mapVehicleFromPrisma);
    const chargingPoints = cpRows.map(mapChargingPointFromPrisma);
    const incidents = incRows.map(mapIncidentFromPrisma);

    return computeMonitoringStats(hubs, vehicles, chargingPoints, incidents);
  }

  /**
   * Mục đích: Đánh giá các ngưỡng an toàn của từng trạm Hub để phát hiện cảnh báo thiếu xe, đầy bãi đỗ hoặc quá tải trụ sạc.
   * Cách hoạt động: Truy vấn danh sách trạm, xe, trụ sạc và lượt đỗ xe cá nhân đang hoạt động, tính thống kê chi tiết cho từng trạm rồi gọi hàm kiểm tra ngưỡng để phát sinh danh sách cảnh báo tương ứng.
   */
  async evaluateHubThresholds(): Promise<HubAlert[]> {
    const hubRows = await this.prisma.hubs.findMany();
    const vehRows = await this.prisma.vehicles.findMany();
    const cpRows = await this.prisma.charging_points.findMany();
    const parkingRows = await this.prisma.parking_bookings.findMany({
      where: { status: 'ACTIVE' },
    });

    const vehicles = vehRows.map(mapVehicleFromPrisma);
    const chargingPoints = cpRows.map(mapChargingPointFromPrisma);
    const parkingBookings = parkingRows.map(mapParkingBookingFromPrisma);

    const enriched: Hub[] = [];
    for (const row of hubRows) {
      const hub = mapHubFromPrisma(row);
      enriched.push(computeHubStats(hub, vehicles, chargingPoints, parkingBookings));
    }

    return buildHubAlerts(enriched, vehicles, chargingPoints);
  }
}

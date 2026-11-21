import { Injectable, NotFoundException } from '@nestjs/common';
import { computeHubStats, filterHubsList } from '../common/calculators/hub-stats.calculator';
import { Hub, HubSearchQuery } from '../common/interfaces';
import {
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapParkingBookingFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HubsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mục đích: Truy vấn danh sách các trạm Hub trong phạm vi bán kính và điều kiện tìm kiếm của người dùng.
   * Cách hoạt động: Đọc lần lượt danh sách trạm, phương tiện, trụ sạc và lượt giữ chỗ đỗ xe cá nhân đang hiệu lực từ cơ sở dữ liệu, chuyển đổi sang định dạng chuẩn, tính toán chỉ số khả dụng cho từng trạm rồi lọc theo từ khóa, khoảng cách Haversine và trạng thái tài nguyên.
   */
  async findHubsWithinRadius(query: HubSearchQuery = {}): Promise<Hub[]> {
    const hubRows = await this.prisma.hubs.findMany();
    const vehicleRows = await this.prisma.vehicles.findMany();
    const cpRows = await this.prisma.charging_points.findMany();
    const parkingRows = await this.prisma.parking_bookings.findMany({
      where: { status: 'ACTIVE' },
    });

    const vehicles = vehicleRows.map(mapVehicleFromPrisma);
    const chargingPoints = cpRows.map(mapChargingPointFromPrisma);
    const parkingBookings = parkingRows.map(mapParkingBookingFromPrisma);

    const enriched: Hub[] = [];
    for (const row of hubRows) {
      const hub = mapHubFromPrisma(row);
      const stats = computeHubStats(hub, vehicles, chargingPoints, parkingBookings);
      enriched.push(stats);
    }

    return filterHubsList(enriched, query);
  }

  /**
   * Mục đích: Lấy ảnh chụp trạng thái tài nguyên tức thời và thông tin chi tiết của một trạm Hub theo mã định danh.
   * Cách hoạt động: Tìm trạm theo id trong bảng hubs (ném lỗi NotFoundException nếu không tồn tại), sau đó truy vấn danh sách xe, trụ sạc và lượt giữ chỗ đỗ xe cá nhân thuộc trạm đó để tổng hợp số liệu chi tiết.
   */
  async getHubResourceSnapshot(id: string): Promise<Hub> {
    const hubRow = await this.prisma.hubs.findUnique({ where: { id } });
    if (!hubRow) {
      throw new NotFoundException(`Không tìm thấy trạm Hub với mã ${id}`);
    }

    const vehicleRows = await this.prisma.vehicles.findMany({ where: { hub_id: id } });
    const cpRows = await this.prisma.charging_points.findMany({ where: { hub_id: id } });
    const parkingRows = await this.prisma.parking_bookings.findMany({
      where: { hub_id: id, status: 'ACTIVE' },
    });

    const hub = mapHubFromPrisma(hubRow);
    const vehicles = vehicleRows.map(mapVehicleFromPrisma);
    const chargingPoints = cpRows.map(mapChargingPointFromPrisma);
    const parkingBookings = parkingRows.map(mapParkingBookingFromPrisma);

    return computeHubStats(hub, vehicles, chargingPoints, parkingBookings);
  }
}

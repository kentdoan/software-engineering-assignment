import { Injectable, NotFoundException } from '@nestjs/common';
import { computeHubStats, filterHubsList, HubSearchQuery } from '../common/hub.helpers';
import {
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapParkingBookingFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers.helpers';
import { Hub } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HubsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: HubSearchQuery = {}): Promise<Hub[]> {
    const [hubRows, vehicleRows, cpRows, parkingRows] = await Promise.all([
      this.prisma.hubs.findMany(),
      this.prisma.vehicles.findMany(),
      this.prisma.charging_points.findMany(),
      this.prisma.parking_bookings.findMany({ where: { status: 'ACTIVE' } }),
    ]);

    const vehicles = vehicleRows.map(mapVehicleFromPrisma);
    const chargingPoints = cpRows.map(mapChargingPointFromPrisma);
    const parkingBookings = parkingRows.map(mapParkingBookingFromPrisma);

    const enriched = hubRows.map((h) =>
      computeHubStats(mapHubFromPrisma(h), vehicles, chargingPoints, parkingBookings),
    );
    return filterHubsList(enriched, query);
  }

  async findOne(id: string): Promise<Hub> {
    const hubRow = await this.prisma.hubs.findUnique({ where: { id } });
    if (!hubRow) {
      throw new NotFoundException(`Không tìm thấy trạm Hub với mã ${id}`);
    }

    const [vehicleRows, cpRows, parkingRows] = await Promise.all([
      this.prisma.vehicles.findMany({ where: { hub_id: id } }),
      this.prisma.charging_points.findMany({ where: { hub_id: id } }),
      this.prisma.parking_bookings.findMany({ where: { hub_id: id, status: 'ACTIVE' } }),
    ]);

    return computeHubStats(
      mapHubFromPrisma(hubRow),
      vehicleRows.map(mapVehicleFromPrisma),
      cpRows.map(mapChargingPointFromPrisma),
      parkingRows.map(mapParkingBookingFromPrisma),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { buildHubAlerts, computeHubStats, computeMonitoringStats } from '../common/hub.helpers';
import {
  mapChargingPointFromPrisma,
  mapHubFromPrisma,
  mapIncidentFromPrisma,
  mapParkingBookingFromPrisma,
  mapVehicleFromPrisma,
} from '../common/mappers.helpers';
import { HubAlert, MonitoringStats } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<MonitoringStats> {
    const [hubRows, vehRows, cpRows, incRows] = await Promise.all([
      this.prisma.hubs.findMany(),
      this.prisma.vehicles.findMany(),
      this.prisma.charging_points.findMany(),
      this.prisma.incidents.findMany(),
    ]);

    return computeMonitoringStats(
      hubRows.map(mapHubFromPrisma),
      vehRows.map(mapVehicleFromPrisma),
      cpRows.map(mapChargingPointFromPrisma),
      incRows.map(mapIncidentFromPrisma),
    );
  }

  async getAlerts(): Promise<HubAlert[]> {
    const [hubRows, vehRows, cpRows, parkingRows] = await Promise.all([
      this.prisma.hubs.findMany(),
      this.prisma.vehicles.findMany(),
      this.prisma.charging_points.findMany(),
      this.prisma.parking_bookings.findMany({ where: { status: 'ACTIVE' } }),
    ]);

    const vehicles = vehRows.map(mapVehicleFromPrisma);
    const chargingPoints = cpRows.map(mapChargingPointFromPrisma);
    const parkingBookings = parkingRows.map(mapParkingBookingFromPrisma);

    const enriched = hubRows.map((h) =>
      computeHubStats(mapHubFromPrisma(h), vehicles, chargingPoints, parkingBookings),
    );
    return buildHubAlerts(enriched, vehicles, chargingPoints);
  }
}

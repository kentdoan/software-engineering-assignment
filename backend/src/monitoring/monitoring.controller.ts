import { Controller, Get } from '@nestjs/common';
import { HubAlert, MonitoringStats } from '../common/interfaces';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('stats')
  getNetworkOverview(): Promise<MonitoringStats> {
    return this.monitoringService.getConsolidatedNetworkState();
  }

  @Get('alerts')
  getActiveAlerts(): Promise<HubAlert[]> {
    return this.monitoringService.evaluateHubThresholds();
  }
}

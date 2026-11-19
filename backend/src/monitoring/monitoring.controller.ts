import { Controller, Get } from '@nestjs/common';
import { HubAlert, MonitoringStats } from '../common/types';
import { MonitoringService } from './monitoring.service';

@Controller()
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('stats')
  getStats(): Promise<MonitoringStats> {
    return this.monitoringService.getStats();
  }

  @Get('monitoring/stats')
  getMonitoringStats(): Promise<MonitoringStats> {
    return this.monitoringService.getStats();
  }

  @Get('monitoring/alerts')
  getAlerts(): Promise<HubAlert[]> {
    return this.monitoringService.getAlerts();
  }
}

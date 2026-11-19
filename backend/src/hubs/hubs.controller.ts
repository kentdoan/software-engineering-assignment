import { Controller, Get, Param, Query } from '@nestjs/common';
import { Hub } from '../common/types';
import { HubsService } from './hubs.service';

@Controller('hubs')
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('hasAvailableVehicles') hasAvailableVehicles?: string,
    @Query('hasAvailableDocks') hasAvailableDocks?: string,
    @Query('hasAvailableCharging') hasAvailableCharging?: string,
  ): Promise<Hub[]> {
    return this.hubsService.findAll({
      q,
      lat: lat !== undefined && lat !== '' ? Number(lat) : undefined,
      lng: lng !== undefined && lng !== '' ? Number(lng) : undefined,
      radiusKm: radiusKm !== undefined && radiusKm !== '' ? Number(radiusKm) : undefined,
      hasAvailableVehicles: hasAvailableVehicles === 'true',
      hasAvailableDocks: hasAvailableDocks === 'true',
      hasAvailableCharging: hasAvailableCharging === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Hub> {
    return this.hubsService.findOne(id);
  }
}

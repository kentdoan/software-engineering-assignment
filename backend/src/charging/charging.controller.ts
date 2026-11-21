import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ChargingService } from './charging.service';
import {
  ApplySmartScheduleDto,
  CreateChargingDto,
  CreatePrivateVehicleDto,
  ProposeSlotsDto,
} from './dto/create-charging.dto';

@Controller('charging')
export class ChargingController {
  constructor(private readonly chargingService: ChargingService) {}

  @Get('private-vehicles')
  listPrivateVehicles(
    @Headers('authorization') authorization?: string,
    @Query('userId') userId?: string,
  ) {
    return this.chargingService.listPrivateVehicles(authorization, userId);
  }

  @Post('private-vehicles')
  registerPrivateVehicle(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreatePrivateVehicleDto,
  ) {
    return this.chargingService.registerPrivateVehicle(authorization, dto);
  }

  @Get('points')
  getChargingScheduleData(@Query('hubId') hubId?: string) {
    return this.chargingService.listChargingPoints(hubId);
  }

  @Post('slots/propose')
  getAvailableChargingSlots(@Body() dto: ProposeSlotsDto) {
    return this.chargingService.findOptimalChargingSlot(dto);
  }

  @Post('bookings')
  bookPrivateChargingSchedule(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateChargingDto,
  ) {
    return this.chargingService.createPrivateChargingSession(authorization, dto);
  }

  @Get('bookings')
  listChargingSessions(
    @Headers('authorization') authorization?: string,
    @Query('hubId') hubId?: string,
    @Query('onlyMine') onlyMine?: string,
  ) {
    return this.chargingService.listChargingSessions(authorization, hubId, onlyMine);
  }

  @Post('bookings/:id/cancel')
  cancelChargingBooking(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.chargingService.cancelChargingBooking(id, authorization);
  }

  @Get('priority-list')
  requestInitialSchedule(
    @Query('hubId') hubId?: string,
    @Query('excludePortIds') excludePortIds?: string,
  ) {
    return this.chargingService.optimizeChargingSchedule(hubId, excludePortIds);
  }

  @Post('schedule/apply')
  applySchedule(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: ApplySmartScheduleDto,
  ) {
    return this.chargingService.commitSchedulePlan(authorization, dto);
  }
}

import { Body, Controller, Get, Headers, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { RentalsService } from './rentals.service';

@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post('pickup')
  pickupVehicle(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateRentalDto,
  ) {
    return this.rentalsService.pickupVehicle(authorization, dto);
  }

  @Get('active')
  async getActiveRental(
    @Res() res: Response,
    @Headers('authorization') authorization?: string,
    @Query('userId') userId?: string,
  ) {
    const rental = await this.rentalsService.getActiveRental(authorization, userId);
    return res.status(HttpStatus.OK).json(rental);
  }

  @Get('history')
  getTripHistory(
    @Headers('authorization') authorization?: string,
    @Query('userId') userId?: string,
  ) {
    return this.rentalsService.getRentalHistory(authorization, userId);
  }

  @Post('return')
  returnVehicle(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateRentalDto,
  ) {
    return this.rentalsService.endTrip(authorization, dto);
  }

  @Post(':rentalId/return')
  returnVehicleByParam(
    @Param('rentalId') rentalId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateRentalDto,
  ) {
    return this.rentalsService.endTrip(authorization, {
      ...dto,
      rentalId,
    });
  }
}

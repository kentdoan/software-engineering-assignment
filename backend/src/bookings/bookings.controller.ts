import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, CreateParkingBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  reserveSharedVehicle(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createSharedVehicleBooking(authorization, dto);
  }

  @Post('parking')
  reserveParkingSpace(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateParkingBookingDto,
  ) {
    return this.bookingsService.createParkingSpaceBooking(authorization, dto);
  }

  @Get('active')
  getActiveBookings(
    @Headers('authorization') authorization?: string,
    @Query('userId') userId?: string,
  ) {
    return this.bookingsService.getActiveBookings(authorization, userId);
  }

  @Post('expire-overdue')
  expireOverdue() {
    return this.bookingsService.handleBookingExpiration15Min();
  }

  @Post(':id/cancel')
  cancelReservation(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.bookingsService.cancelBooking(id, authorization);
  }

  @Post('parking/:id/cancel')
  cancelParkingBooking(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.bookingsService.cancelBooking(id, authorization);
  }
}

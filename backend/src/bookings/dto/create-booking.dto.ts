import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  hubId: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsBoolean()
  fastReserve?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateParkingBookingDto {
  @IsString()
  hubId: string;

  @IsString()
  vehiclePlate: string;

  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

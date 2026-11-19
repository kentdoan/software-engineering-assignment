import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePrivateVehicleDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  plateNumber: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  chargerType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  batteryCapacityKwh?: number;
}

export class ProposeSlotsDto {
  @IsString()
  hubId: string;

  @IsOptional()
  @IsString()
  privateVehicleId?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentSoc?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetSoc?: number;
}

export class CreateChargingDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  hubId: string;

  @IsString()
  privateVehicleId: string;

  @IsString()
  chargingPointId: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentSoc?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetSoc?: number;
}

export class ApplySmartScheduleDto {
  @IsString()
  hubId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedPortIds?: string[];

  @IsOptional()
  @IsObject()
  departureOverrides?: Record<string, string>;
}

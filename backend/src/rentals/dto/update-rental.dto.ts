import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateRentalDto } from './create-rental.dto';

export class UpdateRentalDto extends PartialType(CreateRentalDto) {
  @IsOptional()
  @IsString()
  rentalId?: string;

  @IsString()
  destinationHubId: string;

  @IsOptional()
  @IsBoolean()
  damagedReported?: boolean;

  @IsOptional()
  @IsString()
  damageNote?: string;
}

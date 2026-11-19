import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateDispatchDto {
  @IsString()
  sourceHubId: string;

  @IsString()
  targetHubId: string;

  @IsArray()
  @IsString({ each: true })
  vehicleIds: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

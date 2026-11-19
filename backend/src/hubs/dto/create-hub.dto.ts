import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateHubDto {
  @IsString()
  name: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsInt()
  @Min(1)
  totalDocks: number;

  @IsInt()
  @Min(0)
  totalChargingPorts: number;

  @IsOptional()
  @IsString()
  description?: string;
}

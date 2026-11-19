import { IsOptional, IsString } from 'class-validator';

export class CreateMonitoringDto {
  @IsOptional()
  @IsString()
  hubId?: string;
}

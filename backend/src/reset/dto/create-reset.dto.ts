import { IsOptional, IsString } from 'class-validator';

export class CreateResetDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

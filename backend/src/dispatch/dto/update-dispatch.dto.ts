import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateDispatchDto } from './create-dispatch.dto';

export class UpdateDispatchDto extends PartialType(CreateDispatchDto) {
  @IsOptional()
  @IsString()
  status?: 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
}

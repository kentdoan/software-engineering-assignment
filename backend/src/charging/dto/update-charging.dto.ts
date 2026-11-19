import { PartialType } from '@nestjs/mapped-types';
import { CreateChargingDto } from './create-charging.dto';

export class UpdateChargingDto extends PartialType(CreateChargingDto) {}

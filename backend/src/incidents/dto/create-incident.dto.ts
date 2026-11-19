import { IsIn, IsString } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  hubId: string;

  @IsIn(['VEHICLE', 'CHARGING_POINT'])
  resourceType: 'VEHICLE' | 'CHARGING_POINT';

  @IsString()
  resourceId: string;

  @IsString()
  incidentType: string;

  @IsString()
  description: string;
}

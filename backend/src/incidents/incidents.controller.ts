import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  listIncidents(@Query('status') status?: string) {
    return this.incidentsService.listIncidents(status);
  }

  @Post()
  reportIncident(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidentsService.reportIncident(authorization, dto);
  }

  @Post(':id/resolve')
  resolveIncident(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.incidentsService.resolveIncident(id, authorization);
  }
}

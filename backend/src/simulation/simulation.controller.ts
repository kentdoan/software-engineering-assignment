import { Body, Controller, Get, Post } from '@nestjs/common';
import { Scenario, SimulationStatus } from '../common/interfaces';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SimulationService } from './simulation.service';

@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('scenarios')
  getBaselineData(): Promise<Scenario[]> {
    return this.simulationService.getScenarios();
  }

  @Get('status')
  getStatus(): Promise<SimulationStatus> {
    return this.simulationService.getStatus();
  }

  @Post('start')
  runWhatIfSimulation(@Body() dto: CreateSimulationDto): Promise<SimulationStatus> {
    return this.simulationService.startSimulation(dto);
  }

  @Post('step')
  stepSimulation(): Promise<SimulationStatus> {
    return this.simulationService.executeWhatIfEngine();
  }

  @Post('pause')
  pauseSimulation(): Promise<SimulationStatus> {
    return this.simulationService.pauseSimulation();
  }

  @Post('reset')
  resetSimulation(): Promise<SimulationStatus> {
    return this.simulationService.resetSimulation();
  }
}

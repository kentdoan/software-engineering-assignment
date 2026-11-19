import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { mapHubFromPrisma, mapScenarioFromPrisma, mapVehicleFromPrisma } from '../common/mappers.helpers';
import {
  buildWhatIfRecommendations,
  computeSimulationStepChanges,
  createInitialSimState,
  SimRuntimeState,
  toSimulationStatusDto,
} from '../common/simulation.helpers';
import { Scenario, SimulationStatus } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';

@Injectable()
export class SimulationService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulationService.name);
  private readonly state: SimRuntimeState = createInitialSimState();

  constructor(private readonly prisma: PrismaService) {}

  onModuleDestroy() {
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.state.timer = null;
    }
  }

  async getScenarios(): Promise<Scenario[]> {
    const rows = await this.prisma.scenarios.findMany();
    return rows.map(mapScenarioFromPrisma);
  }

  async getStatus(): Promise<SimulationStatus> {
    const [hubRows, vehRows] = await Promise.all([
      this.prisma.hubs.findMany(),
      this.prisma.vehicles.findMany(),
    ]);
    this.state.recommendations = buildWhatIfRecommendations(
      hubRows.map(mapHubFromPrisma),
      vehRows.map(mapVehicleFromPrisma),
      this.state.activeScenarioId,
    );
    return toSimulationStatusDto(this.state);
  }

  async stepSimulation(): Promise<SimulationStatus> {
    if (!this.state.isRunning || !this.state.activeScenarioId) {
      return this.getStatus();
    }

    const scenarioRow = await this.prisma.scenarios.findUnique({
      where: { id: this.state.activeScenarioId },
    });
    if (!scenarioRow) {
      this.state.isRunning = false;
      if (this.state.timer) {
        clearInterval(this.state.timer);
        this.state.timer = null;
      }
      return this.getStatus();
    }

    const [hubRows, vehRows] = await Promise.all([
      this.prisma.hubs.findMany(),
      this.prisma.vehicles.findMany(),
    ]);

    const outcome = computeSimulationStepChanges(
      this.state,
      mapScenarioFromPrisma(scenarioRow),
      hubRows.map(mapHubFromPrisma),
      vehRows.map(mapVehicleFromPrisma),
    );

    if (outcome.modifiedVehicles.length > 0) {
      await this.prisma.$transaction(
        outcome.modifiedVehicles.map((v) =>
          this.prisma.vehicles.update({
            where: { id: v.id },
            data: {
              hub_id: v.hubId,
              battery_soc: v.batterySoc,
              status: v.status,
            },
          }),
        ),
      );
    }

    if (outcome.completed) {
      if (this.state.timer) {
        clearInterval(this.state.timer);
        this.state.timer = null;
      }
      this.logger.log(`Simulation ${scenarioRow.id} finished cleanly`);
    }

    return toSimulationStatusDto(this.state);
  }

  async startSimulation(dto: CreateSimulationDto): Promise<SimulationStatus> {
    const speed = dto.speed || 1;
    const passengerMultiplier = dto.passengerMultiplier || 1;

    const scenarioRow = await this.prisma.scenarios.findUnique({
      where: { id: dto.scenarioId },
    });
    if (!scenarioRow) {
      throw new NotFoundException(`Không tìm thấy kịch bản mô phỏng ${dto.scenarioId}`);
    }

    if (speed <= 0 || passengerMultiplier <= 0) {
      throw new BadRequestException('Tốc độ và hệ số hành khách phải lớn hơn 0.');
    }

    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.state.timer = null;
    }

    if (!this.state.preSimVehiclesSnapshot) {
      const vehRows = await this.prisma.vehicles.findMany();
      this.state.preSimVehiclesSnapshot = vehRows.map(mapVehicleFromPrisma);
    }

    if (
      this.state.activeScenarioId !== dto.scenarioId ||
      this.state.currentStep >= this.state.totalSteps
    ) {
      this.state.currentStep = 0;
      this.state.logs = [`Khởi chạy kịch bản mô phỏng: ${scenarioRow.name} (x${passengerMultiplier})`];
    }

    this.state.activeScenarioId = dto.scenarioId;
    this.state.speed = speed;
    this.state.passengerMultiplier = passengerMultiplier;
    this.state.isRunning = true;

    const intervalMs = Math.max(500, Math.round(2500 / speed));
    this.state.timer = setInterval(() => {
      void this.stepSimulation();
    }, intervalMs);

    return this.stepSimulation();
  }

  async pauseSimulation(): Promise<SimulationStatus> {
    this.state.isRunning = false;
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.state.timer = null;
    }
    this.state.logs.unshift(`[${new Date().toLocaleTimeString('vi-VN')}] Đã tạm dừng mô phỏng.`);
    return this.getStatus();
  }

  async resetSimulation(): Promise<SimulationStatus> {
    this.state.isRunning = false;
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.state.timer = null;
    }
    this.state.activeScenarioId = null;
    this.state.currentStep = 0;
    this.state.logs = [];
    this.state.recommendations = [];

    if (this.state.preSimVehiclesSnapshot) {
      const snapshot = this.state.preSimVehiclesSnapshot;
      await this.prisma.$transaction(
        snapshot.map((v) =>
          this.prisma.vehicles.update({
            where: { id: v.id },
            data: {
              hub_id: v.hubId,
              battery_soc: v.batterySoc,
              status: v.status,
              bay_code: v.bayCode ?? null,
            },
          }),
        ),
      );
      this.state.preSimVehiclesSnapshot = null;
    }

    return this.getStatus();
  }
}

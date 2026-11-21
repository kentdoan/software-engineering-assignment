import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Scenario, SimRuntimeState, SimulationStatus } from '../common/interfaces';
import { mapHubFromPrisma, mapScenarioFromPrisma, mapVehicleFromPrisma } from '../common/mappers';
import { computeSimulationStepChanges } from '../common/simulators/scenario-step.simulator';
import {
  createInitialSimState,
  toSimulationStatusDto,
} from '../common/simulators/simulation-state.simulator';
import { generateRecommendations } from '../common/simulators/what-if-advisor.simulator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';

@Injectable()
export class SimulationService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulationService.name);
  private readonly state: SimRuntimeState = createInitialSimState();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mục đích: Dọn dẹp bộ đếm chu kỳ mô phỏng khi module bị hủy để tránh rò rỉ tiến trình chạy ngầm.
   * Cách hoạt động: Kiểm tra nếu state.timer đang hoạt động thì gọi clearInterval và đặt lại về null.
   */
  onModuleDestroy() {
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.state.timer = null;
    }
  }

  /**
   * Mục đích: Lấy danh sách các kịch bản mô phỏng giả định đã cấu hình sẵn trong hệ thống.
   * Cách hoạt động: Truy vấn toàn bộ bản ghi từ bảng scenarios và chuyển đổi sang định dạng Scenario chuẩn.
   */
  async getScenarios(): Promise<Scenario[]> {
    const rows = await this.prisma.scenarios.findMany();
    return rows.map(mapScenarioFromPrisma);
  }

  /**
   * Mục đích: Tạo ảnh chụp trạng thái đội xe trong bộ nhớ trước khi chạy mô phỏng để phục vụ khôi phục về sau.
   * Cách hoạt động: Kiểm tra nếu chưa có preSimVehiclesSnapshot thì đọc toàn bộ danh sách xe hiện tại từ bảng vehicles, ánh xạ sang định dạng Vehicle và lưu vào bộ nhớ.
   */
  async createInMemorySnapshot(): Promise<void> {
    if (!this.state.preSimVehiclesSnapshot) {
      const vehRows = await this.prisma.vehicles.findMany();
      this.state.preSimVehiclesSnapshot = vehRows.map(mapVehicleFromPrisma);
    }
  }

  /**
   * Mục đích: Trả về trạng thái hiện thời của quá trình mô phỏng cùng danh sách khuyến nghị điều phối mới nhất.
   * Cách hoạt động: Đọc danh sách trạm Hub và phương tiện hiện tại từ cơ sở dữ liệu, tính lại các khuyến nghị cân bằng qua generateRecommendations rồi đóng gói trạng thái mô phỏng bằng toSimulationStatusDto.
   */
  async getStatus(): Promise<SimulationStatus> {
    const hubRows = await this.prisma.hubs.findMany();
    const vehRows = await this.prisma.vehicles.findMany();

    this.state.recommendations = generateRecommendations(
      hubRows.map(mapHubFromPrisma),
      vehRows.map(mapVehicleFromPrisma),
      this.state.activeScenarioId,
    );
    return toSimulationStatusDto(this.state);
  }

  /**
   * Mục đích: Thực thi một bước mô phỏng của kịch bản đang chạy và cập nhật biến động lên hệ thống.
   * Cách hoạt động: Kiểm tra mô phỏng đang bật và kịch bản tồn tại; tải dữ liệu trạm và xe hiện tại, gọi computeSimulationStepChanges để tính các thay đổi trong một bước, lưu lần lượt từng xe bị thay đổi vào bảng vehicles và dừng bộ đếm thời gian nếu đã hoàn tất chu kỳ 20 bước.
   */
  async executeWhatIfEngine(): Promise<SimulationStatus> {
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

    const hubRows = await this.prisma.hubs.findMany();
    const vehRows = await this.prisma.vehicles.findMany();

    const outcome = computeSimulationStepChanges(
      this.state,
      mapScenarioFromPrisma(scenarioRow),
      hubRows.map(mapHubFromPrisma),
      vehRows.map(mapVehicleFromPrisma),
    );

    for (const v of outcome.modifiedVehicles) {
      await this.prisma.vehicles.update({
        where: { id: v.id },
        data: {
          hub_id: v.hubId,
          battery_soc: v.batterySoc,
          status: v.status,
        },
      });
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

  /**
   * Mục đích: Khởi chạy hoặc tiếp tục chạy một kịch bản mô phỏng giả định với tốc độ và hệ số hành khách tùy chỉnh.
   * Cách hoạt động: Kiểm tra kịch bản tồn tại và tham số tốc độ, hệ số phải lớn hơn 0; gọi createInMemorySnapshot để lưu ảnh chụp trạng thái xe ban đầu, thiết lập bộ đếm chạy định kỳ theo tốc độ đã chọn và gọi executeWhatIfEngine cho bước đầu tiên.
   */
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

    await this.createInMemorySnapshot();

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
      void this.executeWhatIfEngine();
    }, intervalMs);

    return this.executeWhatIfEngine();
  }

  /**
   * Mục đích: Tạm dừng quá trình chạy tự động của kịch bản mô phỏng hiện tại.
   * Cách hoạt động: Đặt cờ isRunning thành false, dừng bộ đếm thời gian định kỳ, ghi nhận một dòng nhật ký tạm dừng và trả về trạng thái hiện thời.
   */
  async pauseSimulation(): Promise<SimulationStatus> {
    this.state.isRunning = false;
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.state.timer = null;
    }
    this.state.logs.unshift(`[${new Date().toLocaleTimeString('vi-VN')}] Đã tạm dừng mô phỏng.`);
    return this.getStatus();
  }

  /**
   * Mục đích: Dừng mô phỏng, xóa nhật ký mô phỏng và khôi phục toàn bộ trạng thái xe về đúng ảnh chụp trước khi chạy mô phỏng.
   * Cách hoạt động: Tắt bộ đếm thời gian và đặt lại các biến trạng thái về ban đầu; nếu có preSimVehiclesSnapshot thì duyệt lần lượt từng xe để cập nhật lại vị trí trạm, phần trăm pin, trạng thái và mã ô đỗ gốc trong bảng vehicles rồi xóa ảnh chụp tạm.
   */
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
      for (const v of snapshot) {
        await this.prisma.vehicles.update({
          where: { id: v.id },
          data: {
            hub_id: v.hubId,
            battery_soc: v.batterySoc,
            status: v.status,
            bay_code: v.bayCode ?? null,
          },
        });
      }
      this.state.preSimVehiclesSnapshot = null;
    }

    return this.getStatus();
  }
}

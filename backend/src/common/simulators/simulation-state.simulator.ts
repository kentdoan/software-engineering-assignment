import { SimRuntimeState, SimulationStatus } from '../interfaces';

/**
 * Mục đích: Khởi tạo trạng thái mặc định ban đầu cho bộ máy mô phỏng vận hành What-if trong bộ nhớ.
 * Cách hoạt động: Trả về đối tượng SimRuntimeState với trạng thái chưa chạy, bước hiện tại bằng 0, tổng 20 bước, danh sách nhật ký rỗng và chưa có bộ đếm thời gian hay ảnh chụp dữ liệu xe.
 */
export function createInitialSimState(): SimRuntimeState {
  return {
    isRunning: false,
    activeScenarioId: null,
    speed: 1,
    passengerMultiplier: 1,
    currentStep: 0,
    totalSteps: 20,
    logs: [],
    recommendations: [],
    timer: null,
    preSimVehiclesSnapshot: null,
  };
}

/**
 * Mục đích: Chuyển đổi trạng thái nội bộ của bộ máy mô phỏng sang dữ liệu phản hồi an toàn cho API.
 * Cách hoạt động: Trích xuất các thông tin hiển thị như cờ đang chạy, kịch bản, tốc độ, bước mô phỏng, nhật ký và khuyến nghị, đồng thời loại bỏ timer và ảnh chụp nội bộ không thể tuần tự hóa.
 */
export function toSimulationStatusDto(state: SimRuntimeState): SimulationStatus {
  return {
    isRunning: state.isRunning,
    activeScenarioId: state.activeScenarioId,
    speed: state.speed,
    passengerMultiplier: state.passengerMultiplier,
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    logs: state.logs,
    recommendations: state.recommendations,
  };
}

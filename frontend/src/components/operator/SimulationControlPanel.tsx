import React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Scenario } from '../../types/operations.types';

interface SimulationControlPanelProps {
  scenarios: Scenario[];
  selectedScenarioId: string;
  speed: number;
  passengerMultiplier: number;
  isRunning: boolean;
  busy: boolean;
  onSelectScenario: (scenarioId: string) => void;
  onChangeSpeed: (speed: number) => void;
  onChangePassengerMultiplier: (multiplier: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

/**
 * Mục đích: Bảng chọn kịch bản giả lập What-If, cấu hình tốc độ/hệ số lưu lượng và điều khiển chạy/tạm dừng/đặt lại.
 */
export const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
  scenarios,
  selectedScenarioId,
  speed,
  passengerMultiplier,
  isRunning,
  busy,
  onSelectScenario,
  onChangeSpeed,
  onChangePassengerMultiplier,
  onStart,
  onPause,
  onReset,
}) => (
  <div className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-5">
    <h3 className="text-base font-bold text-[#1b211e]">Cấu hình kịch bản</h3>
    <div className="space-y-2.5">
      {scenarios.map((sc) => (
        <button
          key={sc.id}
          type="button"
          onClick={() => onSelectScenario(sc.id)}
          className={`w-full rounded-2xl border p-3.5 text-left transition ${
            selectedScenarioId === sc.id
              ? 'border-[#006a4e] bg-[#e6f5ee]'
              : 'border-[#dfe5e1] bg-[#f8f9fa] hover:bg-[#e9efec]'
          }`}
        >
          <p className="text-xs font-bold text-[#1b211e]">{sc.name}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#59645e]">{sc.description}</p>
        </button>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-3 pt-1">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Tốc độ mô phỏng</label>
        <select
          value={speed}
          onChange={(e) => onChangeSpeed(Number(e.target.value))}
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-xs font-bold outline-none"
        >
          <option value={1}>1x (Chậm)</option>
          <option value={2}>2x (Tiêu chuẩn)</option>
          <option value={4}>4x (Nhanh)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Hệ số lưu lượng</label>
        <select
          value={passengerMultiplier}
          onChange={(e) => onChangePassengerMultiplier(Number(e.target.value))}
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-xs font-bold outline-none"
        >
          <option value={1}>x1.0 Bình thường</option>
          <option value={1.5}>x1.5 Cao điểm</option>
          <option value={2}>x2.0 Đột biến</option>
        </select>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 pt-2">
      <button
        type="button"
        disabled={busy || isRunning}
        onClick={onStart}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#006a4e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#00513b] disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" /> Chạy mô phỏng
      </button>
      <button
        type="button"
        disabled={busy || !isRunning}
        onClick={onPause}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#dfe5e1] bg-white px-4 py-2.5 text-xs font-bold text-[#1b211e] hover:bg-[#e9efec] disabled:opacity-50"
      >
        <Pause className="h-3.5 w-3.5" /> Tạm dừng
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onReset}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
      </button>
    </div>
  </div>
);

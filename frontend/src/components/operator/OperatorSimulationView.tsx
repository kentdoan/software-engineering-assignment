import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { dispatchApi, getErrorMessage, simulationApi } from '../../services/api';
import { Scenario, SimulationStatus, WhatIfRecommendation } from '../../types';

interface OperatorSimulationViewProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const OperatorSimulationView: React.FC<OperatorSimulationViewProps> = ({ notify }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('METRO_PEAK_HOUR');
  const [speed, setSpeed] = useState(2);
  const [passengerMultiplier, setPassengerMultiplier] = useState(1);
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [scList, st] = await Promise.all([
        simulationApi.getScenarios(),
        simulationApi.getStatus(),
      ]);
      setScenarios(scList);
      setStatus(st);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [notify]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.isRunning) return;
    const timer = setInterval(() => {
      simulationApi.getStatus().then(setStatus).catch(() => {});
    }, 1000);
    return () => clearInterval(timer);
  }, [status?.isRunning]);

  const handleStart = async () => {
    setBusy(true);
    try {
      const st = await simulationApi.start(selectedScenarioId, speed, passengerMultiplier);
      setStatus(st);
      notify('info', 'Đã khởi chạy kịch bản mô phỏng What-If.');
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    setBusy(true);
    try {
      const st = await simulationApi.pause();
      setStatus(st);
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      const st = await simulationApi.reset();
      setStatus(st);
      notify('success', 'Đã đưa hệ thống về snapshot ban đầu.');
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleApplyRecommendation = async (rec: WhatIfRecommendation) => {
    try {
      const created = await dispatchApi.create({
        sourceHubId: rec.sourceHubId,
        targetHubId: rec.targetHubId,
        vehicleIds: rec.vehicleIds,
        note: `Theo khuyến nghị mô phỏng: ${rec.reason}`,
      });
      notify('success', `Đã phát hành lệnh điều phối ${created.code} theo khuyến nghị!`);
      const st = await simulationApi.getStatus();
      setStatus(st);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const pct = status ? Math.round((status.currentStep / status.totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Mô phỏng Kịch bản What-If & Khuyến nghị</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Kiểm thử áp lực mạng lưới trong các kịch bản cao điểm giả lập và nhận đề xuất điều phối xe tối ưu
        </p>
      </div>

      {/* Scenario Selector + Controls */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="text-base font-bold text-[#1b211e]">Cấu hình kịch bản</h3>
          <div className="space-y-2.5">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelectedScenarioId(sc.id)}
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
                onChange={(e) => setSpeed(Number(e.target.value))}
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
                onChange={(e) => setPassengerMultiplier(Number(e.target.value))}
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
              disabled={busy || status?.isRunning}
              onClick={handleStart}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#006a4e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#00513b] disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Chạy mô phỏng
            </button>
            <button
              type="button"
              disabled={busy || !status?.isRunning}
              onClick={handlePause}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#dfe5e1] bg-white px-4 py-2.5 text-xs font-bold text-[#1b211e] hover:bg-[#e9efec] disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" /> Tạm dừng
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
            </button>
          </div>
        </div>

        {/* Right: Logs + Progress + Recommendations */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#1b211e]">
              <span>Tiến trình mô phỏng</span>
              <span className="text-[#006a4e]">
                Bước {status?.currentStep ?? 0} / {status?.totalSteps ?? 20} ({pct}%)
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#e9efec]">
              <div
                className="h-full rounded-full bg-[#006a4e] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-4 h-[210px] overflow-y-auto rounded-2xl border border-[#dfe5e1] bg-[#1b211e] p-4 font-mono text-[11px] leading-relaxed text-[#ccebdd]">
              {(status?.logs || []).length === 0 ? (
                <span className="text-[#87938c]">
                  Nhấn "Chạy mô phỏng" để quan sát diễn biến kịch bản theo từng bước thời gian...
                </span>
              ) : (
                status?.logs.map((line, i) => (
                  <div
                    key={i}
                    className={line.includes('[CẢNH BÁO]') ? 'font-bold text-amber-300' : ''}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#ccebdd] bg-[#e6f5ee] p-6">
            <h3 className="flex items-center gap-2 text-base font-bold text-[#00513b]">
              <Sparkles className="h-4 w-4" />
              <span>Khuyến nghị điều phối tự động</span>
            </h3>
            <div className="mt-3 space-y-2.5">
              {(status?.recommendations || []).length === 0 ? (
                <p className="text-xs text-[#00513b]">
                  Phân bố phương tiện hiện tại ở mức ổn định, chưa cần điều phối khẩn cấp.
                </p>
              ) : (
                status?.recommendations?.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3.5 shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1b211e]">
                        {rec.sourceHubName} → {rec.targetHubName} ({rec.recommendedVehicleCount} xe)
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#59645e]">{rec.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyRecommendation(rec)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#006a4e] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#00513b]"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Tạo lệnh ngay
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { SimulationControlPanel } from '../../components/operator/SimulationControlPanel';
import { SimulationOutputPanel } from '../../components/operator/SimulationOutputPanel';
import { PageHeader } from '../../components/ui/PageHeader';
import { dispatchApi } from '../../services/dispatch.api';
import { getErrorMessage } from '../../services/httpClient';
import { simulationApi } from '../../services/simulation.api';
import { Scenario, SimulationStatus, WhatIfRecommendation } from '../../types/operations.types';

interface OperatorSimulationPageProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Mô phỏng kịch bản What-If kiểm thử áp lực mạng lưới và thực thi khuyến nghị điều phối tự động.
 */
export const OperatorSimulationPage: React.FC<OperatorSimulationPageProps> = ({ notify }) => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mô phỏng Kịch bản What-If & Khuyến nghị"
        description="Kiểm thử áp lực mạng lưới trong các kịch bản cao điểm giả lập và nhận đề xuất điều phối xe tối ưu"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <SimulationControlPanel
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          speed={speed}
          passengerMultiplier={passengerMultiplier}
          isRunning={Boolean(status?.isRunning)}
          busy={busy}
          onSelectScenario={setSelectedScenarioId}
          onChangeSpeed={setSpeed}
          onChangePassengerMultiplier={setPassengerMultiplier}
          onStart={() => void handleStart()}
          onPause={() => void handlePause()}
          onReset={() => void handleReset()}
        />

        <SimulationOutputPanel
          status={status}
          onApplyRecommendation={(rec) => void handleApplyRecommendation(rec)}
        />
      </div>
    </div>
  );
};

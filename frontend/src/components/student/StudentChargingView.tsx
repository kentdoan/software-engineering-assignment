import React, { useCallback, useEffect, useState } from 'react';
import { BatteryCharging, PlusCircle, Sparkles, XCircle, Zap } from 'lucide-react';
import { chargingApi, getErrorMessage, hubsApi } from '../../services/api';
import {
  ChargingSession,
  ChargingSlotProposal,
  Hub,
  PrivateVehicle,
} from '../../types';
import { formatVnd, StatusBadge } from '../ui/Badges';

interface StudentChargingViewProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const StudentChargingView: React.FC<StudentChargingViewProps> = ({ notify }) => {
  const [privateVehicles, setPrivateVehicles] = useState<PrivateVehicle[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [sessions, setSessions] = useState<ChargingSession[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedHubId, setSelectedHubId] = useState('hub-01');
  const [startTime, setStartTime] = useState('09:30');
  const [currentSoc, setCurrentSoc] = useState(25);
  const [targetSoc, setTargetSoc] = useState(85);
  const [proposals, setProposals] = useState<ChargingSlotProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newChargerType, setNewChargerType] = useState('STANDARD');
  const [newCap, setNewCap] = useState('3.2');

  const loadData = useCallback(async () => {
    try {
      const [pvList, hubList, sessionList] = await Promise.all([
        chargingApi.listPrivateVehicles(),
        hubsApi.getAll(),
        chargingApi.listSessions({ onlyMine: true }),
      ]);
      setPrivateVehicles(pvList);
      if (pvList.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(pvList[0].id);
      }
      setHubs(hubList);
      setSessions(sessionList);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [selectedVehicleId, notify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await chargingApi.registerPrivateVehicle({
        plateNumber: newPlate,
        model: newModel,
        vehicleType: 'Xe máy điện cá nhân',
        chargerType: newChargerType,
        batteryCapacityKwh: Number(newCap),
      });
      setPrivateVehicles((prev) => [...prev, created]);
      setSelectedVehicleId(created.id);
      setShowAddVehicle(false);
      setNewPlate('');
      setNewModel('');
      setNewCap('3.2');
      notify('success', `Đã thêm xe điện cá nhân ${created.plateNumber}.`);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleProposeSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProposals(true);
    try {
      const res = await chargingApi.proposeSlots({
        hubId: selectedHubId,
        privateVehicleId: selectedVehicleId || undefined,
        startTime,
        currentSoc: Number(currentSoc),
        targetSoc: Number(targetSoc),
      });
      setProposals(res.proposals);
      if (res.proposals.length === 0) {
        notify('warning', 'Hub này hiện không còn trụ sạc tương thích đang trống.');
      }
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleConfirmProposal = async (proposal: ChargingSlotProposal) => {
    if (!selectedVehicleId) {
      notify('warning', 'Vui lòng chọn hoặc đăng ký xe cá nhân trước.');
      return;
    }
    try {
      const created = await chargingApi.bookPrivateSlot({
        hubId: selectedHubId,
        privateVehicleId: selectedVehicleId,
        chargingPointId: proposal.chargingPointId,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        currentSoc: Number(currentSoc),
        targetSoc: Number(targetSoc),
      });
      setProposals([]);
      notify('success', `Đã đặt trụ ${created.chargingPointCode} (Ô ${created.bayCode}) thành công!`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleCancelSession = async (id: string) => {
    try {
      await chargingApi.cancelSession(id);
      notify('info', 'Đã hủy lịch đặt sạc cá nhân.');
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1b211e]">Đặt lịch sạc xe điện cá nhân</h2>
          <p className="mt-1 text-sm text-[#59645e]">
            Chọn phương tiện cá nhân, nhận gợi ý trụ sạc tương thích và đặt trước khung giờ sạc tối ưu
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddVehicle((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-[#006a4e] bg-white px-4 py-2 text-xs font-bold text-[#006a4e] hover:bg-[#e6f5ee]"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{showAddVehicle ? 'Đóng biểu mẫu' : 'Thêm xe cá nhân mới'}</span>
        </button>
      </div>

      {showAddVehicle && (
        <form
          onSubmit={handleRegisterVehicle}
          className="grid gap-3 rounded-3xl border border-[#ccebdd] bg-[#e6f5ee] p-5 sm:grid-cols-5"
        >
          <input
            required
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value)}
            placeholder="Biển số (59-MD1-...)"
            className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
          />
          <input
            required
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder="Mẫu xe (VD: Feliz S)"
            className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
          />
          <select
            value={newChargerType}
            onChange={(e) => setNewChargerType(e.target.value)}
            className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
          >
            <option value="STANDARD">Chuẩn Phổ thông</option>
            <option value="TYPE_2">Chuẩn Type 2</option>
            <option value="FAST_DC">Sạc nhanh DC</option>
          </select>
          <input
            type="number"
            step="0.1"
            min="1"
            value={newCap}
            onChange={(e) => setNewCap(e.target.value)}
            placeholder="Dung lượng (kWh)"
            className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
          />
          <button
            type="submit"
            className="rounded-full bg-[#006a4e] px-4 py-2 text-xs font-bold text-white hover:bg-[#00513b]"
          >
            Lưu phương tiện
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Request Slot Proposal Form */}
        <form
          onSubmit={handleProposeSlots}
          className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-5"
        >
          <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
            <Sparkles className="h-4 w-4 text-[#006a4e]" />
            <span>Thông số yêu cầu sạc</span>
          </h3>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#1b211e]">Xe cá nhân của bạn</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e]"
            >
              {privateVehicles.map((pv) => (
                <option key={pv.id} value={pv.id}>
                  {pv.plateNumber} — {pv.model} ({pv.chargerType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trạm Hub đặt sạc</label>
            <select
              value={selectedHubId}
              onChange={(e) => setSelectedHubId(e.target.value)}
              className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e]"
            >
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.availableChargingPorts ?? 0} trụ trống)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1b211e]">Giờ đến</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-2.5 py-2 text-xs outline-none focus:border-[#006a4e]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1b211e]">Pin hiện tại (%)</label>
              <input
                type="number"
                min={5}
                max={90}
                value={currentSoc}
                onChange={(e) => setCurrentSoc(Number(e.target.value))}
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-2.5 py-2 text-xs outline-none focus:border-[#006a4e]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mục tiêu (%)</label>
              <input
                type="number"
                min={20}
                max={100}
                value={targetSoc}
                onChange={(e) => setTargetSoc(Number(e.target.value))}
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-2.5 py-2 text-xs outline-none focus:border-[#006a4e]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingProposals}
            className="w-full rounded-full bg-[#006a4e] py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#00513b] disabled:opacity-60"
          >
            {loadingProposals ? 'Đang tìm trụ sạc...' : 'Gợi ý khung giờ & Trụ sạc'}
          </button>
        </form>

        {/* Right: Slot Proposals */}
        <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
            <Zap className="h-4 w-4 text-[#006a4e]" />
            <span>Trụ sạc & Khung giờ đề xuất</span>
          </h3>

          {proposals.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-[#f8f9fa] p-8 text-center text-xs text-[#59645e]">
              Nhấn "Gợi ý khung giờ & Trụ sạc" ở cột bên trái để hệ thống tìm trụ tương thích tốt nhất.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {proposals.map((p) => (
                <div
                  key={p.chargingPointId}
                  className="flex flex-col justify-between rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1b211e]">{p.chargingPointCode}</span>
                      <StatusBadge variant="emerald">{p.powerKw} kW</StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-[#59645e]">
                      Ô sạc {p.bayCode} · Chuẩn {p.connectorType}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[#1b211e]">
                      Khung giờ: <strong>{p.startTime} - {p.endTime}</strong> ({p.estimatedMinutes} phút)
                    </p>
                    <p className="mt-0.5 text-xs text-[#006a4e]">
                      Chi phí dự kiến: <strong>{formatVnd(p.estimatedCostVnd)}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConfirmProposal(p)}
                    className="mt-3 w-full rounded-full bg-[#006a4e] py-2 text-xs font-bold text-white hover:bg-[#00513b]"
                  >
                    Xác nhận đặt lịch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Sessions List */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
          <BatteryCharging className="h-4 w-4 text-[#006a4e]" />
          <span>Lịch sạc cá nhân đã đặt</span>
        </h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
                <th className="px-3 py-2.5 font-bold">Mã lịch</th>
                <th className="px-3 py-2.5 font-bold">Phương tiện</th>
                <th className="px-3 py-2.5 font-bold">Trụ / Ô sạc</th>
                <th className="px-3 py-2.5 font-bold">Thời gian</th>
                <th className="px-3 py-2.5 font-bold">Trạng thái</th>
                <th className="px-3 py-2.5 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe5e1]">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[#59645e]">
                    Chưa có lịch đặt sạc cá nhân nào.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2.5 font-bold text-[#1b211e]">{s.code}</td>
                    <td className="px-3 py-2.5 text-[#59645e]">{s.vehicleLabel}</td>
                    <td className="px-3 py-2.5 font-medium text-[#006a4e]">
                      {s.chargingPointCode} ({s.bayCode})
                    </td>
                    <td className="px-3 py-2.5 text-[#59645e]">
                      {s.date} · {s.startTime} - {s.endTime}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.status === 'SCHEDULED' && <StatusBadge variant="info">Đã đặt lịch</StatusBadge>}
                      {s.status === 'CHARGING' && <StatusBadge variant="warning">Đang sạc</StatusBadge>}
                      {s.status === 'CANCELLED' && <StatusBadge variant="neutral">Đã hủy</StatusBadge>}
                      {s.status === 'COMPLETED' && <StatusBadge variant="success">Hoàn tất</StatusBadge>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {s.status === 'SCHEDULED' && (
                        <button
                          type="button"
                          onClick={() => handleCancelSession(s.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-bold text-rose-700 hover:bg-rose-100"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Hủy
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

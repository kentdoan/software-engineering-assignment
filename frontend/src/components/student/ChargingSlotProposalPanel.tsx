import React from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { ChargingSlotProposal, PrivateVehicle } from '../../types/charging.types';
import { Hub } from '../../types/hub.types';
import { formatVnd } from '../../utils/formatters';
import { StatusBadge } from '../ui/Badges';

interface ChargingSlotProposalPanelProps {
  privateVehicles: PrivateVehicle[];
  hubs: Hub[];
  selectedVehicleId: string;
  selectedHubId: string;
  startTime: string;
  currentSoc: number;
  targetSoc: number;
  proposals: ChargingSlotProposal[];
  loadingProposals: boolean;
  onSelectVehicleId: (id: string) => void;
  onSelectHubId: (id: string) => void;
  onChangeStartTime: (val: string) => void;
  onChangeCurrentSoc: (val: number) => void;
  onChangeTargetSoc: (val: number) => void;
  onSubmitPropose: (e: React.FormEvent) => void;
  onConfirmProposal: (proposal: ChargingSlotProposal) => void;
}

/**
 * Mục đích: Kết hợp biểu mẫu nhập thông số yêu cầu sạc và danh sách trụ sạc, khung giờ đề xuất tương thích.
 */
export const ChargingSlotProposalPanel: React.FC<ChargingSlotProposalPanelProps> = ({
  privateVehicles,
  hubs,
  selectedVehicleId,
  selectedHubId,
  startTime,
  currentSoc,
  targetSoc,
  proposals,
  loadingProposals,
  onSelectVehicleId,
  onSelectHubId,
  onChangeStartTime,
  onChangeCurrentSoc,
  onChangeTargetSoc,
  onSubmitPropose,
  onConfirmProposal,
}) => (
  <div className="grid gap-6 lg:grid-cols-12">
    {/* Cột trái: Biểu mẫu thông số yêu cầu sạc */}
    <form
      onSubmit={onSubmitPropose}
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
          onChange={(e) => onSelectVehicleId(e.target.value)}
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
          onChange={(e) => onSelectHubId(e.target.value)}
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
            onChange={(e) => onChangeStartTime(e.target.value)}
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
            onChange={(e) => onChangeCurrentSoc(Number(e.target.value))}
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
            onChange={(e) => onChangeTargetSoc(Number(e.target.value))}
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

    {/* Cột phải: Danh sách đề xuất trụ sạc */}
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
                onClick={() => onConfirmProposal(p)}
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
);

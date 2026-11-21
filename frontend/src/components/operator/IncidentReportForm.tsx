import React from 'react';
import { Wrench } from 'lucide-react';
import { Hub } from '../../types/hub.types';

export interface ResourceOption {
  id: string;
  label: string;
}

interface IncidentReportFormProps {
  hubs: Hub[];
  hubId: string;
  resourceType: 'VEHICLE' | 'CHARGING_POINT';
  resourceId: string;
  resourceOptions: ResourceOption[];
  incidentType: string;
  description: string;
  submitting: boolean;
  onChangeHubId: (hubId: string) => void;
  onChangeResourceType: (type: 'VEHICLE' | 'CHARGING_POINT') => void;
  onChangeResourceId: (id: string) => void;
  onChangeIncidentType: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Biểu mẫu tiếp nhận phản ánh hư hỏng phương tiện hoặc trụ sạc và gửi yêu cầu cô lập bảo trì.
 */
export const IncidentReportForm: React.FC<IncidentReportFormProps> = ({
  hubs,
  hubId,
  resourceType,
  resourceId,
  resourceOptions,
  incidentType,
  description,
  submitting,
  onChangeHubId,
  onChangeResourceType,
  onChangeResourceId,
  onChangeIncidentType,
  onChangeDescription,
  onSubmit,
}) => (
  <form
    onSubmit={onSubmit}
    className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-5"
  >
    <h3 className="flex items-center gap-2 text-base font-bold text-[#1b211e]">
      <Wrench className="h-4 w-4 text-rose-600" />
      <span>Tạo phiếu sự cố mới</span>
    </h3>

    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trạm Hub xảy ra sự cố</label>
      <select
        value={hubId}
        onChange={(e) => onChangeHubId(e.target.value)}
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#006a4e]"
      >
        {hubs.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </div>

    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => onChangeResourceType('VEHICLE')}
        className={`rounded-xl border py-2 text-xs font-bold transition ${
          resourceType === 'VEHICLE'
            ? 'border-[#006a4e] bg-[#ccebdd] text-[#00513b]'
            : 'border-[#dfe5e1] bg-white text-[#59645e]'
        }`}
      >
        Phương tiện
      </button>
      <button
        type="button"
        onClick={() => onChangeResourceType('CHARGING_POINT')}
        className={`rounded-xl border py-2 text-xs font-bold transition ${
          resourceType === 'CHARGING_POINT'
            ? 'border-[#006a4e] bg-[#ccebdd] text-[#00513b]'
            : 'border-[#dfe5e1] bg-white text-[#59645e]'
        }`}
      >
        Trụ sạc
      </button>
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Chọn thiết bị gặp sự cố</label>
      <select
        value={resourceId}
        onChange={(e) => onChangeResourceId(e.target.value)}
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-xs outline-none focus:border-[#006a4e]"
      >
        {resourceOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Phân loại sự cố</label>
      <input
        required
        value={incidentType}
        onChange={(e) => onChangeIncidentType(e.target.value)}
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
      />
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mô tả chi tiết</label>
      <textarea
        required
        rows={3}
        value={description}
        onChange={(e) => onChangeDescription(e.target.value)}
        placeholder="Mô tả triệu chứng hư hỏng cần cô lập bảo trì..."
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
      />
    </div>

    <button
      type="submit"
      disabled={submitting || !resourceId}
      className="w-full rounded-full bg-rose-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
    >
      {submitting ? 'Đang cô lập...' : 'Báo cáo & Cô lập bảo trì'}
    </button>
  </form>
);

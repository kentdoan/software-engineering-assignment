import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Wrench } from 'lucide-react';
import { getErrorMessage, hubsApi, incidentsApi } from '../../services/api';
import { Hub, IncidentReport } from '../../types';
import { formatTimeShort, renderIncidentBadge } from '../ui/Badges';

interface OperatorIncidentsViewProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const OperatorIncidentsView: React.FC<OperatorIncidentsViewProps> = ({ notify }) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [hubId, setHubId] = useState('hub-01');
  const [resourceType, setResourceType] = useState<'VEHICLE' | 'CHARGING_POINT'>('VEHICLE');
  const [resourceId, setResourceId] = useState('');
  const [incidentType, setIncidentType] = useState('Lỗi kỹ thuật / Cảm biến');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [hList, iList] = await Promise.all([hubsApi.getAll(), incidentsApi.list()]);
      setHubs(hList);
      setIncidents(iList);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [notify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentHub = hubs.find((h) => h.id === hubId);
  const resourceOptions =
    resourceType === 'VEHICLE'
      ? (currentHub?.vehicles || []).map((v) => ({
          id: v.id,
          label: `${v.plateNumber} — ${v.model} (${v.status})`,
        }))
      : (currentHub?.chargingPoints || []).map((cp) => ({
          id: cp.id,
          label: `${cp.code} · Ô ${cp.bayCode} (${cp.status})`,
        }));

  useEffect(() => {
    if (resourceOptions.length > 0 && !resourceOptions.some((r) => r.id === resourceId)) {
      setResourceId(resourceOptions[0].id);
    } else if (resourceOptions.length === 0) {
      setResourceId('');
    }
  }, [hubId, resourceType, resourceOptions, resourceId]);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId) return;
    setSubmitting(true);
    try {
      const created = await incidentsApi.report({
        hubId,
        resourceType,
        resourceId,
        incidentType,
        description,
      });
      setDescription('');
      notify('warning', `Đã cô lập sự cố ${created.code}. ${created.affectedSummary || ''}`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await incidentsApi.resolve(id);
      notify('success', `Đã khắc phục xong ${res.code} và đưa thiết bị hoạt động trở lại.`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Báo cáo Sự cố & Cô lập Bảo trì</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Ghi nhận hư hỏng xe hoặc trụ sạc, tự động cô lập thiết bị và chuyển đổi an toàn các lượt đặt bị ảnh hưởng
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleReport}
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
              onChange={(e) => setHubId(e.target.value)}
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
              onClick={() => setResourceType('VEHICLE')}
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
              onClick={() => setResourceType('CHARGING_POINT')}
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
              onChange={(e) => setResourceId(e.target.value)}
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
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mô tả chi tiết</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

        <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-base font-bold text-[#1b211e]">Hồ sơ sự cố thiết bị</h3>
          <div className="mt-4 space-y-3">
            {incidents.map((inc) => (
              <div key={inc.id} className="rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-[#1b211e]">{inc.code}</span>
                    <span className="ml-2 text-xs font-medium text-[#006a4e]">{inc.resourceLabel}</span>
                  </div>
                  {renderIncidentBadge(inc.status)}
                </div>
                <p className="mt-1 text-xs font-bold text-[#1b211e]">{inc.incidentType}</p>
                <p className="mt-1 text-xs text-[#59645e]">{inc.description}</p>
                {inc.affectedSummary && (
                  <p className="mt-2 rounded-xl bg-white px-3 py-1.5 text-[11px] font-medium text-[#00513b]">
                    Xử lý tự động: {inc.affectedSummary}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#59645e]">
                  <span>Ghi nhận: {formatTimeShort(inc.createdAt)}</span>
                  {inc.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => handleResolve(inc.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#006a4e] px-3 py-1 font-bold text-white hover:bg-[#00513b]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn tất khắc phục
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

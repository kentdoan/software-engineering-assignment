import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IncidentHistoryList } from '../../components/operator/IncidentHistoryList';
import { IncidentReportForm } from '../../components/operator/IncidentReportForm';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { incidentsApi } from '../../services/incidents.api';
import { Hub } from '../../types/hub.types';
import { IncidentReport } from '../../types/operations.types';

interface OperatorIncidentsPageProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Sự cố & Bảo trì xử lý ghi nhận hư hỏng, cô lập thiết bị và khôi phục trạng thái sẵn sàng.
 */
export const OperatorIncidentsPage: React.FC<OperatorIncidentsPageProps> = ({ notify }) => {
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

  const resourceOptions = useMemo(() => {
    const currentHub = hubs.find((h) => h.id === hubId);
    return resourceType === 'VEHICLE'
      ? (currentHub?.vehicles || []).map((v) => ({
          id: v.id,
          label: `${v.plateNumber} — ${v.model} (${v.status})`,
        }))
      : (currentHub?.chargingPoints || []).map((cp) => ({
          id: cp.id,
          label: `${cp.code} · Ô ${cp.bayCode} (${cp.status})`,
        }));
  }, [hubs, hubId, resourceType]);

  useEffect(() => {
    if (resourceOptions.length > 0 && !resourceOptions.some((r) => r.id === resourceId)) {
      setResourceId(resourceOptions[0].id);
    } else if (resourceOptions.length === 0) {
      setResourceId('');
    }
  }, [resourceOptions, resourceId]);

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
      <PageHeader
        title="Báo cáo Sự cố & Cô lập Bảo trì"
        description="Ghi nhận hư hỏng xe hoặc trụ sạc, tự động cô lập thiết bị và chuyển đổi an toàn các lượt đặt bị ảnh hưởng"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <IncidentReportForm
          hubs={hubs}
          hubId={hubId}
          resourceType={resourceType}
          resourceId={resourceId}
          resourceOptions={resourceOptions}
          incidentType={incidentType}
          description={description}
          submitting={submitting}
          onChangeHubId={setHubId}
          onChangeResourceType={setResourceType}
          onChangeResourceId={setResourceId}
          onChangeIncidentType={setIncidentType}
          onChangeDescription={setDescription}
          onSubmit={handleReport}
        />

        <IncidentHistoryList
          incidents={incidents}
          onResolve={(id) => void handleResolve(id)}
        />
      </div>
    </div>
  );
};

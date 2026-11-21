import React, { useCallback, useEffect, useState } from 'react';
import { DispatchOrderForm } from '../../components/operator/DispatchOrderForm';
import { DispatchOrdersList } from '../../components/operator/DispatchOrdersList';
import { PageHeader } from '../../components/ui/PageHeader';
import { dispatchApi } from '../../services/dispatch.api';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { Hub } from '../../types/hub.types';
import { DispatchOrder } from '../../types/operations.types';

interface OperatorDispatchPageProps {
  initialTargetHubId?: string;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Điều phối phương tiện quản lý phát hành, hoàn tất và hủy lệnh cân bằng đội xe giữa các trạm Hub.
 */
export const OperatorDispatchPage: React.FC<OperatorDispatchPageProps> = ({
  initialTargetHubId,
  notify,
}) => {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [sourceHubId, setSourceHubId] = useState('hub-04');
  const [targetHubId, setTargetHubId] = useState(initialTargetHubId || 'hub-01');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [hList, oList] = await Promise.all([hubsApi.getAll(), dispatchApi.list()]);
      setHubs(hList);
      setOrders(oList);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [notify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialTargetHubId) {
      setTargetHubId(initialTargetHubId);
    }
  }, [initialTargetHubId]);

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleChangeSourceHubId = (nextHubId: string) => {
    setSourceHubId(nextHubId);
    setSelectedVehicleIds([]);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await dispatchApi.create({
        sourceHubId,
        targetHubId,
        vehicleIds: selectedVehicleIds,
        note,
      });
      setSelectedVehicleIds([]);
      setNote('');
      notify('success', `Đã tạo lệnh điều phối ${created.code} (${created.vehiclePlates.length} xe).`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const updated = await dispatchApi.complete(id);
      notify('success', `Đã hoàn tất tiếp nhận lệnh ${updated.code} vào Hub đích.`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await dispatchApi.cancel(id);
      notify('warning', `Đã hủy lệnh ${updated.code}, hoàn xe về Hub nguồn.`);
      await loadData();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Điều phối Phương tiện giữa các Hub"
        description="Cân bằng phân bố đội xe từ trạm dư thừa sang trạm có nguy cơ thiếu xe giờ cao điểm"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <DispatchOrderForm
          hubs={hubs}
          sourceHubId={sourceHubId}
          targetHubId={targetHubId}
          selectedVehicleIds={selectedVehicleIds}
          note={note}
          submitting={submitting}
          onChangeSourceHubId={handleChangeSourceHubId}
          onChangeTargetHubId={setTargetHubId}
          onToggleVehicle={toggleVehicle}
          onChangeNote={setNote}
          onSubmit={handleCreateOrder}
        />

        <DispatchOrdersList
          hubs={hubs}
          orders={orders}
          onComplete={(id) => void handleComplete(id)}
          onCancel={(id) => void handleCancel(id)}
        />
      </div>
    </div>
  );
};

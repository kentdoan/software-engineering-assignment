import React, { useCallback, useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { ChargingSlotProposalPanel } from '../../components/student/ChargingSlotProposalPanel';
import { PrivateChargingSessionsTable } from '../../components/student/PrivateChargingSessionsTable';
import { PrivateVehicleForm } from '../../components/student/PrivateVehicleForm';
import { PageHeader } from '../../components/ui/PageHeader';
import { chargingApi } from '../../services/charging.api';
import { getErrorMessage } from '../../services/httpClient';
import { hubsApi } from '../../services/hubs.api';
import { ChargingSession, ChargingSlotProposal, PrivateVehicle } from '../../types/charging.types';
import { Hub } from '../../types/hub.types';

interface StudentChargingPageProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Đặt lịch sạc xe điện cá nhân cho phép đăng ký xe, tìm trụ sạc tương thích và quản lý lịch sạc.
 */
export const StudentChargingPage: React.FC<StudentChargingPageProps> = ({ notify }) => {
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
      <PageHeader
        title="Đặt lịch sạc xe điện cá nhân"
        description="Chọn phương tiện cá nhân, nhận gợi ý trụ sạc tương thích và đặt trước khung giờ sạc tối ưu"
        action={
          <button
            type="button"
            onClick={() => setShowAddVehicle((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-[#006a4e] bg-white px-4 py-2 text-xs font-bold text-[#006a4e] hover:bg-[#e6f5ee]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{showAddVehicle ? 'Đóng biểu mẫu' : 'Thêm xe cá nhân mới'}</span>
          </button>
        }
      />

      <PrivateVehicleForm
        visible={showAddVehicle}
        plate={newPlate}
        model={newModel}
        chargerType={newChargerType}
        capacityKwh={newCap}
        onChangePlate={setNewPlate}
        onChangeModel={setNewModel}
        onChangeChargerType={setNewChargerType}
        onChangeCapacityKwh={setNewCap}
        onSubmit={handleRegisterVehicle}
      />

      <ChargingSlotProposalPanel
        privateVehicles={privateVehicles}
        hubs={hubs}
        selectedVehicleId={selectedVehicleId}
        selectedHubId={selectedHubId}
        startTime={startTime}
        currentSoc={currentSoc}
        targetSoc={targetSoc}
        proposals={proposals}
        loadingProposals={loadingProposals}
        onSelectVehicleId={setSelectedVehicleId}
        onSelectHubId={setSelectedHubId}
        onChangeStartTime={setStartTime}
        onChangeCurrentSoc={setCurrentSoc}
        onChangeTargetSoc={setTargetSoc}
        onSubmitPropose={handleProposeSlots}
        onConfirmProposal={(p) => void handleConfirmProposal(p)}
      />

      <PrivateChargingSessionsTable
        sessions={sessions}
        onCancelSession={(id) => void handleCancelSession(id)}
      />
    </div>
  );
};

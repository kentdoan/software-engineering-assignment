import React, { useCallback, useEffect, useState } from 'react';
import { RegistrationsTable } from '../../components/admin/RegistrationsTable';
import { RejectRegistrationModal } from '../../components/admin/RejectRegistrationModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../services/httpClient';
import { usersApi } from '../../services/users.api';
import { User } from '../../types/user.types';

interface AdminRegistrationsPageProps {
  onPendingCountChange?: (count: number) => void;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Phê duyệt Nhân viên vận hành giúp quản trị viên kiểm duyệt hồ sơ đăng ký tài khoản vận hành mới.
 */
export const AdminRegistrationsPage: React.FC<AdminRegistrationsPageProps> = ({
  onPendingCountChange,
  notify,
}) => {
  const [filterStatus, setFilterStatus] = useState<'PENDING_APPROVAL' | 'ALL'>('PENDING_APPROVAL');
  const [items, setItems] = useState<User[]>([]);
  const [rejectModalUser, setRejectModalUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRegistrations = useCallback(async () => {
    try {
      const list = await usersApi.listRegistrations(filterStatus);
      setItems(list);
      if (filterStatus === 'PENDING_APPROVAL' && onPendingCountChange) {
        onPendingCountChange(list.length);
      } else if (onPendingCountChange) {
        const pending = list.filter((u) => u.status === 'PENDING_APPROVAL').length;
        onPendingCountChange(pending);
      }
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [filterStatus, onPendingCountChange, notify]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const handleApprove = async (user: User) => {
    setBusyId(user.id);
    try {
      const res = await usersApi.approveRegistration(user.id);
      notify('success', res.message);
      await loadRegistrations();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenReject = (user: User) => {
    setRejectModalUser(user);
    setRejectReason('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalUser) return;
    setBusyId(rejectModalUser.id);
    try {
      const res = await usersApi.rejectRegistration(rejectModalUser.id, rejectReason);
      setRejectModalUser(null);
      setRejectReason('');
      notify('info', res.message);
      await loadRegistrations();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phê duyệt Hồ sơ Nhân viên vận hành"
        description="Xác minh mã nhân viên công tác, kiểm tra xung đột danh tính và cấp quyền truy cập bảng điều khiển Hub"
        action={
          <div className="inline-flex rounded-full border border-[#dfe5e1] bg-[#f1f5f3] p-1">
            <button
              type="button"
              onClick={() => setFilterStatus('PENDING_APPROVAL')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filterStatus === 'PENDING_APPROVAL'
                  ? 'bg-[#006a4e] text-white'
                  : 'text-[#59645e] hover:text-[#1b211e]'
              }`}
            >
              Chờ phê duyệt
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filterStatus === 'ALL'
                  ? 'bg-[#006a4e] text-white'
                  : 'text-[#59645e] hover:text-[#1b211e]'
              }`}
            >
              Tất cả hồ sơ
            </button>
          </div>
        }
      />

      <RegistrationsTable
        items={items}
        busyId={busyId}
        onApprove={(u) => void handleApprove(u)}
        onOpenReject={handleOpenReject}
      />

      <RejectRegistrationModal
        targetUser={rejectModalUser}
        reason={rejectReason}
        submitting={Boolean(rejectModalUser && busyId === rejectModalUser.id)}
        onChangeReason={setRejectReason}
        onCancel={() => setRejectModalUser(null)}
        onSubmit={handleConfirmReject}
      />
    </div>
  );
};

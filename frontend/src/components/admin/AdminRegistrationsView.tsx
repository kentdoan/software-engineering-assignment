import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, UserCheck, XCircle } from 'lucide-react';
import { getErrorMessage, usersApi } from '../../services/api';
import { User } from '../../types';
import { formatTimeShort, renderAccountStatusBadge } from '../ui/Badges';

interface AdminRegistrationsViewProps {
  onPendingCountChange?: (count: number) => void;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const AdminRegistrationsView: React.FC<AdminRegistrationsViewProps> = ({
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1b211e]">Phê duyệt Hồ sơ Điều phối viên</h2>
          <p className="mt-1 text-sm text-[#59645e]">
            Xác minh mã nhân viên công tác, kiểm tra xung đột danh tính và cấp quyền truy cập bảng điều khiển Hub
          </p>
        </div>

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
      </div>

      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f5ee] text-[#006a4e]">
              <UserCheck className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-[#1b211e]">Không có hồ sơ nào đang chờ xử lý</p>
            <p className="mt-1 text-xs text-[#59645e]">
              Tất cả yêu cầu đăng ký Điều phối viên đã được kiểm duyệt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
                  <th className="px-4 py-3 font-bold">Ứng viên Điều phối viên</th>
                  <th className="px-4 py-3 font-bold">Mã NV / Đơn vị</th>
                  <th className="px-4 py-3 font-bold">CCCD & SĐT</th>
                  <th className="px-4 py-3 font-bold">Ngày gửi</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th>
                  <th className="px-4 py-3 font-bold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe5e1]">
                {items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#1b211e]">{u.name}</p>
                      <p className="text-[#59645e]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#006a4e]">{u.staffId || '—'}</p>
                      <p className="text-[#59645e]">{u.department || 'Vận hành Hub'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[#59645e]">
                      <p>{u.phone}</p>
                      <p>CCCD: {u.citizenId || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[#59645e]">{formatTimeShort(u.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      {renderAccountStatusBadge(u.status)}
                      {u.rejectReason && u.status === 'REJECTED' && (
                        <p className="mt-1 max-w-[180px] text-[11px] text-rose-700">{u.rejectReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {u.status === 'PENDING_APPROVAL' ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => handleApprove(u)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#006a4e] px-3.5 py-1.5 font-bold text-white hover:bg-[#00513b] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Phê duyệt
                          </button>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => {
                              setRejectModalUser(u);
                              setRejectReason('');
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 font-bold text-rose-700 hover:bg-rose-100"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#87938c]">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form
            onSubmit={handleConfirmReject}
            className="w-full max-w-md rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-[#1b211e]">Từ chối hồ sơ Điều phối viên</h3>
            <p className="mt-1 text-xs text-[#59645e]">
              Ứng viên: <strong>{rejectModalUser.name}</strong> ({rejectModalUser.email})
            </p>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối (VD: Mã nhân viên không khớp hồ sơ nội bộ ĐHQG)..."
              className="mt-4 w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] p-3 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectModalUser(null)}
                className="rounded-full border border-[#dfe5e1] px-4 py-2 text-xs font-bold text-[#1b211e] hover:bg-[#e9efec]"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busyId === rejectModalUser.id}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

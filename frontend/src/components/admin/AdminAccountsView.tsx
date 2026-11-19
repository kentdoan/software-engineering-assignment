import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Lock, Search, Trash2, Unlock, X } from 'lucide-react';
import { getErrorMessage, usersApi } from '../../services/api';
import { AccountStatus, Booking, ChargingSession, ParkingBooking, Rental, User, UserRole } from '../../types';
import { formatTimeShort, formatVnd, renderAccountStatusBadge } from '../ui/Badges';

interface AdminAccountsViewProps {
  currentAdminId: string;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Sinh viên',
  OPERATOR: 'Điều phối viên',
  ADMIN: 'Quản trị viên',
};

export const AdminAccountsView: React.FC<AdminAccountsViewProps> = ({
  currentAdminId,
  notify,
}) => {
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL');
  const [accounts, setAccounts] = useState<User[]>([]);

  const [drawerData, setDrawerData] = useState<{
    user: User;
    bookings: Booking[];
    rentals: Rental[];
    chargingSessions: ChargingSession[];
    parkingBookings: ParkingBooking[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await usersApi.listAccounts({
        q: searchText || undefined,
        role: roleFilter,
        status: statusFilter,
      });
      setAccounts(list);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [searchText, roleFilter, statusFilter, notify]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const handleOpenHistory = async (userId: string) => {
    try {
      const hist = await usersApi.getAccountHistory(userId);
      setDrawerData(hist);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleToggleLock = async (user: User) => {
    try {
      if (user.status === 'LOCKED') {
        const res = await usersApi.unlockAccount(user.id);
        notify('success', res.message);
      } else {
        const res = await usersApi.lockAccount(user.id, 'Quản trị viên tạm khóa để kiểm tra');
        notify('warning', res.message);
      }
      await loadAccounts();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await usersApi.deleteAccount(deleteTarget.id);
      setDeleteTarget(null);
      if (drawerData?.user.id === deleteTarget.id) setDrawerData(null);
      notify('info', res.message);
      await loadAccounts();
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Quản lý Tài khoản Người dùng</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Tra cứu tài khoản toàn hệ thống, xem lịch sử chuyến đi và thực hiện khóa, mở khóa hoặc thu hồi quyền truy cập
        </p>
      </div>

      {/* Clean Search + Filters Bar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-[#dfe5e1] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#59645e]" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Tìm theo họ tên, email, MSSV/Mã NV hoặc số điện thoại..."
            className="w-full rounded-full border border-[#dfe5e1] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
        <select
          aria-label="Lọc vai trò"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
          className="rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-xs font-bold text-[#1b211e] outline-none"
        >
          <option value="ALL">Mọi vai trò</option>
          <option value="STUDENT">Sinh viên</option>
          <option value="OPERATOR">Điều phối viên</option>
          <option value="ADMIN">Quản trị viên</option>
        </select>
        <select
          aria-label="Lọc trạng thái"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AccountStatus | 'ALL')}
          className="rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-xs font-bold text-[#1b211e] outline-none"
        >
          <option value="ALL">Mọi trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
          <option value="LOCKED">Đã khóa</option>
          <option value="REJECTED">Từ chối</option>
        </select>
      </div>

      {/* Clean Users Table */}
      <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
                <th className="px-4 py-3 font-bold">Người dùng</th>
                <th className="px-4 py-3 font-bold">Vai trò & Mã định danh</th>
                <th className="px-4 py-3 font-bold">Ví / Phí tồn đọng</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe5e1]">
              {accounts.map((u) => {
                const isSelf = u.id === currentAdminId;
                return (
                  <tr key={u.id} className="hover:bg-[#f8f9fa]">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#1b211e]">
                        {u.name} {isSelf && <span className="text-[11px] font-normal text-[#006a4e]">(Bạn)</span>}
                      </p>
                      <p className="text-[#59645e]">{u.email} · {u.phone}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#1b211e]">{ROLE_LABELS[u.role]}</p>
                      <p className="text-[#59645e]">{u.studentId || u.staffId || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[#59645e]">
                      {u.role === 'STUDENT' ? (
                        <>
                          <p className="font-medium text-[#006a4e]">{formatVnd(u.balance)}</p>
                          {(u.unpaidFee ?? 0) > 0 && (
                            <p className="font-bold text-rose-600">Nợ: {formatVnd(u.unpaidFee)}</p>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3.5">{renderAccountStatusBadge(u.status)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(u.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#dfe5e1] bg-white px-3 py-1.5 font-medium text-[#1b211e] hover:bg-[#e9efec]"
                        >
                          <Eye className="h-3.5 w-3.5" /> Chi tiết
                        </button>
                        {!isSelf && u.status !== 'PENDING_APPROVAL' && (
                          <button
                            type="button"
                            onClick={() => handleToggleLock(u)}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-bold ${
                              u.status === 'LOCKED'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            {u.status === 'LOCKED' ? (
                              <>
                                <Unlock className="h-3.5 w-3.5" /> Mở khóa
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5" /> Khóa
                              </>
                            )}
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            aria-label={`Xóa ${u.name}`}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-bold text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Side Drawer: User Detail & Activity History */}
      {drawerData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dfe5e1] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-[#1b211e]">{drawerData.user.name}</h3>
                <p className="text-xs text-[#59645e]">{drawerData.user.email}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết tài khoản"
                onClick={() => setDrawerData(null)}
                className="rounded-lg p-1.5 text-[#59645e] hover:bg-[#e9efec]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
              <div className="rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-4 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#59645e]">Vai trò:</span>
                  <span className="font-bold">{ROLE_LABELS[drawerData.user.role]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#59645e]">Trạng thái:</span>
                  {renderAccountStatusBadge(drawerData.user.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-[#59645e]">Số điện thoại:</span>
                  <span className="font-medium">{drawerData.user.phone}</span>
                </div>
                {drawerData.user.rejectReason && (
                  <p className="pt-1 text-rose-700">Ghi chú: {drawerData.user.rejectReason}</p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-[#1b211e]">
                  Lịch sử chuyến đi ({drawerData.rentals.length})
                </h4>
                {drawerData.rentals.length === 0 ? (
                  <p className="mt-1.5 text-[#59645e]">Chưa có chuyến đi nào.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {drawerData.rentals.map((r) => (
                      <div key={r.id} className="rounded-xl border border-[#dfe5e1] p-3">
                        <p className="font-bold text-[#1b211e]">
                          {r.originHubId} → {r.destinationHubId || 'Đang chạy'}
                        </p>
                        <p className="mt-0.5 text-[#59645e]">
                          Bắt đầu: {formatTimeShort(r.startTime)} · Cước: {formatVnd(r.fare)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-[#1b211e]">
                  Lịch đặt chỗ & Sạc cá nhân ({drawerData.bookings.length + drawerData.chargingSessions.length})
                </h4>
                <p className="mt-1 text-[#59645e]">
                  Giữ xe: {drawerData.bookings.length} · Ô đỗ cá nhân: {drawerData.parkingBookings.length} · Phiên sạc:{' '}
                  {drawerData.chargingSessions.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#1b211e]">Xác nhận xóa tài khoản</h3>
            <p className="mt-2 text-sm text-[#59645e]">
              Bạn chắc chắn muốn xóa tài khoản <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) khỏi hệ thống?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-[#dfe5e1] px-4 py-2 text-xs font-bold text-[#1b211e] hover:bg-[#e9efec]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import {
  AccountHistoryData,
  AccountHistoryDrawer,
} from '../../components/admin/AccountHistoryDrawer';
import { AccountsFilterBar } from '../../components/admin/AccountsFilterBar';
import { AccountsTable } from '../../components/admin/AccountsTable';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../services/httpClient';
import { usersApi } from '../../services/users.api';
import { AccountStatus, User, UserRole } from '../../types/user.types';

interface AdminAccountsPageProps {
  currentAdminId: string;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Quản lý Tài khoản cho phép tra cứu, xem lịch sử hoạt động, khóa/mở khóa và xóa người dùng.
 */
export const AdminAccountsPage: React.FC<AdminAccountsPageProps> = ({
  currentAdminId,
  notify,
}) => {
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL');
  const [accounts, setAccounts] = useState<User[]>([]);

  const [drawerData, setDrawerData] = useState<AccountHistoryData | null>(null);
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
      <PageHeader
        title="Quản lý Tài khoản Người dùng"
        description="Tra cứu tài khoản toàn hệ thống, xem lịch sử chuyến đi và thực hiện khóa, mở khóa hoặc thu hồi quyền truy cập"
      />

      <AccountsFilterBar
        searchText={searchText}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onChangeSearchText={setSearchText}
        onChangeRoleFilter={setRoleFilter}
        onChangeStatusFilter={setStatusFilter}
      />

      <AccountsTable
        accounts={accounts}
        currentAdminId={currentAdminId}
        onOpenHistory={(id) => void handleOpenHistory(id)}
        onToggleLock={(u) => void handleToggleLock(u)}
        onRequestDelete={setDeleteTarget}
      />

      <AccountHistoryDrawer data={drawerData} onClose={() => setDrawerData(null)} />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa tài khoản"
        description={
          deleteTarget ? (
            <>
              Bạn chắc chắn muốn xóa tài khoản <strong>{deleteTarget.name}</strong> (
              {deleteTarget.email}) khỏi hệ thống?
            </>
          ) : null
        }
        cancelLabel="Hủy"
        confirmLabel="Xác nhận xóa"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
};

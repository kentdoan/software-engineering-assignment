import React from 'react';
import { Search } from 'lucide-react';
import { AccountStatus, UserRole } from '../../types/user.types';

interface AccountsFilterBarProps {
  searchText: string;
  roleFilter: UserRole | 'ALL';
  statusFilter: AccountStatus | 'ALL';
  onChangeSearchText: (value: string) => void;
  onChangeRoleFilter: (role: UserRole | 'ALL') => void;
  onChangeStatusFilter: (status: AccountStatus | 'ALL') => void;
}

/**
 * Mục đích: Thanh tìm kiếm và bộ lọc theo vai trò, trạng thái tài khoản trên trang quản lý người dùng.
 */
export const AccountsFilterBar: React.FC<AccountsFilterBarProps> = ({
  searchText,
  roleFilter,
  statusFilter,
  onChangeSearchText,
  onChangeRoleFilter,
  onChangeStatusFilter,
}) => (
  <div className="flex flex-col gap-3 rounded-3xl border border-[#dfe5e1] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#59645e]" />
      <input
        value={searchText}
        onChange={(e) => onChangeSearchText(e.target.value)}
        placeholder="Tìm theo họ tên, email, MSSV/Mã NV hoặc số điện thoại..."
        className="w-full rounded-full border border-[#dfe5e1] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
      />
    </div>
    <select
      aria-label="Lọc vai trò"
      value={roleFilter}
      onChange={(e) => onChangeRoleFilter(e.target.value as UserRole | 'ALL')}
      className="rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-xs font-bold text-[#1b211e] outline-none"
    >
      <option value="ALL">Mọi vai trò</option>
      <option value="STUDENT">Sinh viên</option>
      <option value="OPERATOR">Nhân viên vận hành</option>
      <option value="ADMIN">Quản trị viên</option>
    </select>
    <select
      aria-label="Lọc trạng thái"
      value={statusFilter}
      onChange={(e) => onChangeStatusFilter(e.target.value as AccountStatus | 'ALL')}
      className="rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-xs font-bold text-[#1b211e] outline-none"
    >
      <option value="ALL">Mọi trạng thái</option>
      <option value="ACTIVE">Đang hoạt động</option>
      <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
      <option value="LOCKED">Đã khóa</option>
      <option value="REJECTED">Từ chối</option>
    </select>
  </div>
);

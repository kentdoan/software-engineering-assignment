import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { User } from '../../types/user.types';

export interface NavItemConfig {
  id: string;
  label: string;
  shortLabel?: string;
  badgeCount?: number;
  icon: React.ReactNode;
}

interface SidebarNavProps {
  user: User;
  roleLabel: string;
  navItems: NavItemConfig[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

/**
 * Mục đích: Hiển thị danh sách các liên kết điều hướng và thẻ thông tin phiên ở cột bên trái trên màn hình máy tính.
 */
export const SidebarNav: React.FC<SidebarNavProps> = ({
  user,
  roleLabel,
  navItems,
  activeTab,
  onSelectTab,
}) => (
  <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[280px] shrink-0 flex-col justify-between border-r border-[#dfe5e1] bg-[#f1f5f3] lg:flex">
    <nav className="flex flex-col gap-1.5 p-3">
      <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-[#59645e]">
        {roleLabel}
      </div>
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`group flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-medium transition ${
              isActive
                ? 'bg-[#ccebdd] text-[#00513b] shadow-sm'
                : 'text-[#1b211e] hover:bg-[#e9efec]'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className={isActive ? 'text-[#006a4e]' : 'text-[#59645e] group-hover:text-[#006a4e]'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </span>
            {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
              <span className="rounded-full bg-[#006a4e] px-2 py-0.5 text-[11px] font-bold text-white">
                {item.badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>

    <div className="m-3 rounded-2xl border border-[#dfe5e1] bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-[#006a4e]">
        <UserIcon className="h-4 w-4" />
        <span>Thông tin phiên</span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-[#1b211e]">{user.email}</p>
      {user.role === 'STUDENT' && (
        <p className="mt-1 text-xs text-[#59645e]">
          Số dư ví:{' '}
          <span className="font-bold text-[#006a4e]">
            {Math.round(user.balance ?? 0).toLocaleString('vi-VN')} VNĐ
          </span>
        </p>
      )}
      <button
        type="button"
        onClick={() => onSelectTab('profile')}
        className="mt-3 w-full rounded-full border border-[#dfe5e1] bg-[#f8f9fa] py-1.5 text-xs font-medium text-[#1b211e] hover:bg-[#e9efec]"
      >
        Cài đặt hồ sơ & Mật khẩu
      </button>
    </div>
  </aside>
);

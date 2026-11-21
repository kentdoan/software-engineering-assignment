import React from 'react';
import {
  BatteryCharging,
  ChevronRight,
  LogOut,
  Menu,
  RotateCcw,
} from 'lucide-react';
import { User } from '../../types/user.types';

interface TopAppBarProps {
  user: User;
  roleLabel: string;
  resetting: boolean;
  onOpenMobileMenu: () => void;
  onOpenProfile: () => void;
  onRequestLogout: () => void;
  onResetDemoData?: () => void;
}

/**
 * Mục đích: Hiển thị thanh tiêu đề cố định phía trên cùng gồm tên ứng dụng, nút khôi phục dữ liệu (chỉ dành cho Quản trị viên), nút hồ sơ và nút đăng xuất.
 */
export const TopAppBar: React.FC<TopAppBarProps> = ({
  user,
  roleLabel,
  resetting,
  onOpenMobileMenu,
  onOpenProfile,
  onRequestLogout,
  onResetDemoData,
}) => {
  const canResetData = user.role === 'ADMIN' && Boolean(onResetDemoData);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[#dfe5e1] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Mở menu điều hướng"
            className="rounded-xl p-2 text-[#59645e] hover:bg-[#e9efec] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006a4e] text-white shadow-sm">
            <BatteryCharging className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-[#1b211e]">
              Smart E-Mobility Hub
            </p>
            <p className="text-xs text-[#59645e]">Hệ sinh thái Giao thông Xanh VNU-HCM</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {canResetData && (
            <button
              type="button"
              onClick={onResetDemoData}
              disabled={resetting}
              title="Khôi phục dữ liệu mẫu ban đầu"
              className="hidden items-center gap-1.5 rounded-full border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-1.5 text-xs font-medium text-[#59645e] transition hover:border-[#006a4e] hover:text-[#006a4e] disabled:opacity-60 sm:inline-flex"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>Khôi phục dữ liệu</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 rounded-full border border-[#dfe5e1] bg-[#f1f5f3] p-1 transition hover:border-[#006a4e] sm:gap-2.5 sm:py-1 sm:pl-1.5 sm:pr-3"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#006a4e] text-xs font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-bold leading-none text-[#1b211e]">{user.name}</p>
              <p className="mt-0.5 text-[10px] font-medium text-[#59645e]">{roleLabel}</p>
            </div>
            <ChevronRight className="hidden h-3.5 w-3.5 text-[#59645e] sm:block" />
          </button>

          <button
            type="button"
            onClick={onRequestLogout}
            aria-label="Đăng xuất"
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};

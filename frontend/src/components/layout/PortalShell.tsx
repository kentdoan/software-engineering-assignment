import React, { useState } from 'react';
import {
  AlertCircle,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  Info,
  LogOut,
  Menu,
  RotateCcw,
  User as UserIcon,
  X,
} from 'lucide-react';
import { ToastMessage, User } from '../../types';

export interface NavItemConfig {
  id: string;
  label: string;
  shortLabel?: string;
  badgeCount?: number;
  icon: React.ReactNode;
}

interface PortalShellProps {
  user: User;
  navItems: NavItemConfig[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onLogout: () => Promise<void>;
  onResetDemoData?: () => Promise<void>;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Sinh viên VNU-HCM',
  OPERATOR: 'Điều phối viên Hub',
  ADMIN: 'Quản trị Hệ thống',
};

export const PortalShell: React.FC<PortalShellProps> = ({
  user,
  navItems,
  activeTab,
  onSelectTab,
  onLogout,
  onResetDemoData,
  toasts,
  onDismissToast,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
      setShowLogoutModal(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleReset = async () => {
    if (!onResetDemoData) return;
    setResetting(true);
    try {
      await onResetDemoData();
    } finally {
      setResetting(false);
    }
  };

  const renderSidebarLinks = (isMobile = false) => (
    <nav className="flex flex-col gap-1.5 p-3">
      <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-[#59645e]">
        {ROLE_LABELS[user.role] || user.role}
      </div>
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectTab(item.id);
              if (isMobile) setMobileMenuOpen(false);
            }}
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
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1b211e]">
      {/* Fixed Material 3 TopAppBar (64px) */}
      <header className="sticky top-0 z-40 h-16 border-b border-[#dfe5e1] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
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
            {onResetDemoData && (
              <button
                type="button"
                onClick={handleReset}
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
              onClick={() => onSelectTab('profile')}
              className="flex items-center gap-2 rounded-full border border-[#dfe5e1] bg-[#f1f5f3] p-1 transition hover:border-[#006a4e] sm:gap-2.5 sm:py-1 sm:pl-1.5 sm:pr-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#006a4e] text-xs font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold leading-none text-[#1b211e]">{user.name}</p>
                <p className="mt-0.5 text-[10px] font-medium text-[#59645e]">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
              <ChevronRight className="hidden h-3.5 w-3.5 text-[#59645e] sm:block" />
            </button>

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              aria-label="Đăng xuất"
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container matching 280px Sidebar + Canvas */}
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[280px] shrink-0 flex-col justify-between border-r border-[#dfe5e1] bg-[#f1f5f3] lg:flex">
          <div>{renderSidebarLinks(false)}</div>

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

        {/* Main Work Area */}
        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-10">{children}</main>
      </div>

      {/* Mobile Bottom Tab Navigation (< lg) matching Figma MOBILE-STU */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[#dfe5e1] bg-white px-1 py-1.5 shadow-lg lg:hidden">
        {navItems.slice(0, 4).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium ${
                isActive ? 'text-[#006a4e]' : 'text-[#59645e]'
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full ${
                  isActive ? 'bg-[#ccebdd] text-[#00513b]' : ''
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.shortLabel || item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex w-72 max-w-[82vw] flex-col justify-between bg-[#f1f5f3] shadow-xl">
            <div>
              <div className="flex h-16 items-center justify-between border-b border-[#dfe5e1] px-4">
                <span className="font-bold text-[#006a4e]">Smart E-Mobility Hub</span>
                <button
                  type="button"
                  aria-label="Đóng menu điều hướng"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-[#59645e] hover:bg-[#e9efec]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto">{renderSidebarLinks(true)}</div>
            </div>

            {onResetDemoData && (
              <div className="border-t border-[#dfe5e1] p-4">
                <button
                  type="button"
                  onClick={() => {
                    void handleReset();
                    setMobileMenuOpen(false);
                  }}
                  disabled={resetting}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#dfe5e1] bg-white py-2.5 text-xs font-bold text-[#006a4e] hover:bg-[#e6f5ee] disabled:opacity-60"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
                  <span>Khôi phục dữ liệu mẫu</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UC-COM-03 Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#1b211e]">Xác nhận đăng xuất</h3>
            <p className="mt-2 text-sm text-[#59645e]">
              Bạn có chắc chắn muốn kết thúc phiên làm việc của tài khoản{' '}
              <span className="font-medium text-[#1b211e]">{user.email}</span>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="rounded-full border border-[#dfe5e1] px-5 py-2 text-sm font-medium text-[#1b211e] hover:bg-[#e9efec]"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={loggingOut}
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-20 right-4 z-50 flex max-w-sm flex-col gap-2 lg:bottom-6">
        {toasts.map((toast) => {
          const styles = {
            success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
            error: 'border-rose-200 bg-rose-50 text-rose-900',
            warning: 'border-amber-200 bg-amber-50 text-amber-900',
            info: 'border-[#a8dbc3] bg-[#e6f5ee] text-[#00513b]',
          };
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-lg ${styles[toast.type]}`}
            >
              {toast.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              {(toast.type === 'error' || toast.type === 'warning') && (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              {toast.type === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0" />}
              <p className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</p>
              <button
                type="button"
                onClick={() => onDismissToast(toast.id)}
                className="opacity-60 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { ToastMessage } from '../../types/ui.types';
import { User } from '../../types/user.types';
import { ConfirmModal } from '../ui/ConfirmModal';
import { MobileBottomNav } from './MobileBottomNav';
import { NavItemConfig, SidebarNav } from './SidebarNav';
import { ToastContainer } from './ToastContainer';
import { TopAppBar } from './TopAppBar';

export type { NavItemConfig };

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
  OPERATOR: 'Nhân viên vận hành Hub',
  ADMIN: 'Quản trị Hệ thống',
};

/**
 * Mục đích: Cung cấp khung giao diện chính dùng chung cho cả 3 vai trò gồm thanh tiêu đề, thanh điều hướng, vùng nội dung, hộp thoại xác nhận đăng xuất và thông báo nổi.
 */
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

  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const canResetData = user.role === 'ADMIN' && Boolean(onResetDemoData);

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
    if (!canResetData || !onResetDemoData) return;
    setResetting(true);
    try {
      await onResetDemoData();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1b211e]">
      <TopAppBar
        user={user}
        roleLabel={roleLabel}
        resetting={resetting}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenProfile={() => onSelectTab('profile')}
        onRequestLogout={() => setShowLogoutModal(true)}
        onResetDemoData={canResetData ? () => void handleReset() : undefined}
      />

      <div className="mx-auto flex max-w-[1440px]">
        <SidebarNav
          user={user}
          roleLabel={roleLabel}
          navItems={navItems}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
        />

        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-10">{children}</main>
      </div>

      <MobileBottomNav
        navItems={navItems}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[1200] flex lg:hidden">
          <div className="fixed inset-0 bg-black/45" onClick={() => setMobileMenuOpen(false)} />
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
              <div className="overflow-y-auto">
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
                        onClick={() => {
                          onSelectTab(item.id);
                          setMobileMenuOpen(false);
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
              </div>
            </div>

            {canResetData && (
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

      <ConfirmModal
        open={showLogoutModal}
        title="Xác nhận đăng xuất"
        description={
          <>
            Bạn có chắc chắn muốn kết thúc phiên làm việc của tài khoản{' '}
            <span className="font-medium text-[#1b211e]">{user.email}</span>?
          </>
        }
        cancelLabel="Ở lại"
        confirmLabel="Đăng xuất ngay"
        confirmBusyLabel="Đang đăng xuất..."
        loading={loggingOut}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => void handleConfirmLogout()}
      />

      <ToastContainer toasts={toasts} onDismissToast={onDismissToast} />
    </div>
  );
};

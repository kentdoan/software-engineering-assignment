import React from 'react';
import { NavItemConfig } from './SidebarNav';

interface MobileBottomNavProps {
  navItems: NavItemConfig[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

/**
 * Mục đích: Hiển thị thanh điều hướng nhanh ở đáy màn hình dành cho giao diện điện thoại di động.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  navItems,
  activeTab,
  onSelectTab,
}) => (
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
);

import React from 'react';
import { ArrowRight, BatteryCharging } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../constants/initialData';

interface AuthBrandingPanelProps {
  loading: boolean;
  onQuickLogin: (email: string, password: string) => void;
}

/**
 * Mục đích: Hiển thị khung giới thiệu Smart E-Mobility Hub bên trái cùng danh sách tài khoản mẫu đăng nhập nhanh.
 */
export const AuthBrandingPanel: React.FC<AuthBrandingPanelProps> = ({ loading, onQuickLogin }) => (
  <div className="flex flex-col justify-between bg-[#006a4e] p-8 text-white lg:w-[44%] lg:p-12">
    <div>
      <div className="inline-flex items-center gap-2.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium">
        <BatteryCharging className="h-4 w-4" />
        <span>Đại học Quốc gia TP.HCM · Mạng lưới 6 Trạm Hub</span>
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight lg:text-4xl">
        Smart E-Mobility Hub
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#ccebdd]">
        Nền tảng di chuyển xanh bằng xe điện chia sẻ, quản lý bãi đỗ thông minh và trạm sạc tích hợp dành cho cộng đồng sinh viên và đội ngũ nhân viên vận hành VNU-HCM.
      </p>
    </div>

    {/* Thẻ đăng nhập nhanh bằng tài khoản mẫu */}
    <div className="mt-8 space-y-3 rounded-3xl bg-[#00513b]/80 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ccebdd]">
          Truy cập nhanh tài khoản mẫu
        </p>
        <span className="text-[11px] text-[#ccebdd]/80">Mật khẩu mặc định: 123456</span>
      </div>
      <div className="grid gap-2.5">
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            disabled={loading}
            onClick={() => onQuickLogin(acc.email, acc.password)}
            className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-left transition hover:bg-white/20"
          >
            <div>
              <p className="text-sm font-bold text-white">{acc.label}</p>
              <p className="text-xs text-[#ccebdd]">{acc.sublabel}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#ccebdd]" />
          </button>
        ))}
      </div>
    </div>
  </div>
);

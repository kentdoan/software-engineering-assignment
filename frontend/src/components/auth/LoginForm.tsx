import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LoginFormProps {
  email: string;
  password: string;
  loading: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Biểu mẫu nhập email VNU-HCM và mật khẩu để đăng nhập vào hệ thống.
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  loading,
  onChangeEmail,
  onChangePassword,
  onSubmit,
}) => (
  <form onSubmit={onSubmit} className="mt-6 space-y-4">
    <div>
      <h2 className="text-xl font-bold text-[#1b211e]">Chào mừng quay trở lại</h2>
      <p className="mt-1 text-xs text-[#59645e]">
        Đăng nhập bằng tài khoản Sinh viên, Nhân viên vận hành hoặc Quản trị viên
      </p>
    </div>

    <div>
      <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-[#1b211e]">
        Email VNU-HCM
      </label>
      <input
        id="login-email"
        name="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => onChangeEmail(e.target.value)}
        placeholder="ten@vnuhcm.edu.vn"
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#1b211e] outline-none transition focus:border-[#006a4e] focus:bg-white"
      />
    </div>

    <div>
      <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-[#1b211e]">
        Mật khẩu
      </label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => onChangePassword(e.target.value)}
        placeholder="Nhập mật khẩu"
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#1b211e] outline-none transition focus:border-[#006a4e] focus:bg-white"
      />
    </div>

    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#006a4e] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#00513b] disabled:opacity-60"
    >
      <ShieldCheck className="h-4 w-4" />
      <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào Cổng thông tin'}</span>
    </button>
  </form>
);

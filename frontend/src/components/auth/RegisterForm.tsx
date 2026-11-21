import React from 'react';
import { UserPlus } from 'lucide-react';
import { UserRole } from '../../types/user.types';

export interface RegisterFormValues {
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  password: string;
  studentId: string;
  university: string;
  staffId: string;
  department: string;
  citizenId: string;
}

interface RegisterFormProps {
  values: RegisterFormValues;
  loading: boolean;
  onChange: <K extends keyof RegisterFormValues>(field: K, value: RegisterFormValues[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Biểu mẫu đăng ký tài khoản mới cho Sinh viên VNU-HCM hoặc Nhân viên vận hành Hub.
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  values,
  loading,
  onChange,
  onSubmit,
}) => (
  <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
    <div>
      <h2 className="text-xl font-bold text-[#1b211e]">Đăng ký thành viên mới</h2>
      <p className="mt-1 text-xs text-[#59645e]">
        Sinh viên được kích hoạt ngay; Nhân viên vận hành cần Quản trị viên phê duyệt
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => onChange('role', 'STUDENT')}
        className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
          values.role === 'STUDENT'
            ? 'border-[#006a4e] bg-[#e6f5ee] text-[#00513b]'
            : 'border-[#dfe5e1] bg-white text-[#59645e]'
        }`}
      >
        Sinh viên VNU-HCM
      </button>
      <button
        type="button"
        onClick={() => onChange('role', 'OPERATOR')}
        className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
          values.role === 'OPERATOR'
            ? 'border-[#006a4e] bg-[#e6f5ee] text-[#00513b]'
            : 'border-[#dfe5e1] bg-white text-[#59645e]'
        }`}
      >
        Nhân viên vận hành Hub
      </button>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Họ và tên</label>
        <input
          required
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Nguyễn Minh Khôi"
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Số điện thoại</label>
        <input
          required
          value={values.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="0912345678"
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Email</label>
        <input
          type="email"
          required
          value={values.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="email@vnuhcm.edu.vn"
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mật khẩu (tối thiểu 6 ký tự)</label>
        <input
          type="password"
          required
          value={values.password}
          onChange={(e) => onChange('password', e.target.value)}
          placeholder="Tối thiểu 6 ký tự"
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
    </div>

    {values.role === 'STUDENT' ? (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mã số sinh viên</label>
          <input
            required
            value={values.studentId}
            onChange={(e) => onChange('studentId', e.target.value)}
            placeholder="VD: 2314001"
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trường thành viên</label>
          <input
            value={values.university}
            onChange={(e) => onChange('university', e.target.value)}
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mã nhân viên</label>
          <input
            required
            value={values.staffId}
            onChange={(e) => onChange('staffId', e.target.value)}
            placeholder="VD: OPS-2026-09"
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1b211e]">Đơn vị công tác</label>
          <input
            value={values.department}
            onChange={(e) => onChange('department', e.target.value)}
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
      </div>
    )}

    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Số CCCD (Tùy chọn)</label>
      <input
        value={values.citizenId}
        onChange={(e) => onChange('citizenId', e.target.value)}
        placeholder="079205..."
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
      />
    </div>

    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#006a4e] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#00513b] disabled:opacity-60"
    >
      <UserPlus className="h-4 w-4" />
      <span>{loading ? 'Đang xử lý...' : 'Gửi đăng ký tài khoản'}</span>
    </button>
  </form>
);

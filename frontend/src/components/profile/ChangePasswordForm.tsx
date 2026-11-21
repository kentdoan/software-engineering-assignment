import React from 'react';
import { KeyRound, UserCheck } from 'lucide-react';

interface ChangePasswordFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  saving: boolean;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Biểu mẫu cập nhật mật khẩu đăng nhập cho tài khoản đang hoạt động.
 */
export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  saving,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onSubmit,
}) => (
  <form
    onSubmit={onSubmit}
    className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-5"
  >
    <div className="flex items-center gap-2.5 border-b border-[#dfe5e1] pb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f5ee] text-[#006a4e]">
        <KeyRound className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-base font-bold text-[#1b211e]">Đổi mật khẩu</h3>
        <p className="text-xs text-[#59645e]">Khuyến nghị cập nhật định kỳ để bảo vệ tài khoản</p>
      </div>
    </div>

    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mật khẩu hiện tại</label>
      <input
        type="password"
        required
        value={currentPassword}
        onChange={(e) => onChangeCurrentPassword(e.target.value)}
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
      />
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mật khẩu mới</label>
      <input
        type="password"
        required
        value={newPassword}
        onChange={(e) => onChangeNewPassword(e.target.value)}
        placeholder="Ít nhất 6 ký tự"
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
      />
    </div>
    <div>
      <label className="mb-1 block text-xs font-medium text-[#1b211e]">Xác nhận mật khẩu mới</label>
      <input
        type="password"
        required
        value={confirmPassword}
        onChange={(e) => onChangeConfirmPassword(e.target.value)}
        className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
      />
    </div>

    <button
      type="submit"
      disabled={saving}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-[#006a4e] bg-white py-2.5 text-sm font-medium text-[#006a4e] transition hover:bg-[#e6f5ee] disabled:opacity-60"
    >
      <UserCheck className="h-4 w-4" />
      <span>{saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
    </button>
  </form>
);

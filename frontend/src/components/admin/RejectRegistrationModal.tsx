import React from 'react';
import { User } from '../../types/user.types';

interface RejectRegistrationModalProps {
  targetUser: User | null;
  reason: string;
  submitting: boolean;
  onChangeReason: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Hộp thoại nhập lý do từ chối hồ sơ đăng ký Nhân viên vận hành (hiển thị trên tầng z-[1200]).
 */
export const RejectRegistrationModal: React.FC<RejectRegistrationModalProps> = ({
  targetUser,
  reason,
  submitting,
  onChangeReason,
  onCancel,
  onSubmit,
}) => {
  if (!targetUser) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-[#1b211e]">Từ chối hồ sơ Nhân viên vận hành</h3>
        <p className="mt-1 text-xs text-[#59645e]">
          Ứng viên: <strong>{targetUser.name}</strong> ({targetUser.email})
        </p>
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(e) => onChangeReason(e.target.value)}
          placeholder="Nhập lý do từ chối (VD: Mã nhân viên không khớp hồ sơ nội bộ ĐHQG)..."
          className="mt-4 w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] p-3 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#dfe5e1] px-4 py-2 text-xs font-bold text-[#1b211e] hover:bg-[#e9efec]"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Xác nhận từ chối
          </button>
        </div>
      </form>
    </div>
  );
};

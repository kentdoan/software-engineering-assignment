import React from 'react';
import { Save } from 'lucide-react';
import { User } from '../../types/user.types';
import { formatVnd } from '../../utils/formatters';
import { renderAccountStatusBadge } from '../ui/Badges';

interface ProfileInfoFormProps {
  user: User;
  name: string;
  phone: string;
  university: string;
  department: string;
  citizenId: string;
  saving: boolean;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeUniversity: (value: string) => void;
  onChangeDepartment: (value: string) => void;
  onChangeCitizenId: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Biểu mẫu hiển thị và chỉnh sửa thông tin cá nhân cùng số dư ví di chuyển xanh của người dùng.
 */
export const ProfileInfoForm: React.FC<ProfileInfoFormProps> = ({
  user,
  name,
  phone,
  university,
  department,
  citizenId,
  saving,
  onChangeName,
  onChangePhone,
  onChangeUniversity,
  onChangeDepartment,
  onChangeCitizenId,
  onSubmit,
}) => (
  <form
    onSubmit={onSubmit}
    className="space-y-4 rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7"
  >
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5e1] pb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ccebdd] text-lg font-bold text-[#00513b]">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-base font-bold text-[#1b211e]">{user.name}</h3>
          <p className="text-xs text-[#59645e]">{user.email}</p>
        </div>
      </div>
      {renderAccountStatusBadge(user.status)}
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Họ và tên</label>
        <input
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          required
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Số điện thoại</label>
        <input
          value={phone}
          onChange={(e) => onChangePhone(e.target.value)}
          required
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">
          {user.role === 'STUDENT' ? 'Mã số sinh viên' : 'Mã nhân viên'}
        </label>
        <input
          readOnly
          value={user.role === 'STUDENT' ? user.studentId || '—' : user.staffId || '—'}
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#e9efec] px-3.5 py-2.5 text-sm text-[#59645e]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Số CCCD</label>
        <input
          value={citizenId}
          onChange={(e) => onChangeCitizenId(e.target.value)}
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
    </div>

    {user.role === 'STUDENT' ? (
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#1b211e]">Đơn vị đào tạo</label>
          <input
            value={university}
            onChange={(e) => onChangeUniversity(e.target.value)}
            className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
        <div className="rounded-2xl border border-[#ccebdd] bg-[#e6f5ee] p-3.5">
          <p className="text-xs font-medium text-[#00513b]">Số dư ví di chuyển xanh</p>
          <p className="mt-1 text-lg font-bold text-[#006a4e]">{formatVnd(user.balance)}</p>
        </div>
      </div>
    ) : (
      <div>
        <label className="mb-1 block text-xs font-medium text-[#1b211e]">Phòng ban / Đơn vị</label>
        <input
          value={department}
          onChange={(e) => onChangeDepartment(e.target.value)}
          className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
    )}

    <div className="flex justify-end pt-2">
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-[#006a4e] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#00513b] disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
      </button>
    </div>
  </form>
);

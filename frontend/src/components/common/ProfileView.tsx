import React, { useState } from 'react';
import { KeyRound, Save, UserCheck } from 'lucide-react';
import { getErrorMessage, usersApi } from '../../services/api';
import { User } from '../../types';
import { formatVnd, renderAccountStatusBadge } from '../ui/Badges';

interface ProfileViewProps {
  user: User;
  onUserUpdated: (user: User) => void;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUserUpdated, notify }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [university, setUniversity] = useState(user.university || '');
  const [department, setDepartment] = useState(user.department || '');
  const [citizenId, setCitizenId] = useState(user.citizenId || '');
  const [savingInfo, setSavingInfo] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const updated = await usersApi.updateProfile({
        name,
        phone,
        university: user.role === 'STUDENT' ? university : undefined,
        department: user.role !== 'STUDENT' ? department : undefined,
        citizenId,
      });
      onUserUpdated(updated);
      notify('success', 'Đã cập nhật thông tin hồ sơ cá nhân.');
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notify('error', 'Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await usersApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('success', res.message);
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1b211e]">Hồ sơ cá nhân & Bảo mật</h2>
        <p className="mt-1 text-sm text-[#59645e]">
          Quản lý thông tin liên hệ, số dư ví điện tử và cập nhật mật khẩu đăng nhập
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Profile Info Card */}
        <form
          onSubmit={handleSaveProfile}
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
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1b211e]">Số điện thoại</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                onChange={(e) => setCitizenId(e.target.value)}
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
                  onChange={(e) => setUniversity(e.target.value)}
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
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingInfo}
              className="inline-flex items-center gap-2 rounded-full bg-[#006a4e] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#00513b] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{savingInfo ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>

        {/* Right Password Card */}
        <form
          onSubmit={handleChangePassword}
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
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mật khẩu mới</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#006a4e] bg-white py-2.5 text-sm font-medium text-[#006a4e] transition hover:bg-[#e6f5ee] disabled:opacity-60"
          >
            <UserCheck className="h-4 w-4" />
            <span>{savingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

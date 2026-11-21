import React, { useEffect, useState } from 'react';
import { ChangePasswordForm } from '../../components/profile/ChangePasswordForm';
import { ProfileInfoForm } from '../../components/profile/ProfileInfoForm';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../services/httpClient';
import { usersApi } from '../../services/users.api';
import { User } from '../../types/user.types';

interface ProfilePageProps {
  user: User;
  onUserUpdated: (user: User) => void;
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Hồ sơ cá nhân & Bảo mật quản lý việc cập nhật thông tin liên hệ và thay đổi mật khẩu.
 */
export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdated, notify }) => {
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

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone);
    setUniversity(user.university || '');
    setDepartment(user.department || '');
    setCitizenId(user.citizenId || '');
  }, [user]);

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
      <PageHeader
        title="Hồ sơ cá nhân & Bảo mật"
        description="Quản lý thông tin liên hệ, số dư ví điện tử và cập nhật mật khẩu đăng nhập"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <ProfileInfoForm
          user={user}
          name={name}
          phone={phone}
          university={university}
          department={department}
          citizenId={citizenId}
          saving={savingInfo}
          onChangeName={setName}
          onChangePhone={setPhone}
          onChangeUniversity={setUniversity}
          onChangeDepartment={setDepartment}
          onChangeCitizenId={setCitizenId}
          onSubmit={handleSaveProfile}
        />

        <ChangePasswordForm
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          saving={savingPassword}
          onChangeCurrentPassword={setCurrentPassword}
          onChangeNewPassword={setNewPassword}
          onChangeConfirmPassword={setConfirmPassword}
          onSubmit={handleChangePassword}
        />
      </div>
    </div>
  );
};

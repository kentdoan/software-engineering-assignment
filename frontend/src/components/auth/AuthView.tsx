import React, { useState } from 'react';
import { ArrowRight, BatteryCharging, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../constants/initialData';
import { authApi, getErrorMessage } from '../../services/api';
import { User, UserRole } from '../../types';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('a.nguyen23@vnuhcm.edu.vn');
  const [password, setPassword] = useState('123456');
  const [regRole, setRegRole] = useState<UserRole>('STUDENT');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regUniversity, setRegUniversity] = useState('ĐH Bách Khoa - ĐHQG-HCM');
  const [regStaffId, setRegStaffId] = useState('');
  const [regDepartment, setRegDepartment] = useState('Vận hành Hub');
  const [regCitizenId, setRegCitizenId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (targetEmail = email, targetPassword = password) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await authApi.login(targetEmail, targetPassword);
      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Đăng nhập không thành công.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin();
  };

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await authApi.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        role: regRole,
        studentId: regRole === 'STUDENT' ? regStudentId : undefined,
        university: regRole === 'STUDENT' ? regUniversity : undefined,
        staffId: regRole === 'OPERATOR' ? regStaffId : undefined,
        department: regRole === 'OPERATOR' ? regDepartment : undefined,
        citizenId: regCitizenId || undefined,
      });
      setSuccessMsg(res.message);
      if (regRole === 'STUDENT') {
        setEmail(regEmail);
        setPassword(regPassword);
      }
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegStudentId('');
      setRegStaffId('');
      setRegCitizenId('');
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Đăng ký không thành công.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fa] lg:flex-row">
      {/* Left Material 3 Forest Emerald Branding Panel */}
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
            Nền tảng di chuyển xanh bằng xe điện chia sẻ, quản lý bãi đỗ thông minh và trạm sạc tích hợp dành cho cộng đồng sinh viên và đội ngũ điều phối VNU-HCM.
          </p>
        </div>

        {/* Quick Demo Login Cards for Graders & Reviewers */}
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
                onClick={() => {
                  setMode('LOGIN');
                  setEmail(acc.email);
                  setPassword(acc.password);
                  void handleLogin(acc.email, acc.password);
                }}
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

      {/* Right Authentication Form Surface */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex rounded-full bg-[#f1f5f3] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 rounded-full py-2.5 text-sm font-medium transition ${
                mode === 'LOGIN'
                  ? 'bg-[#006a4e] text-white shadow-sm'
                  : 'text-[#59645e] hover:text-[#1b211e]'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 rounded-full py-2.5 text-sm font-medium transition ${
                mode === 'REGISTER'
                  ? 'bg-[#006a4e] text-white shadow-sm'
                  : 'text-[#59645e] hover:text-[#1b211e]'
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>

          {errorMsg && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'LOGIN' ? (
            <form onSubmit={handleSubmitLogin} className="mt-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#1b211e]">Chào mừng quay trở lại</h2>
                <p className="mt-1 text-xs text-[#59645e]">
                  Đăng nhập bằng tài khoản Sinh viên, Điều phối viên hoặc Quản trị viên
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
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
          ) : (
            <form onSubmit={handleSubmitRegister} className="mt-6 space-y-3.5">
              <div>
                <h2 className="text-xl font-bold text-[#1b211e]">Đăng ký thành viên mới</h2>
                <p className="mt-1 text-xs text-[#59645e]">
                  Sinh viên được kích hoạt ngay; Điều phối viên cần Quản trị viên phê duyệt
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRegRole('STUDENT')}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    regRole === 'STUDENT'
                      ? 'border-[#006a4e] bg-[#e6f5ee] text-[#00513b]'
                      : 'border-[#dfe5e1] bg-white text-[#59645e]'
                  }`}
                >
                  Sinh viên VNU-HCM
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('OPERATOR')}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    regRole === 'OPERATOR'
                      ? 'border-[#006a4e] bg-[#e6f5ee] text-[#00513b]'
                      : 'border-[#dfe5e1] bg-white text-[#59645e]'
                  }`}
                >
                  Điều phối viên Hub
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#1b211e]">Họ và tên</label>
                  <input
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nguyễn Minh Khôi"
                    className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#1b211e]">Số điện thoại</label>
                  <input
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
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
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="email@vnuhcm.edu.vn"
                    className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mật khẩu (tối thiểu 6 ký tự)</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
                  />
                </div>
              </div>

              {regRole === 'STUDENT' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#1b211e]">Mã số sinh viên</label>
                    <input
                      required
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder="VD: 2314001"
                      className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#1b211e]">Trường thành viên</label>
                    <input
                      value={regUniversity}
                      onChange={(e) => setRegUniversity(e.target.value)}
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
                      value={regStaffId}
                      onChange={(e) => setRegStaffId(e.target.value)}
                      placeholder="VD: OPS-2026-09"
                      className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#1b211e]">Đơn vị công tác</label>
                    <input
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5e1] bg-[#f8f9fa] px-3 py-2 text-sm outline-none focus:border-[#006a4e] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-[#1b211e]">Số CCCD (Tùy chọn)</label>
                <input
                  value={regCitizenId}
                  onChange={(e) => setRegCitizenId(e.target.value)}
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
          )}
        </div>
      </div>
    </div>
  );
};

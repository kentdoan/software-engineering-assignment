import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AuthBrandingPanel } from '../../components/auth/AuthBrandingPanel';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm, RegisterFormValues } from '../../components/auth/RegisterForm';
import { authApi } from '../../services/auth.api';
import { getErrorMessage } from '../../services/httpClient';
import { User } from '../../types/user.types';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

const INITIAL_REGISTER_VALUES: RegisterFormValues = {
  role: 'STUDENT',
  name: '',
  email: '',
  phone: '',
  password: '',
  studentId: '',
  university: 'ĐH Bách Khoa - ĐHQG-HCM',
  staffId: '',
  department: 'Vận hành Hub',
  citizenId: '',
};

/**
 * Mục đích: Trang xác thực chính xử lý đăng nhập, đăng nhập nhanh bằng tài khoản mẫu và đăng ký thành viên mới.
 */
export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('a.nguyen23@vnuhcm.edu.vn');
  const [password, setPassword] = useState('123456');
  const [registerValues, setRegisterValues] = useState<RegisterFormValues>(INITIAL_REGISTER_VALUES);
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

  const handleQuickLogin = (targetEmail: string, targetPassword: string) => {
    setMode('LOGIN');
    setEmail(targetEmail);
    setPassword(targetPassword);
    void handleLogin(targetEmail, targetPassword);
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin();
  };

  const handleChangeRegisterField = <K extends keyof RegisterFormValues>(
    field: K,
    value: RegisterFormValues[K],
  ) => {
    setRegisterValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await authApi.register({
        name: registerValues.name,
        email: registerValues.email,
        password: registerValues.password,
        phone: registerValues.phone,
        role: registerValues.role,
        studentId: registerValues.role === 'STUDENT' ? registerValues.studentId : undefined,
        university: registerValues.role === 'STUDENT' ? registerValues.university : undefined,
        staffId: registerValues.role === 'OPERATOR' ? registerValues.staffId : undefined,
        department: registerValues.role === 'OPERATOR' ? registerValues.department : undefined,
        citizenId: registerValues.citizenId || undefined,
      });
      setSuccessMsg(res.message);
      if (registerValues.role === 'STUDENT') {
        setEmail(registerValues.email);
        setPassword(registerValues.password);
      }
      setRegisterValues((prev) => ({
        ...INITIAL_REGISTER_VALUES,
        role: prev.role,
        university: prev.university,
        department: prev.department,
      }));
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Đăng ký không thành công.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fa] lg:flex-row">
      <AuthBrandingPanel loading={loading} onQuickLogin={handleQuickLogin} />

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
            <LoginForm
              email={email}
              password={password}
              loading={loading}
              onChangeEmail={setEmail}
              onChangePassword={setPassword}
              onSubmit={handleSubmitLogin}
            />
          ) : (
            <RegisterForm
              values={registerValues}
              loading={loading}
              onChange={handleChangeRegisterField}
              onSubmit={handleSubmitRegister}
            />
          )}
        </div>
      </div>
    </div>
  );
};

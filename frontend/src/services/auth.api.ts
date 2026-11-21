import { User, UserRole } from '../types/user.types';
import { api, setAuthToken } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API xác thực phiên đăng nhập, đăng ký và đăng xuất người dùng.
 */
export const authApi = {
  /**
   * Mục đích: Gửi thông tin email và mật khẩu đến POST /auth/login, lưu JWT token và trả về thông tin người dùng.
   */
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/login', { email, password });
    setAuthToken(res.data.token);
    return res.data;
  },

  /**
   * Mục đích: Gửi hồ sơ đăng ký tài khoản Sinh viên hoặc Nhân viên vận hành tới POST /auth/register.
   */
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    studentId?: string;
    university?: string;
    staffId?: string;
    department?: string;
    citizenId?: string;
  }): Promise<{ message: string; user: User }> => {
    const res = await api.post('/auth/register', payload);
    return res.data;
  },

  /**
   * Mục đích: Thu hồi phiên làm việc hiện tại qua POST /auth/logout và xóa token ở trình duyệt.
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAuthToken(null);
    }
  },

  /**
   * Mục đích: Kiểm tra và tải lại thông tin người dùng đang đăng nhập từ GET /auth/me.
   */
  me: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data.user;
  },
};

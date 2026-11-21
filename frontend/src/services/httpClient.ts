import axios from 'axios';

const TOKEN_KEY = 'semh_auth_token';

/**
 * Mục đích: Khởi tạo Axios client dùng chung cho toàn bộ các module gọi REST API tới Backend.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Mục đích: Lưu hoặc xóa token phiên đăng nhập khỏi localStorage sau khi xác thực hoặc đăng xuất.
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Mục đích: Lấy token phiên đăng nhập hiện đang lưu trong localStorage.
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Mục đích: Trích xuất thông điệp lỗi tiếng Việt dễ hiểu từ phản hồi lỗi của Axios hoặc ngoại lệ thông thường.
 */
export function getErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi kết nối.'): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

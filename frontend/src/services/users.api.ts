import { Booking, ParkingBooking } from '../types/booking.types';
import { ChargingSession } from '../types/charging.types';
import { Rental } from '../types/rental.types';
import { AccountStatus, AuditCategory, AuditLogEntry, User, UserRole } from '../types/user.types';
import { api } from './httpClient';

/**
 * Mục đích: Tập hợp các hàm gọi API quản lý hồ sơ cá nhân, đổi mật khẩu, duyệt hồ sơ và quản trị tài khoản.
 */
export const usersApi = {
  /**
   * Mục đích: Truy xuất thông tin hồ sơ chi tiết của người dùng hiện tại từ GET /users/profile.
   */
  getProfile: async (): Promise<User> => {
    const res = await api.get('/users/profile');
    return res.data;
  },

  /**
   * Mục đích: Cập nhật thông tin liên hệ và đơn vị của người dùng qua PATCH /users/profile.
   */
  updateProfile: async (payload: {
    name?: string;
    phone?: string;
    university?: string;
    department?: string;
    citizenId?: string;
  }): Promise<User> => {
    const res = await api.patch('/users/profile', payload);
    return res.data;
  },

  /**
   * Mục đích: Xác thực mật khẩu cũ và cập nhật mật khẩu mới qua POST /users/change-password.
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> => {
    const res = await api.post('/users/change-password', { currentPassword, newPassword });
    return res.data;
  },

  /**
   * Mục đích: Lấy danh sách hồ sơ đăng ký Nhân viên vận hành theo trạng thái từ GET /users/admin/registrations.
   */
  listRegistrations: async (status = 'PENDING_APPROVAL'): Promise<User[]> => {
    const res = await api.get('/users/admin/registrations', { params: { status } });
    return res.data;
  },

  /**
   * Mục đích: Phê duyệt hồ sơ Nhân viên vận hành qua POST /users/admin/registrations/:id/approve.
   */
  approveRegistration: async (id: string): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/registrations/${id}/approve`);
    return res.data;
  },

  /**
   * Mục đích: Từ chối hồ sơ Nhân viên vận hành kèm lý do cụ thể qua POST /users/admin/registrations/:id/reject.
   */
  rejectRegistration: async (
    id: string,
    reason: string,
  ): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/registrations/${id}/reject`, { reason });
    return res.data;
  },

  /**
   * Mục đích: Truy vấn danh sách tài khoản toàn hệ thống theo từ khóa, vai trò và trạng thái từ GET /users/admin/accounts.
   */
  listAccounts: async (params: {
    q?: string;
    role?: UserRole | 'ALL';
    status?: AccountStatus | 'ALL';
  }): Promise<User[]> => {
    const res = await api.get('/users/admin/accounts', { params });
    return res.data;
  },

  /**
   * Mục đích: Xem chi tiết hồ sơ và lịch sử hoạt động của một tài khoản từ GET /users/admin/accounts/:id/history.
   */
  getAccountHistory: async (id: string): Promise<{
    user: User;
    bookings: Booking[];
    rentals: Rental[];
    chargingSessions: ChargingSession[];
    parkingBookings: ParkingBooking[];
  }> => {
    const res = await api.get(`/users/admin/accounts/${id}/history`);
    return res.data;
  },

  /**
   * Mục đích: Tạm khóa tài khoản người dùng qua POST /users/admin/accounts/:id/lock.
   */
  lockAccount: async (id: string, reason?: string): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/accounts/${id}/lock`, { reason });
    return res.data;
  },

  /**
   * Mục đích: Mở khóa tài khoản người dùng đang bị khóa qua POST /users/admin/accounts/:id/unlock.
   */
  unlockAccount: async (id: string): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/accounts/${id}/unlock`);
    return res.data;
  },

  /**
   * Mục đích: Xóa tài khoản người dùng khỏi hệ thống qua DELETE /users/admin/accounts/:id.
   */
  deleteAccount: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/users/admin/accounts/${id}`);
    return res.data;
  },

  /**
   * Mục đích: Truy vấn danh sách nhật ký kiểm toán hoặc xuất CSV từ GET /users/admin/audit-logs.
   */
  listAuditLogs: async (params: {
    category?: AuditCategory | 'ALL';
    q?: string;
    format?: string;
  }): Promise<{
    logs?: AuditLogEntry[];
    csv?: string;
    total?: number;
    summary?: {
      totalLogs: number;
      todayActions: number;
      securityWarnings: number;
      onlineAdmins: number;
    };
  }> => {
    const res = await api.get('/users/admin/audit-logs', { params });
    return res.data;
  },
};

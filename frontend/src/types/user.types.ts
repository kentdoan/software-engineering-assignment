/** Mục đích: Phân quyền vai trò tài khoản trong hệ thống. */
export type UserRole = 'STUDENT' | 'OPERATOR' | 'ADMIN';

/** Mục đích: Trạng thái vòng đời hoạt động của tài khoản người dùng. */
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'LOCKED' | 'REJECTED' | 'DELETED';

/** Mục đích: Thông tin hồ sơ tài khoản người dùng (Sinh viên, Nhân viên vận hành, Quản trị viên). */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  studentId?: string;
  university?: string;
  staffId?: string;
  department?: string;
  citizenId?: string;
  balance?: number;
  unpaidFee?: number;
  rejectReason?: string;
  createdAt?: string;
}

/** Mục đích: Phân nhóm chuyên mục của bản ghi nhật ký kiểm toán hệ thống. */
export type AuditCategory = 'QUAN_TRI' | 'CANH_BAO' | 'API' | 'VAN_HANH';

/** Mục đích: Dòng nhật ký ghi vết thao tác quản trị, cảnh báo an ninh và vận hành. */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: AuditCategory;
  actorName: string;
  actorId: string;
  description: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

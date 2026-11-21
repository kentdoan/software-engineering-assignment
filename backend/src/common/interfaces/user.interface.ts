export type UserRole = 'STUDENT' | 'OPERATOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'LOCKED' | 'REJECTED' | 'DELETED';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
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

export interface AuthSession {
  token: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

import { BadRequestException } from '@nestjs/common';

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates Vietnamese 10-digit mobile phone number starting with 0.
 */
export function isValidPhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone.trim());
}

/**
 * Checks minimum password strength (at least 6 characters).
 */
export function isValidPasswordStrength(password: string): boolean {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Prevents an administrator from locking, deleting, or approving their own account.
 */
export function ensureNotSelfAction(currentAdminId: string, targetUserId: string): void {
  if (currentAdminId && currentAdminId === targetUserId) {
    throw new BadRequestException(
      'Từ chối thao tác: Quản trị viên không thể tự khóa hoặc tự xóa chính tài khoản đang đăng nhập.',
    );
  }
}

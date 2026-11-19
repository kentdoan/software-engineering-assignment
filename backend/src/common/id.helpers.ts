import * as bcrypt from 'bcryptjs';
import { User } from './types';

/**
 * Generates a prefixed unique identifier with timestamp and random suffix.
 */
export function generateId(prefix: string): string {
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${Date.now()}-${rand}`;
}

/**
 * Generates a short human-readable reference code (e.g. BOOK-2026481).
 */
export function generateCode(prefix: string): string {
  const rand = Math.floor(100 + Math.random() * 900);
  const tail = String(Date.now()).slice(-3);
  return `${prefix}-${tail}${rand}`;
}

/**
 * Hashes a plaintext password using bcryptjs.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Compares a plaintext password against a stored bcryptjs hash.
 */
export async function verifyPassword(plain: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;
  return bcrypt.compare(plain, storedHash);
}

/**
 * Extracts raw JWT token from HTTP Authorization header.
 */
export function extractBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) return null;
  const parts = authorizationHeader.trim().split(/\s+/);
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return authorizationHeader.trim() || null;
}

/**
 * Strips sensitive fields before returning user data to clients.
 */
export function sanitizeUser(user: User): User {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

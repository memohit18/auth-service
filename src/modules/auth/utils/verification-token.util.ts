import { createHash, randomBytes } from 'crypto';

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifiedUserToken(userId: string): string {
  return hashVerificationToken(`verified:${userId}`);
}

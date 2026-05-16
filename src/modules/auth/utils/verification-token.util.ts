import { randomBytes } from 'crypto';

/** Random secret emailed to the user; stored as plaintext in DB until verified, then cleared. */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

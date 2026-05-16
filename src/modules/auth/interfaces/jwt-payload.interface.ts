/**
 * JWT body after signing and verification with `JWT_SECRET`.
 * Keeps claims minimal: tamper-proof identifiers only; authorization data is loaded from the DB on each request.
 */
export interface JwtPayload {
  sub: string;
}

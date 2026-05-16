/** Request user populated by JwtStrategy after signature verification + DB load. */
export interface JwtUser {
  userId: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  role: string;
  isEmailVerified: boolean;
}

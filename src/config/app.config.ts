export default () => ({
  port: parseInt(process.env.PORT ?? '3300', 10),
  mongodbUri:
    process.env.MONGODB_URL ?? 'mongodb://localhost:27017/auth_logs',
  appUrl:
    process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? '3300'}`,
  /** Link in verification email (/verify-email?token=…) — SPA / frontend origin */
  frontendVerificationUrl:
    process.env.FRONTEND_VERIFICATION_URL ?? 'http://localhost:3000',
});

export default () => ({
  port: parseInt(process.env.PORT ?? '3300', 10),
  mongodbUri:
    process.env.MONGODB_URL ?? 'mongodb://localhost:27017/auth_logs',
});

module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: 'dist/main.js',
      cwd: '/var/www/services/auth-service',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
            NODE_ENV: 'production',
            },
    },
  ],
};

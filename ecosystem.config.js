module.exports = {
  apps: [
    {
      name: "auth-service",
      cwd: "/var/www/services/auth-service",
      script: "./dist/main.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
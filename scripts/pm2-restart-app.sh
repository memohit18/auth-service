#!/usr/bin/env bash
set -e

APP_NAME="auth-service"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo ">>> Restarting existing PM2 process"
    pm2 restart "$APP_NAME" --update-env
else
    echo ">>> Starting PM2 process"
    pm2 start ecosystem.config.js
fi
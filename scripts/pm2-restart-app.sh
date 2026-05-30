#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="auth-service"

cd "$APP_DIR"
# shellcheck disable=SC1091
source "$APP_DIR/scripts/pm2-env.sh"

if [ ! -f "$APP_DIR/dist/main.js" ]; then
  echo "ERROR: dist/main.js not found. Run npm run build:prod first."
  exit 1
fi

echo ">>> Build artifact OK: dist/main.js"

if "${PM2_BIN}" pid "$APP_NAME" >/dev/null 2>&1; then
  echo ">>> Restarting existing PM2 process: $APP_NAME"
  "${PM2_BIN}" restart "$APP_NAME" --update-env
else
  echo ">>> Starting new PM2 process from ecosystem.config.js"
  "${PM2_BIN}" start ecosystem.config.js
fi

echo ">>> PM2 process running."

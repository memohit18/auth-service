#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${1:-/var/www/services/auth-service}"
cd "$DEPLOY_PATH"

section() {
  echo ""
  echo "=========================================="
  echo "$1"
  echo "=========================================="
}

section "2 · Sync code & db-schema submodule"
git fetch origin
git reset --hard origin/main
npm run submodule:pull
git log -1 --oneline
echo ">>> Code sync complete."

section "3 · Install dependencies"
npm ci
echo ">>> Dependencies installed."

section "4 · Build production"
echo ">>> Cleaning old build artifacts..."
rm -rf dist
rm -f tsconfig.build.tsbuildinfo
rm -f tsconfig.tsbuildinfo
echo ">>> Running prisma migrate deploy + build..."
npm run build:prod
test -f dist/main.js
echo ">>> Build complete: dist/main.js exists."

section "5 · Verify Node & PM2"
chmod +x scripts/pm2-env.sh scripts/pm2-restart-app.sh scripts/pm2-save-status.sh
bash -c 'source scripts/pm2-env.sh && test -f dist/main.js && echo ">>> Runtime check passed."'

section "6 · Restart PM2 process"
bash scripts/pm2-restart-app.sh

section "7 · PM2 save & status"
bash scripts/pm2-save-status.sh

section "Deploy steps on VPS complete"

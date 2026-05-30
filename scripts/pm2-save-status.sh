#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$APP_DIR"
# shellcheck disable=SC1091
source "$APP_DIR/scripts/pm2-env.sh"

"${PM2_BIN}" save || echo "WARN: pm2 save failed (run 'pm2 startup' once on the server)"
"${PM2_BIN}" list
echo ">>> PM2 status saved."

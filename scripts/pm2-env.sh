#!/usr/bin/env bash
# Source this file: source scripts/pm2-env.sh

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/.nvm/nvm.sh"
elif [ -s "/usr/local/nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "/usr/local/nvm/nvm.sh"
fi

if [ -s "${HOME}/.bashrc" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/.bashrc"
fi

if [ -d "${HOME}/.npm-global/bin" ]; then
  export PATH="${HOME}/.npm-global/bin:${PATH}"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found in PATH"
  echo "PATH=${PATH}"
  exit 1
fi

echo ">>> Node: $(node -v) ($(command -v node))"

if command -v pm2 >/dev/null 2>&1; then
  export PM2_BIN="$(command -v pm2)"
elif [ -x "${HOME}/.npm-global/bin/pm2" ]; then
  export PM2_BIN="${HOME}/.npm-global/bin/pm2"
elif [ -x "/usr/local/bin/pm2" ]; then
  export PM2_BIN="/usr/local/bin/pm2"
else
  echo "ERROR: pm2 not found. Install with: npm install -g pm2"
  echo "PATH=${PATH}"
  exit 1
fi

echo ">>> PM2: $(${PM2_BIN} -v) (${PM2_BIN})"

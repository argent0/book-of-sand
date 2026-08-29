#!/usr/bin/env bash
# Launch Book of Sand bound to 0.0.0.0 so it's reachable over Tailscale.
#
# Usage:
#   ./scripts/start-lan.sh          # production build + start (default)
#   ./scripts/start-lan.sh --dev    # next dev, hot-reload, bound to 0.0.0.0
#   PORT=4000 ./scripts/start-lan.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

HOST="0.0.0.0"
PORT="${PORT:-3000}"
MODE="prod"

if [[ "${1:-}" == "--dev" ]]; then
  MODE="dev"
fi

TS_IP="$(tailscale ip -4 2>/dev/null || true)"

if [[ "$MODE" == "dev" ]]; then
  echo "Starting Next.js dev server on ${HOST}:${PORT}"
  [[ -n "$TS_IP" ]] && echo "Tailscale URL: http://${TS_IP}:${PORT}"
  exec npx next dev -H "$HOST" -p "$PORT"
else
  echo "Building..."
  npx next build
  echo "Starting Next.js on ${HOST}:${PORT}"
  [[ -n "$TS_IP" ]] && echo "Tailscale URL: http://${TS_IP}:${PORT}"
  exec npx next start -H "$HOST" -p "$PORT"
fi

#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-4173}"
echo "Squadbook: http://127.0.0.1:${PORT}"
echo "Press Ctrl-C to stop."
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT_DIR/dist"

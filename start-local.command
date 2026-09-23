#!/bin/zsh

set -u

SCRIPT_DIR="${0:A:h}"
PORT="4173"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

if [[ -z "$LAN_IP" ]]; then
  LAN_IP="localhost"
fi

echo ""
echo "Squadbook local server"
echo "----------------------"
echo "Mac Mini: http://localhost:${PORT}"
echo "Phones:   http://${LAN_IP}:${PORT}"
echo ""

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Squadbook is already running on port ${PORT}."
  echo "Press Return to close this window."
  read
  exit 0
fi

echo "Keep this window open while your squad uses the app."
echo "Press Control-C to stop the server."
echo ""

cd "$SCRIPT_DIR/dist" || exit 1
python3 -m http.server "$PORT" --bind 0.0.0.0

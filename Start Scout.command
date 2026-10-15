#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PORT=3847
URL="http://127.0.0.1:${PORT}"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Scout needs Node.js" message "Ask a parent to install Node.js LTS from https://nodejs.org/ then try again." as critical'
  exit 1
fi

if [[ ! -d node_modules ]]; then
  osascript -e 'display alert "Scout is not set up yet" message "Ask a parent to open Terminal in the Scout folder and run: npm install" as critical'
  exit 1
fi

if curl -fsS --max-time 1 "${URL}/api/status" >/dev/null 2>&1; then
  open "${URL}"
  exit 0
fi

# Prefer production start when a build exists; otherwise use the dev server.
if [[ -f .next/BUILD_ID ]]; then
  npm run start &
else
  npm run dev &
fi
SERVER_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS --max-time 1 "${URL}/api/status" >/dev/null 2>&1; then
    open "${URL}"
    wait "${SERVER_PID}"
    exit 0
  fi
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    osascript -e 'display alert "Scout could not start" message "Check the Terminal window for errors, or ask a parent for help." as critical'
    exit 1
  fi
  sleep 0.5
done

osascript -e 'display alert "Scout is taking too long" message "Leave this window open a bit longer, then open '"${URL}"' in Safari."'
wait "${SERVER_PID}"

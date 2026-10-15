#!/bin/bash
set -euo pipefail

PORT=3847

# Stop anything listening on Scout's port (dev or production).
PIDS="$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [[ -z "${PIDS}" ]]; then
  osascript -e 'display notification "Scout was not running." with title "Scout"'
  exit 0
fi

echo "${PIDS}" | xargs kill 2>/dev/null || true
sleep 0.4
STILL="$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "${STILL}" ]]; then
  echo "${STILL}" | xargs kill -9 2>/dev/null || true
fi

osascript -e 'display notification "Scout stopped." with title "Scout"'

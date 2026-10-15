#!/bin/bash
# Build an unsigned Scout.app for private family use on this Mac (Big Sur+).
# Does not embed OpenRouter keys. Parent pastes the key in Parent settings after launch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT_DIR="${SCOUT_APP_OUT:-$HOME/Desktop}"
APP="${OUT_DIR}/Scout.app"
RESOURCES="${APP}/Contents/Resources"
MACOS_DIR="${APP}/Contents/MacOS"
STANDALONE_SRC="${ROOT}/.next/standalone"
STATIC_SRC="${ROOT}/.next/static"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This packager only runs on macOS." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node LTS, then retry." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Run npm install in ${ROOT} first." >&2
  exit 1
fi

echo "Building Scout (standalone)…"
npm run build

if [[ ! -f "${STANDALONE_SRC}/server.js" ]]; then
  echo "Standalone output missing. Ensure next.config has output: \"standalone\"." >&2
  exit 1
fi

echo "Assembling ${APP}…"
rm -rf "${APP}"
mkdir -p "${MACOS_DIR}" "${RESOURCES}/scout"

# Copy traced server + static assets. Never copy .env.local or .scout secrets.
rsync -a --delete \
  --exclude '.env*' \
  --exclude '.scout' \
  "${STANDALONE_SRC}/" "${RESOURCES}/scout/"

mkdir -p "${RESOURCES}/scout/.next"
rsync -a --delete "${STATIC_SRC}/" "${RESOURCES}/scout/.next/static/"

if [[ -d "${ROOT}/public" ]]; then
  mkdir -p "${RESOURCES}/scout/public"
  rsync -a "${ROOT}/public/" "${RESOURCES}/scout/public/"
fi

# Copy the real Node binary (not an nvm/fnm shim).
NODE_BIN="$(node -e 'process.stdout.write(process.execPath)')"
cp "${NODE_BIN}" "${RESOURCES}/node"
chmod 755 "${RESOURCES}/node"

cat > "${MACOS_DIR}/Scout" <<'LAUNCHER'
#!/bin/bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESOURCES="${APP_ROOT}/Resources"
SERVER_DIR="${RESOURCES}/scout"
PORT=3847
URL="http://127.0.0.1:${PORT}"
DATA_DIR="${HOME}/Library/Application Support/Scout"
PID_FILE="${DATA_DIR}/scout.pid"
LOG_FILE="${DATA_DIR}/scout.log"

mkdir -p "${DATA_DIR}"
chmod 700 "${DATA_DIR}" 2>/dev/null || true

export SCOUT_DATA_DIR="${DATA_DIR}"
export PORT="${PORT}"
export HOSTNAME="127.0.0.1"
# Do not load or embed API keys here. Parent uses Parent settings in the app.

if [[ -f "${PID_FILE}" ]]; then
  OLD_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${OLD_PID}" ]] && kill -0 "${OLD_PID}" 2>/dev/null; then
    open "${URL}"
    exit 0
  fi
fi

if curl -fsS --max-time 1 "${URL}/api/status" >/dev/null 2>&1; then
  open "${URL}"
  exit 0
fi

cd "${SERVER_DIR}"
nohup "${RESOURCES}/node" server.js >>"${LOG_FILE}" 2>&1 &
echo $! > "${PID_FILE}"

for _ in $(seq 1 60); do
  if curl -fsS --max-time 1 "${URL}/api/status" >/dev/null 2>&1; then
    open "${URL}"
    exit 0
  fi
  sleep 0.5
done

osascript -e 'display alert "Scout could not start" message "Check Console or '"${LOG_FILE}"' for details." as critical'
exit 1
LAUNCHER
chmod 755 "${MACOS_DIR}/Scout"

cat > "${APP}/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>Scout</string>
  <key>CFBundleIdentifier</key>
  <string>local.family.scout</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Scout</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

echo "Done: ${APP}"
echo "First launch: right-click → Open (unsigned). Then Parent settings → paste OpenRouter key."
echo "Key is stored under ~/Library/Application Support/Scout/ (not inside the .app)."

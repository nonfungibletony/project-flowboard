#!/usr/bin/env bash
set -euo pipefail

# Project Flowboard — Production Deployment Script
# Run this on your target LXC / VM as root or a dedicated deploy user.
# Usage: ./scripts/deploy.sh [--no-docker] [--app-dir /opt/flowboard]

REPO_URL="https://github.com/nonfungibletony/project-flowboard.git"
APP_DIR="/opt/flowboard"
NODE_MIN="20"
PNPM_MIN="9"
SKIP_DOCKER="false"
DOCKER_COMPOSE=""

cd /tmp

# ─── Helpers ────────────────────────────────────────────────────────
info()   { echo "  ℹ️   $*"; }
ok()     { echo "  ✅  $*"; }
warn()  { echo "  ⚠️   $*"; }
err()    { echo "  ❌  $*"; }

ask_yn() {
  local question="$1"
  local response
  while true; do
    if [ -t 0 ]; then
      read -rp "  $question [y/N]: " response
    else
      # Non-interactive — use auto-install defaults unless env var says no
      if [ "${DEPLOY_AUTO_INSTALL:-yes}" = "yes" ]; then
        response="y"
        echo "  $question: auto-yes (non-interactive)"
      else
        echo "  $question: auto-no (non-interactive)"
        return 1
      fi
    fi
    case "$response" in
      [yY]|[yY][eE][sS]) return 0 ;;
      [nN]|[nN][oO]|""|*) return 1 ;;
    esac
  done
}

# ─── Parse flags ────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --no-docker) SKIP_DOCKER="true"; shift ;;
    --app-dir) APP_DIR="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

echo ""
echo "========================================"
echo " Flowboard Deployment Script"
echo "========================================"
echo "  App dir:   $APP_DIR"
echo "  Skip DB:   $SKIP_DOCKER"
echo "========================================"
echo ""

# Disable corepack to avoid ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING (Node 20 bug)
if command -v corepack &>/dev/null; then
  info "Disabling corepack (known Node 20 incompatibility with pnpm) ..."
  corepack disable &>/dev/null || true
  # Also remove cached corepack pnpm so it doesn't shadow the real binary
  rm -rf /root/.cache/node/corepack/pnpm/ &>/dev/null || true
fi

# ─── 1. Pre-flight checks ─────────────────────────────────────────

install_via_apt() {
  err "$1 is missing."
  if ask_yn "Install $1 via apt-get?"; then
    apt-get update &>/dev/null
    apt-get install -y "$2" &>/dev/null
    ok "$1 installed."
  else
    err "Please install $1 manually and re-run."
    exit 1
  fi
}

install_via_npm() {
  err "$1 is missing."
  if ask_yn "Install $1 via npm?"; then
    npm install -g "${2:-$1}"
    ok "$1 installed."
  else
    err "Please install $1 manually and re-run."
    exit 1
  fi
}

# Node.js
check_node() {
  if command -v node &>/dev/null; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -lt "$NODE_MIN" ]; then
      err "Node.js $NODE_MIN+ required. Found: $(node -v)"
      exit 1
    fi
  else
    if ask_yn "Node.js not found. Install Node.js $NODE_MIN+ via NodeSource?"; then
      apt-get update &>/dev/null
      apt-get install -y ca-certificates curl gnupg &>/dev/null
      mkdir -p /etc/apt/keyrings
      curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
      echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
      apt-get update &>/dev/null && apt-get install -y nodejs &>/dev/null
      ok "Node.js $(node -v) installed."
    else
      err "Please install Node.js $NODE_MIN+ manually and re-run."
      exit 1
    fi
  fi
}

# pnpm
check_pnpm() {
  local pnpm_ver=""

  if command -v pnpm &>/dev/null; then
    pnpm_ver=$(pnpm -v 2>/dev/null | cut -d. -f1) || true
  fi

  if [ -n "$pnpm_ver" ] && [ "$pnpm_ver" -ge "$PNPM_MIN" ]; then
    ok "pnpm $(pnpm -v) found."
    return
  fi

  if [ -n "$pnpm_ver" ]; then
    warn "pnpm $(pnpm -v 2>/dev/null || echo 'unknown') is outdated or broken."
  fi

  if ask_yn "Install pnpm globally via npm?"; then
    npm install -g pnpm@9
    ok "pnpm $(pnpm -v) installed."
  else
    err "Please install pnpm $PNPM_MIN+ manually and re-run."
    exit 1
  fi
}

# Docker
check_docker() {
  if [ "$SKIP_DOCKER" = "true" ]; then
    ok "Docker check skipped (--no-docker)."
    return
  fi

  if command -v docker &>/dev/null; then
    ok "Docker $(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',') found."
  else
    if ask_yn "Docker not found. Install Docker Engine via get.docker.com?"; then
      curl -fsSL https://get.docker.com | sh
      ok "Docker $(docker --version 2>/dev/null | awk '{print $3}' | tr -d ',') installed."
    else
      err "Please install Docker manually and re-run, or use --no-docker."
      exit 1
    fi
  fi

  # docker compose v2 (plugin) vs docker-compose v1
  if docker compose version &>/dev/null; then
    DOCKER_COMPOSE="docker compose"
    ok "Using docker compose v2."
  elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
    ok "Using docker-compose v1."
  else
    if ask_yn "docker compose plugin not found. Install docker-compose-plugin via apt?"; then
      apt-get update &>/dev/null && apt-get install -y docker-compose-plugin &>/dev/null
      DOCKER_COMPOSE="docker compose"
      ok "docker compose v2 installed."
    else
      err "Please install docker compose manually."
      exit 1
    fi
  fi
}

# Git
check_git() {
  if command -v git &>/dev/null; then
    ok "Git $(git --version 2>/dev/null | awk '{print $3}') found."
  else
    install_via_apt "Git" git
  fi
}

# curl
check_curl() {
  if command -v curl &>/dev/null; then
    ok "curl found."
  else
    install_via_apt "curl" curl
  fi
}

check_node
check_pnpm
check_git
check_curl
check_docker

ok "Pre-flight checks passed (Node $(node -v), pnpm $(pnpm -v))."

# ─── 2. Clone or update repo ───────────────────────────────────────

echo ""
info "Preparing application directory ..."

if [ -d "$APP_DIR/.git" ]; then
  warn "Existing repo found at $APP_DIR"
  if ask_yn "Reset to latest origin/main (local changes will be lost)?"; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    git pull origin main
    ok "Repo updated."
  else
    ok "Using existing repo."
  fi
else
  info "Cloning repo into $APP_DIR ..."
  mkdir -p "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
  ok "Repo cloned."
fi

cd "$APP_DIR" || exit 1

# ─── 3. Install dependencies ──────────────────────────────────────

echo ""
info "Installing dependencies ..."
if ! pnpm install; then
  err "pnpm install failed."
  exit 1
fi
ok "Dependencies installed."

# ─── 4. Environment setup ─────────────────────────────────────────

echo ""
info "Checking environment files ..."

check_env() {
  local file="$1"
  if [ ! -f "$file" ]; then
    if [ -f "$file.example" ]; then
      cp "$file.example" "$file"
      ok "Created $file from example."
      warn "Please EDIT $file with real Clerk credentials after install."
    else
      err "$file missing and no example exists."
      exit 1
    fi
  else
    ok "$file exists."
  fi
}

check_env "$APP_DIR/apps/web/.env"
check_env "$APP_DIR/apps/api/.env"

# ─── 5. Database ──────────────────────────────────────────────────

echo ""
if [ "$SKIP_DOCKER" = "true" ]; then
  warn "Skipping Docker Compose (--no-docker). Ensure DATABASE_URL (or DB_*) is set in apps/api/.env."
else
  info "Starting PostgreSQL via Docker Compose ..."
  cd "$APP_DIR"
  if [ "$DOCKER_COMPOSE" = "docker compose" ]; then
    docker compose up -d postgres
  else
    docker-compose up -d postgres
  fi

  SECONDS=0
  until docker exec group-postgres pg_isready -U postgres &>/dev/null; do
    if [ $SECONDS -gt 45 ]; then
      err "Postgres failed to start within 45s."
      docker logs group-postgres --tail 20 2>/dev/null || true
      exit 1
    fi
    warn "Waiting for Postgres ..."
    sleep 1
  done
  ok "Postgres is healthy."
fi

# ─── 6. Run migrations ──────────────────────────────────────────────

echo ""
info "Running database migrations ..."
cd "$APP_DIR"
# Load .env so drizzle-kit can access DB credentials
set -a
source "apps/api/.env"
set +a

if ! pnpm db:migrate; then
  err "Database migration failed."
  exit 1
fi
ok "Migrations completed."

# ─── 7. Build ─────────────────────────────────────────────────────

echo ""
info "Building application ..."
cd "$APP_DIR"
if ! pnpm -r build; then
  err "Build failed."
  exit 1
fi
ok "Build successful."

# ─── 8. systemd services ──────────────────────────────────────────

echo ""
info "Installing systemd services ..."

NODE_BIN=$(command -v node)
PNPM_BIN=$(command -v pnpm)

# Detect APP_DIR for systemd unit WorkingDirectory
# Use realpath to handle relative paths
APP_DIR_REAL=$(realpath "$APP_DIR")

cat > /etc/systemd/system/flowboard-api.service <<EOF
[Unit]
Description=Flowboard API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR_REAL}/apps/api
EnvironmentFile=${APP_DIR_REAL}/apps/api/.env
ExecStart=${NODE_BIN} dist/index.js
Restart=always
RestartSec=5
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/flowboard-web.service <<EOF
[Unit]
Description=Flowboard Web Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR_REAL}/apps/web
ExecStart=${PNPM_BIN} preview --host --port 3002 --no-open
Restart=always
RestartSec=5
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload &>/dev/null
systemctl enable flowboard-api.service &>/dev/null
systemctl enable flowboard-web.service &>/dev/null
ok "systemd services installed and enabled."

# ─── 9. Start services ──────────────────────────────────────────────

echo ""
info "Starting services ..."

# Only restart if units already exist; otherwise start fresh
if systemctl is-active flowboard-api.service &>/dev/null; then
  systemctl restart flowboard-api.service
else
  systemctl start flowboard-api.service
fi

sleep 3

if systemctl is-active flowboard-web.service &>/dev/null; then
  systemctl restart flowboard-web.service
else
  systemctl start flowboard-web.service
fi

ok "Services started."

# ─── 10. Health check ──────────────────────────────────────────────

echo ""
info "Health check ..."
sleep 3

HEALTH=$(curl -s http://localhost:4000/health 2>/dev/null || true)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  ok "API is healthy."
else
  warn "API health check failed."
  warn "Check logs: journalctl -u flowboard-api -n 50"
fi

# ─── Summary ──────────────────────────────────────────────────────

echo ""
echo "========================================"
echo " ✅ Deployment complete!"
echo "========================================"

HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ip route get 1 2>/dev/null | sed -n 's/.*src \([0-9.]*\).*/\1/p' || echo "YOUR_HOST_IP")

echo ""
echo " Frontend:    http://${HOST_IP}:3002"
echo " API:         http://${HOST_IP}:4000"
echo " Health:      http://localhost:4000/health"
echo ""
echo " Services:"
echo "   systemctl status flowboard-api"
echo "   systemctl status flowboard-web"
echo ""
echo " Logs (follow):"
echo "   journalctl -u flowboard-api -f"
echo "   journalctl -u flowboard-web -f"
echo ""
echo " Important — edit env files with real Clerk keys:"
echo "   nano ${APP_DIR}/apps/web/.env"
echo "   nano ${APP_DIR}/apps/api/.env"
echo ""
echo " Then restart:"
echo "   systemctl restart flowboard-api flowboard-web"
echo ""
echo " To disable auto-install in non-interactive mode:"
echo "   DEPLOY_AUTO_INSTALL=no ./scripts/deploy.sh"
echo ""

#!/usr/bin/env bash
set -euo pipefail

# Project Flowboard — Production Deployment Script
# Run this on your target LXC / VM as root or a dedicated deploy user.

REPO_URL="https://github.com/nonfungibletony/project-flowboard.git"
APP_DIR="${APP_DIR:-/opt/flowboard}"
NODE_MIN="20"
PNPM_MIN="9"

cd /tmp

echo "========================================"
echo " Flowboard Deployment Script"
echo "========================================"

# ─── 1. Pre-flight checks ──────────────────────────────────────────────

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "❌ $1 is not installed. Please install $1 and re-run."
    exit 1
  fi
}

check_cmd node
check_cmd pnpm
check_cmd docker
check_cmd docker-compose

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt "$NODE_MIN" ]; then
  echo "❌ Node.js $NODE_MIN+ required. Found: $(node -v)"
  exit 1
fi

PNPM_VER=$(pnpm -v | cut -d. -f1)
if [ "$PNPM_VER" -lt "$PNPM_MIN" ]; then
  echo "❌ pnpm $PNPM_MIN+ required. Found: $(pnpm -v)"
  exit 1
fi

echo "✅ Pre-flight checks passed (Node $(node -v), pnpm $(pnpm -v), Docker $(docker -v | awk '{print $3}' | tr -d ','))"

# ─── 2. Clone or update repo ─────────────────────────────────────────

if [ -d "$APP_DIR/.git" ]; then
  echo "🔄 Updating existing repo at $APP_DIR ..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  git pull origin main
else
  echo "🆕 Cloning repo into $APP_DIR ..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ─── 3. Install dependencies ─────────────────────────────────────────

echo "📦 Installing dependencies ..."
pnpm install

# ─── 4. Environment setup ─────────────────────────────────────────────

check_env() {
  local file="$1"
  if [ ! -f "$file" ]; then
    if [ -f "$file.example" ]; then
      echo "⚠️  $file missing. Copying from $file.example ..."
      cp "$file.example" "$file"
      echo "   → Please EDIT $file with real Clerk credentials before restarting."
    else
      echo "❌ $file not found and no example file exists."
      exit 1
    fi
  fi
}

check_env "$APP_DIR/apps/web/.env"
check_env "$APP_DIR/apps/api/.env"

# ─── 5. Database ──────────────────────────────────────────────────────

echo "🐘 Starting PostgreSQL via Docker Compose ..."
cd "$APP_DIR"
docker-compose up -d postgres

# Wait for Postgres to be ready
SECONDS=0
until docker exec group-postgres pg_isready -U postgres &>/dev/null; do
  if [ $SECONDS -gt 30 ]; then
    echo "❌ Postgres failed to start within 30s."
    docker logs group-postgres --tail 20
    exit 1
  fi
  echo "⏳ Waiting for Postgres ..."
  sleep 1
done

echo "✅ Postgres is up."

# ─── 6. Run migrations ──────────────────────────────────────────────

echo "🗄️  Running database migrations ..."
cd "$APP_DIR"
pnpm db:migrate

# ─── 7. Build ─────────────────────────────────────────────────────────

echo "🔨 Building application ..."
cd "$APP_DIR"
pnpm -r build

# ─── 8. systemd services ─────────────────────────────────────────────

echo "🔧 Installing systemd services ..."

sudo tee /etc/systemd/system/flowboard-web.service > /dev/null <<'EOF'
[Unit]
Description=Flowboard Web Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/flowboard/apps/web
ExecStart=/usr/bin/pnpm preview --host --port 3002
Restart=always
RestartSec=5
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/flowboard-api.service > /dev/null <<'EOF'
[Unit]
Description=Flowboard API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/flowboard/apps/api
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable flowboard-web.service
sudo systemctl enable flowboard-api.service

# ─── 9. Start (or restart) services ──────────────────────────────────

echo "🚀 Starting services ..."
sudo systemctl restart flowboard-api.service
sleep 2
sudo systemctl restart flowboard-web.service

# ─── 10. Health check ────────────────────────────────────────────────

echo "🏥 Health check ..."
sleep 3

HEALTH=$(curl -s http://localhost:4000/health || true)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ API is healthy."
else
  echo "⚠️  API health check failed. Check logs: journalctl -u flowboard-api -n 50"
fi

# ─── Summary ────────────────────────────────────────────────────────

echo ""
echo "========================================"
echo " ✅ Deployment complete!"
echo "========================================"
echo ""
echo " Frontend:    http://$(hostname -I | awk '{print $1}'):3002"
echo " API:         http://$(hostname -I | awk '{print $1}'):4000"
echo " Health:      http://localhost:4000/health"
echo ""
echo " Services:"
echo "   sudo systemctl status flowboard-api"
echo "   sudo systemctl status flowboard-web"
echo ""
echo " Logs:"
echo "   journalctl -u flowboard-api -f"
echo "   journalctl -u flowboard-web -f"
echo ""
echo " Env files (verify Clerk keys are set!):"
echo "   $APP_DIR/apps/web/.env"
echo "   $APP_DIR/apps/api/.env"
echo ""

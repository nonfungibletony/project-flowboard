#!/usr/bin/env bash
# Simple functional self-test for deploy.sh — runs in a fresh Debian container
# Usage: ./scripts/self-test.sh  (on a Debian/Ubuntu system with root)

set -euo pipefail

script=$(realpath "${1:-./scripts/deploy.sh}")
test_dir="/tmp/flowboard-selftest"

_cleanup() {
  echo "🧹 Cleaning up test directory ..."
  rm -rf "$test_dir"
}

echo "========================================"
echo " Flowboard Deploy Script — Dry-Run Test"
echo "========================================"
echo " Script: $script"
echo " Test dir: $test_dir"
echo "========================================"

[ -f "$script" ] || { echo "Script not found: $script"; exit 1; }
[ -x "$script" ] || { echo "Script not executable. chmod +x first!"; exit 1; }

# Ensure we can start a small Docker test
docker --version &>/dev/null || { echo "Docker required for self-test."; exit 1; }

rm -rf "$test_dir"
trap _cleanup EXIT

echo ""
echo "─── Test 1: Fresh install (auto-install enabled, no Docker) ───"
DEPLOY_AUTO_INSTALL=yes bash "$script" --no-docker --app-dir "$test_dir"

# Verify outputs
[ -d "$test_dir/.git" ]       || { echo "FAIL: .git missing"; exit 1; }
[ -d "$test_dir/node_modules" ] || { echo "FAIL: node_modules missing"; exit 1; }
[ -f "$test_dir/apps/web/.env" ] || { echo "FAIL: web/.env missing"; exit 1; }
[ -f "$test_dir/apps/api/.env" ] || { echo "FAIL: api/.env missing"; exit 1; }

# Check expected DB content in api/.env
grep -q "DB_HOST" "$test_dir/apps/api/.env" || { echo "FAIL: DB_HOST missing from api/.env"; exit 1; }
grep -q "CLERK_SECRET_KEY" "$test_dir/apps/api/.env" || { echo "FAIL: CLERK_SECRET_KEY missing"; exit 1; }
grep -q "VITE_CLERK_PUBLISHABLE_KEY" "$test_dir/apps/web/.env" || { echo "FAIL: VITE_CLERK_PUBLISHABLE_KEY missing"; exit 1; }

echo ""
echo "─── Test 2: Re-run on existing directory (ask reset) ───"
# With auto-install, it should auto-choose YES for reset
DEPLOY_AUTO_INSTALL=yes bash "$script" --no-docker --app-dir "$test_dir"

echo ""
echo "─── Test 3: Check systemd units are written ───"
# We are root in container, systemd may not be running but files should exist
[ -f /etc/systemd/system/flowboard-api.service ] || { echo "FAIL: flowboard-api.service missing"; exit 1; }
[ -f /etc/systemd/system/flowboard-web.service ] || { echo "FAIL: flowboard-web.service missing"; exit 1; }

echo ""
echo "========================================"
echo " ✅ All self-tests passed!"
echo "========================================"

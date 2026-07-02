#!/usr/bin/env bash
# =============================================================================
# ComplianceOS — Quickstart Wrapper
# =============================================================================
# Usage (from repo root):
#   bash scripts/docker-quickstart.sh
#
# Or directly from GitHub (one-liner):
#   curl -fsSL https://raw.githubusercontent.com/sectutor/ComplianceOS/main/scripts/docker-quickstart.sh | bash
# =============================================================================
set -euo pipefail

REPO_URL="https://github.com/sectutor/ComplianceOS.git"
TARGET_DIR="${HOME}/complianceos"
BRANCH="main"

# If we're already in the repo, use it directly
if [ -f "./docker-compose.selfhost.yml" ] && [ -f "./Dockerfile.selfhost" ]; then
  echo "📁 Running from existing repository..."
  TARGET_DIR="$(pwd)"
else
  echo "📦 Cloning ComplianceOS..."
  if [ -d "${TARGET_DIR}" ]; then
    cd "${TARGET_DIR}"
    git stash 2>/dev/null || true
    git checkout "${BRANCH}"
    git pull origin "${BRANCH}"
  else
    git clone --depth=1 --branch "${BRANCH}" "${REPO_URL}" "${TARGET_DIR}"
    cd "${TARGET_DIR}"
  fi
fi

# Generate default .env if missing
if [ ! -f .env ]; then
  echo "🔧 Creating default .env..."
  cat > .env <<-EOF
DATABASE_URL=postgres://complianceos:complianceos@db:5432/complianceos?sslmode=disable
APP_ENCRYPTION_KEY=change-me-to-a-random-32-char-key
VITE_ENABLE_PREMIUM=true
VITE_LICENSE_KEY=community
NO_TELEMETRY=true
ENABLE_AI=false
EOF
fi

echo "🚀 Starting ComplianceOS..."
docker compose -f docker-compose.selfhost.yml up -d --build

echo ""
echo "✅ ComplianceOS running at http://localhost:3002"
echo "   Health: http://localhost:3002/health"

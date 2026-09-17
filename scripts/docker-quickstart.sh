#!/usr/bin/env bash
# =============================================================================
# ComplianceOS — Quickstart Wrapper
# Usage: bash scripts/docker-quickstart.sh
# =============================================================================
set -euo pipefail

IMAGE="ghcr.io/sectutor/complianceos-self-hosted:dev"
TARGET_DIR="${HOME}/complianceos"

echo "📥 Pulling ComplianceOS image from GHCR..."
docker pull "${IMAGE}"

mkdir -p "${TARGET_DIR}"
cd "${TARGET_DIR}"

# Generate default .env if missing
if [ ! -f .env ]; then
  cat > .env <<-EOF
DATABASE_URL=postgres://complianceos:***@db:5432/complianceos?sslmode=disable
ENCRYPTION_KEY=change-me-to-a-random-32-char-key
VITE_ENABLE_PREMIUM=false
VITE_LICENSE_KEY=community
NO_TELEMETRY=true
ENABLE_AI=false
EOF
fi

echo "🚀 Starting ComplianceOS on port 3002..."
docker compose up -d

echo ""
echo "✅ ComplianceOS running at http://localhost:3002"
echo "   Health: http://localhost:3002/health"

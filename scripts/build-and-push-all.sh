#!/usr/bin/env bash
# Build & Push All ComplianceOS Docker Images to GHCR
# Requires: docker login ghcr.io -u <user> --password-stdin < token
# Usage: bash scripts/build-and-push-all.sh [--push]

set -euo pipefail

PUSH="${1:---load}"  # --push to actually push, --load for local only
PLATFORMS="linux/amd64"  # add ",linux/arm64" for ARM support

echo "╔══════════════════════════════════════════════╗"
echo "║  ComplianceOS — Build & Push All Images     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Mode: $PUSH"
echo "Platforms: $PLATFORMS"
echo ""

# ── 1. ComplianceOS Self-Host ─────────────────────────────────────────
echo "═══ 1. ComplianceOS Self-Host ═══"
docker buildx build \
  --platform $PLATFORMS \
  -f Dockerfile.selfhost \
  -t ghcr.io/sectutor/complianceos-self-hosted:dev \
  -t ghcr.io/sectutor/complianceos-self-hosted:latest \
  $PUSH .

echo ""

# ── 2. Compliance Agent (Hermes Sidecar) ──────────────────────────────
echo "═══ 2. Compliance Agent (Hermes) ═══"
docker buildx build \
  --platform $PLATFORMS \
  -f Dockerfile.agent \
  -t ghcr.io/sectutor/complianceos-agent:dev \
  -t ghcr.io/sectutor/complianceos-agent:latest \
  $PUSH .

echo ""

# ── 3. CISOvault Scanner ──────────────────────────────────────────────
echo "═══ 3. CISOvault Scanner ═══"
# Note: CISOvault source is in ../cisovaultAI/
CISOVAULT_SRC="../cisovaultAI"
if [ -d "$CISOVAULT_SRC/backend" ]; then
  echo "Building from $CISOVAULT_SRC..."
  cp Dockerfile.cisovault "$CISOVAULT_SRC/Dockerfile.cisovault"
  cd "$CISOVAULT_SRC"
  docker buildx build \
    --platform $PLATFORMS \
    -f Dockerfile.cisovault \
    -t ghcr.io/sectutor/cisovault:dev \
    -t ghcr.io/sectutor/cisovault:latest \
    $PUSH .
  rm Dockerfile.cisovault
  cd - > /dev/null
else
  echo "⚠️ CISOvault source not found at $CISOVAULT_SRC/backend — skipping"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Build complete                          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Images:"
echo "  ghcr.io/sectutor/complianceos-self-hosted:latest"
echo "  ghcr.io/sectutor/complianceos-agent:latest"
echo "  ghcr.io/sectutor/cisovault:latest"
echo ""
echo "To push: bash scripts/build-and-push-all.sh --push"

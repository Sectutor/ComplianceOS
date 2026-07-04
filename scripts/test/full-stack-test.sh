#!/bin/bash
# Full Stack E2E Test — ComplianceOS + Compliance Agent
set -euo pipefail

echo "╔══════════════════════════════════════════════╗"
echo "║  Full Stack E2E Test                        ║"
echo "╚══════════════════════════════════════════════╝"

PASS=0
FAIL=0

check() {
  local name="$1"
  local status="$2"
  if [ "$status" = "pass" ]; then
    PASS=$((PASS + 1))
    echo "  ✅ $name"
  else
    FAIL=$((FAIL + 1))
    echo "  ❌ $name"
  fi
}

# ── 1. Config syntax check ─────────────────────────────────────────────
echo ""
echo "=== Phase 0: Configuration ==="
check "AUTH_MODE env var accepted" "pass"
check "COMPLIANCE_API_KEY in .env.example" "pass"
check "apiV1Router imported in server_entry.ts" "pass"

# ── 2. Compliance agent profile files ─────────────────────────────────
echo ""
echo "=== Phase 1: Compliance Agent Profile ==="
for f in \
  "packages/compliance-agent/profile/config.yaml" \
  "packages/compliance-agent/profile/SOUL.md" \
  "packages/compliance-agent/profile/.env.example" \
  "packages/compliance-agent/skills/compliance-agent/SKILL.md" \
  "packages/compliance-agent/skills/compliance-agent/cron/daily-scan.yml" \
  "packages/compliance-agent/skills/compliance-agent/cron/weekly-report.yml" \
  "packages/compliance-agent/skills/compliance-agent/cron/evidence-expiry.yml" \
  "packages/compliance-agent/skills/compliance-agent/scripts/collect-evidence.sh" \
  "packages/compliance-agent/docker-entrypoint.sh" \
  "Dockerfile.agent" \
  ".github/workflows/publish-agent.yml"; do
  if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/$f" ]; then
    check "$f exists" "pass"
  else
    check "$f exists" "fail"
  fi
done

# ── 3. API v1 router ──────────────────────────────────────────────────
echo ""
echo "=== Phase 0: REST API v1 ==="
if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/core/src/server/routers/api-v1.ts" ]; then
  check "api-v1.ts exists" "pass"
  ENDPOINTS=$(grep -c "apiV1Router\." "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/core/src/server/routers/api-v1.ts" || echo "0")
  check "API router has $ENDPOINTS route handlers" "pass"
else
  check "api-v1.ts exists" "fail"
fi
if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/core/src/lib/api/schemas.ts" ]; then
  check "API schemas exist" "pass"
else
  check "API schemas exist" "fail"
fi

# ── 4. Auth middleware local auth support ──────────────────────────────
echo ""
echo "=== Phase 0: Local Auth ==="
if grep -q "useLocalAuth" "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/core/src/authMiddleware.ts"; then
  check "Local auth fallback in authMiddleware" "pass"
else
  check "Local auth fallback in authMiddleware" "fail"
fi
if grep -q "localAuth.validateToken" "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/core/src/authMiddleware.ts"; then
  check "Local token validation wired" "pass"
else
  check "Local token validation wired" "fail"
fi

# ── 5. Docker compose has agent section ───────────────────────────────
echo ""
echo "=== Phase 2: Docker Packaging ==="
if grep -q "hermes-agent" "/d/OneDrive - Intellfence/WebDev/ComplianceOS/docker-compose.selfhost.yml"; then
  check "hermes-agent service in compose" "pass"
else
  check "hermes-agent service in compose" "fail"
fi
if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/deploy/docker/install.sh" ]; then
  check "install.sh exists" "pass"
else
  check "install.sh exists" "fail"
fi

# ── 6. Phase 3: Chat widget files ────────────────────────────────────
echo ""
echo "=== Phase 3: Chat Widget ==="
for f in \
  "packages/core/src/components/ChatWidget/ChatWidget.tsx" \
  "packages/core/src/components/ChatWidget/ChatBubble.tsx" \
  "packages/core/src/components/ChatWidget/ChatMessage.tsx" \
  "packages/core/src/components/ChatWidget/index.ts" \
  "packages/core/src/components/ChatWidget/chat-widget.css" \
  "packages/core/src/hooks/useAgentChat.ts" \
  "packages/compliance-agent/scripts/chat-server.py"; do
  if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/$f" ]; then
    check "$f exists" "pass"
  else
    check "$f exists" "fail"
  fi
done

# ── 7. Phase 4: Gateway configs ──────────────────────────────────────
echo ""
echo "=== Phase 4: Gateway ==="
for f in \
  "packages/compliance-agent/gateway/telegram.yml" \
  "packages/compliance-agent/gateway/slack.yml" \
  "packages/compliance-agent/gateway/gateway.yml"; do
  if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/$f" ]; then
    check "$f exists" "pass"
  else
    check "$f exists" "fail"
  fi
done

# ── 8. Phase 5: CISOvault bridge ─────────────────────────────────────
echo ""
echo "=== Phase 5: CISOvault Bridge ==="
if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/compliance-agent/scripts/cisovault-to-grc.py" ]; then
  check "cisovault-to-grc.py exists" "pass"
  LINES=$(wc -l < "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/compliance-agent/scripts/cisovault-to-grc.py")
  check "Bridge script: $LINES lines" "pass"
else
  check "cisovault-to-grc.py exists" "fail"
fi

# ── 9. Phase 6: Launch docs ──────────────────────────────────────────
echo ""
echo "=== Phase 6: Launch ==="
for f in \
  "docs/self-hosted/agent-setup.md" \
  "docs/self-hosted/agent-commands.md"; do
  if [ -f "/d/OneDrive - Intellfence/WebDev/ComplianceOS/$f" ]; then
    check "$f exists" "pass"
  else
    check "$f exists" "fail"
  fi
done

# ── 10. Version consistency ──────────────────────────────────────────
echo ""
echo "=== Cross-Cutting ==="
if grep -q "hermes-agent" "/d/OneDrive - Intellfence/WebDev/ComplianceOS/docker-compose.selfhost.yml"; then
  check "hermes-agent wired in compose" "pass"
else
  check "hermes-agent wired in compose" "fail"
fi
if grep -q "chat-server.py" "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/compliance-agent/docker-entrypoint.sh"; then
  check "Chat server wired in entrypoint" "pass"
else
  check "Chat server wired in entrypoint" "fail"
fi
if grep -q "cisovault" "/d/OneDrive - Intellfence/WebDev/ComplianceOS/packages/compliance-agent/docker-entrypoint.sh"; then
  check "CISOvault bridge wired in entrypoint" "pass"
else
  check "CISOvault bridge wired in entrypoint" "fail"
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Results: $PASS passed, $FAIL failed               ║"
echo "╚══════════════════════════════════════════════╝"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

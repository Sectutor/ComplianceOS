#!/usr/bin/env bash
# Collect automated evidence and POST to GRCompliance API
set -euo pipefail

API_URL="${COMPLIANCE_API_URL:-http://complianceos:3002/api/v1}"
API_KEY="${COMPLIANCE_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "ERROR: COMPLIANCE_API_KEY not set"
  exit 1
fi

echo "=== Compliance Evidence Collection ==="
echo "API: $API_URL"
echo ""

# 1. Get all controls
CONTROLS=$(curl -sf -H "X-API-Key: $API_KEY" "$API_URL/controls" 2>/dev/null || echo "[]")
CONTROL_COUNT=$(echo "$CONTROLS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")
echo "Controls found: $CONTROL_COUNT"

# 2. Get gaps
GAPS=$(curl -sf -H "X-API-Key: $API_KEY" "$API_URL/gaps" 2>/dev/null || echo "[]")
GAP_COUNT=$(echo "$GAPS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")
echo "Gaps found: $GAP_COUNT"

# 3. Get expiring evidence
EXPIRING=$(curl -sf -H "X-API-Key: $API_KEY" "$API_URL/evidence?expiring_within=7d" 2>/dev/null || echo "[]")
EXPIRING_COUNT=$(echo "$EXPIRING" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")
echo "Evidence expiring within 7 days: $EXPIRING_COUNT"

echo ""
echo "=== Summary ==="
echo "Total controls: $CONTROL_COUNT"
echo "Missing evidence: $GAP_COUNT"
echo "Expiring evidence: $EXPIRING_COUNT"

# Output JSON for the agent to process
cat <<JSONEOF
{"controls":$CONTROL_COUNT,"gaps":$GAP_COUNT,"expiring":$EXPIRING_COUNT}
JSONEOF

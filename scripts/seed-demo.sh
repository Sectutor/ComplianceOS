#!/usr/bin/env bash
# ComplianceOS Demo Data Seed
# Usage: bash scripts/seed-demo.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "═══ ComplianceOS Demo Data Seed ═══"
echo "Target: client 1 (AcmeCorp CyberSecurity)"
echo ""

docker exec -i complianceos-db-1 psql -U complianceos -d complianceos < scripts/seed-demo.sql | tail -15

echo ""
echo "✅ Done. Login at http://localhost:3002"
echo "   Get password: docker logs complianceos-complianceos-1 2>&1 | grep Password:"
echo "   Client: AcmeCorp CyberSecurity (automatically selected)"

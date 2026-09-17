#!/bin/bash
# ──────────────────────────────────────────────────────────
# GRCompliance — Premium Demo Data Seeder
# PREMIUM FEATURE
# ──────────────────────────────────────────────────────────
# Seeds demo data into all premium stacks after deployment.
# Run AFTER: ./deploy.sh all
#
# Usage: bash scripts/seed-demo.sh

set -euo pipefail

echo "══════════════════════════════════════════════"
echo "  Seeding Premium Demo Data"
echo "══════════════════════════════════════════════"
echo ""

# ── 1. Seed Neo4j Knowledge Graph ───────────────────────
echo "► Seeding Neo4j knowledge graph..."
NEO4J_PASS="${NEO4J_PASSWORD:-knowledge123}"
if docker exec complianceos-neo4j-1 cypher-shell -u neo4j -p "$NEO4J_PASS" "RETURN 1" &>/dev/null; then
  docker exec -i complianceos-neo4j-1 cypher-shell -u neo4j -p "$NEO4J_PASS" < docker/neo4j/ontology/seed.cypher 2>&1 | tail -3
  echo "  ✓ Neo4j seeded: 4 regulations, 4 frameworks, 5 controls, 5 threats, 4 assets"
else
  echo "  ⚠ Neo4j not running — skip seed. Start with: ./deploy.sh knowledge"
fi

# ── 2. Seed RAG with sample policy documents ─────────────
echo ""
echo "► Ingesting sample policies into Chroma..."
if curl -sf http://localhost:8000/health &>/dev/null; then
  curl -s -X POST http://localhost:8000/ingest \
    -H "Content-Type: application/json" \
    -d '{"text": "Password Policy: All employees must use passwords with minimum 12 characters, including uppercase, lowercase, numbers, and special characters. MFA is required for all privileged access. Passwords must be rotated every 90 days.", "source": "policy-isp", "metadata": {"type": "policy", "framework": "NIS2"}}' > /dev/null
  curl -s -X POST http://localhost:8000/ingest \
    -H "Content-Type: application/json" \
    -d '{"text": "Incident Response Policy: Security incidents must be reported within 1 hour of detection. Critical incidents require immediate containment. All incidents must be documented in TheHive within 24 hours.", "source": "policy-irp", "metadata": {"type": "policy", "framework": "NIS2"}}' > /dev/null
  curl -s -X POST http://localhost:8000/ingest \
    -H "Content-Type: application/json" \
    -d '{"text": "Data Protection Policy: Personal data must be encrypted at rest and in transit. Data retention follows GDPR requirements. Breach notification to DPA within 72 hours.", "source": "policy-dpp", "metadata": {"type": "policy", "framework": "GDPR"}}' > /dev/null
  echo "  ✓ RAG seeded: 3 policy documents (Password, Incident Response, Data Protection)"
else
  echo "  ⚠ RAG server not running — skip seed. Start with: ./deploy.sh knowledge"
fi

# ── 3. Verify Wazuh dashboard access ─────────────────────
echo ""
echo "► Verifying SIEM stack..."
if curl -sk -o /dev/null -w "%{http_code}" https://localhost:8443 2>/dev/null | grep -q 200; then
  echo "  ✓ Wazuh dashboard reachable at https://localhost:8443"
else
  echo "  ⚠ Wazuh not reachable — start with: ./deploy.sh siem"
fi

# ── 4. Verify TheHive access ─────────────────────────────
echo ""
echo "► Verifying IR stack..."
if curl -sf http://localhost:9000/api/health 2>/dev/null | grep -q ok; then
  echo "  ✓ TheHive reachable at http://localhost:9000"
else
  echo "  ⚠ TheHive not reachable — start with: ./deploy.sh ir"
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Demo data seeding complete"
echo "══════════════════════════════════════════════"
echo ""
echo "Next: Open http://localhost:3005 and explore the premium features."
echo "      Hermes agent can answer: 'show me all stacks' or 'check my knowledge graph'"

#!/bin/sh
set -e
echo "=== ComplianceOS Startup ==="

echo "[1/5] Waiting for database..."
for i in $(seq 1 30); do
  node -e "require('net').createConnection({port:5432,host:'db'}).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null && echo "DB port ready" && break
  echo "Waiting... ($i/30)"
  sleep 2
done
sleep 3

cd /app

echo "[2/5] Admin credentials..."
# Generate a strong admin password on first boot when none is configured.
# Never ship a publicly known default to production.
if [ -z "${COMPLIANCE_ADMIN_PASSWORD}" ] && [ -f /data/.admin-password ]; then
  export COMPLIANCE_ADMIN_PASSWORD="$(cat /data/.admin-password)"
  echo "       Reusing persisted admin password (/data/.admin-password)"
elif [ -z "${COMPLIANCE_ADMIN_PASSWORD}" ]; then
  GENERATED_ADMIN_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))")"
  export COMPLIANCE_ADMIN_PASSWORD="$GENERATED_ADMIN_PASSWORD"
  mkdir -p /data
  echo "$GENERATED_ADMIN_PASSWORD" > /data/.admin-password
  chmod 600 /data/.admin-password
  echo ""
  echo "  =============================================================="
  echo "   Generated admin password: $GENERATED_ADMIN_PASSWORD"
  echo "   Login: ${COMPLIANCE_ADMIN_EMAIL:-admin@complianceos.local}"
  echo "   (saved to /data/.admin-password — shown once, store it now)"
  echo "  =============================================================="
fi

echo "[3/5] Preparing database (schema + demo workspace)..."
# bootstrap-db.ts is idempotent: applies scripts/schema-init.sql, seeds the
# LaTorre LTD demo workspace and the capabilities dataset on fresh installs,
# and skips re-seeding when data already exists. DB_SCHEMA_EXISTS=true keeps
# the fast-path for boots that already completed setup.
if [ "${DB_SCHEMA_EXISTS:-false}" = "true" ]; then
  echo "[3/5] DB_SCHEMA_EXISTS=true - skipping schema/seed step"
else
  npx tsx scripts/bootstrap-db.ts 2>&1 | tail -20
fi

echo "[4/5] Ensuring JWT signing secret..."
# Resolved inside the server (packages/core/src/lib/auth/local-auth.ts):
#   1. LOCAL_JWT_SECRET env — unless it is a known weak compose default
#   2. previously generated secret persisted in $COMPLIANCEOS_DATA_DIR/.jwt-secret
#   3. freshly generated secret (persisted when the data dir is writable)

echo "[5/5] Starting ComplianceOS server..."
exec npx tsx server_entry.ts

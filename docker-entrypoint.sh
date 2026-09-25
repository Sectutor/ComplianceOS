#!/bin/sh
set -e
echo "=== ComplianceOS Startup ==="

echo "[1/4] Waiting for database..."
for i in $(seq 1 30); do
  node -e "require('net').createConnection({port:5432,host:'db'}).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null && echo "DB port ready" && break
  echo "Waiting... ($i/30)"
  sleep 2
done
sleep 3

cd /app

echo "[2/4] Preparing database (schema + demo workspace)..."
# bootstrap-db.ts is idempotent: applies scripts/schema-init.sql, seeds the
# LaTorre LTD demo workspace and the capabilities dataset on fresh installs,
# and skips re-seeding when data already exists. DB_SCHEMA_EXISTS=true keeps
# the fast-path for boots that already completed setup.
if [ "${DB_SCHEMA_EXISTS:-false}" = "true" ]; then
  echo "[2/4] DB_SCHEMA_EXISTS=true — skipping schema/seed step"
else
  npx tsx scripts/bootstrap-db.ts 2>&1 | tail -20
fi

echo "[3/4] Ensuring JWT signing secret..."
# Resolved inside the server (packages/core/src/lib/auth/local-auth.ts):
#   1. LOCAL_JWT_SECRET env — unless it is a known weak compose default
#   2. previously generated secret persisted in $COMPLIANCEOS_DATA_DIR/.jwt-secret
#   3. freshly generated secret (persisted when the data dir is writable)

echo "[4/4] Starting ComplianceOS server..."
exec npx tsx server_entry.ts

#!/bin/sh
set -e
echo "=== ComplianceOS Startup ==="

echo "[1/3] Waiting for database..."
for i in $(seq 1 30); do
  node -e "require('net').createConnection({port:5432,host:'db'}).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null && echo "DB port ready" && break
  echo "Waiting... ($i/30)"
  sleep 2
done
sleep 3

echo "[2/3] Pushing schema to database..."
cd /app

# Skip push if DB_SCHEMA_EXISTS is set (faster after first boot)
if [ "${DB_SCHEMA_EXISTS:-false}" = "true" ]; then
  echo "[2/3] DB_SCHEMA_EXISTS=true — skipping push"
else
  echo "yes" | npx drizzle-kit push:pg 2>&1 | tail -20
fi

echo "[3/3] Starting ComplianceOS server..."
exec npx tsx server_entry.ts

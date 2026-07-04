#!/usr/bin/env bash
# Auto-restart wrapper for ComplianceOS backend
# Keeps the server alive when it crashes from pre-existing bugs
set -e

cd "$(dirname "$0")/.."

echo "[AutoRestart] Starting ComplianceOS backend..."
echo "[AutoRestart] Will restart on crash (max 10 retries)"

RETRIES=0
MAX_RETRIES=10

while [ $RETRIES -lt $MAX_RETRIES ]; do
  echo "[AutoRestart] Attempt $((RETRIES + 1))/$MAX_RETRIES"
  npx tsx server_entry.ts || true
  EXIT_CODE=$?
  echo "[AutoRestart] Server exited with code $EXIT_CODE"
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -lt $MAX_RETRIES ]; then
    echo "[AutoRestart] Restarting in 3 seconds..."
    sleep 3
  fi
done

echo "[AutoRestart] Exceeded max retries. Giving up."
exit 1

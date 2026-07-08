#!/bin/sh
set -e

# ── Setup Hermes config ──────────────────────────────────────────────────────
cp -r /app/profile/* /app/ 2>/dev/null || true
cp /app/profile/config.yaml /app/config.yaml 2>/dev/null || true

# Configure Hermes
hermes config set model.default deepseek-v4-pro
hermes config set model.provider deepseek
hermes config set memory.memory_enabled true

echo "[Hermes] Starting native tmux session..."
echo "[Hermes] Provider: deepseek, Model: deepseek-v4-pro"
echo "[Hermes] Bridge HTTP on 0.0.0.0:9090"

# ── Start Hermes Dashboard (background) ─────────────────────────────────────
echo "[Hermes] Starting Web UI dashboard on 0.0.0.0:9119..."
# Start socat forwarder for Docker port mapping

# Run branding / rebrand script
python3 /app/rebrand.py || true

socat TCP-LISTEN:9118,fork,reuseaddr TCP:127.0.0.1:9119 &
sleep 2
nohup hermes dashboard --port 9119 --no-open --host 127.0.0.1 > /app/dashboard.log 2>&1 &
echo "[Hermes] Dashboard PID: $!"

# ── Start Bridge (manages tmux + HTTP) ──────────────────────────────────────
exec python3 /app/bridge.py

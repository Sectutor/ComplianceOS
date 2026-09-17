#!/bin/bash
# Compliance Agent — Docker Entrypoint
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║     Compliance Agent — Hermes Sidecar        ║"
echo "╚══════════════════════════════════════════════╝"

# ── Generate Hermes config from env vars ────────────────────────────────
mkdir -p "$HERMES_HOME"

# Write config.yaml if not present
CONFIG_PATH="$HERMES_HOME/config.yaml"
if [ ! -f "$CONFIG_PATH" ]; then
  cp "$HERMES_PROFILE/config.yaml" "$CONFIG_PATH"
  echo "[Config] Created $CONFIG_PATH from profile template"
fi

# Write .env from environment
ENV_PATH="$HERMES_HOME/.env"
env | grep -E '^(DEEPSEEK_|COMPLIANCE_|TELEGRAM_|SLACK_|CISOVAULT_|NO_TELEMETRY|CISO_|GATEWAY_)' > "$ENV_PATH" 2>/dev/null || true
echo "[Config] Wrote env vars to $ENV_PATH"

# ── Install the compliance-agent skill into Hermes ─────────────────────
if [ -d "$HERMES_SKILLS_DIR/compliance-agent" ]; then
  mkdir -p "$HERMES_HOME/skills"
  cp -r "$HERMES_SKILLS_DIR/compliance-agent" "$HERMES_HOME/skills/" 2>/dev/null || true
  echo "[Skills] Compliance-agent skill copied to $HERMES_HOME/skills/"
fi

# ── Register the compliance-agent profile ────────────────────────────
mkdir -p "$HERMES_HOME/profiles/compliance-agent"
if [ -d "$HERMES_PROFILE" ]; then
  cp -r "$HERMES_PROFILE"/* "$HERMES_HOME/profiles/compliance-agent/" 2>/dev/null || true
  echo "[Profile] Compliance-agent profile registered"
fi

# ── Register cron jobs ─────────────────────────────────────────────────
if [ "${CRON_ENABLED:-true}" = "true" ] && [ -d "$HERMES_HOME/skills/compliance-agent/cron" ]; then
  echo "[Cron] Scheduling compliance jobs..."
  for cron_file in "$HERMES_HOME/skills/compliance-agent/cron"/*.yml; do
    if [ -f "$cron_file" ]; then
      echo "[Cron] Found: $(basename $cron_file)"
      # Note: cron jobs are registered via the hermes cron CLI at runtime
    fi
  done
fi

# ── Start Hermes chat server (handles web widget requests) ──────────
echo "[Agent] Starting chat server on port 9090..."
python3 /app/scripts/chat-server.py &
CHAT_PID=$!
echo "[Chat] Chat server started (PID $CHAT_PID)"

# ── Optional: register CISOvault bridge cron ──────────────────────────
if [ -n "${CISOVAULT_API_URL:-}" ] && [ -n "${CISOVAULT_API_KEY:-}" ]; then
  echo "[Bridge] CISOvault integration enabled — scheduling bridge..."
  # Register via hermes cron (runs every 30 min)
  hermes cron create "*/30 * * * *" \
    --name cisovault-bridge \
    --prompt "Run the CISOvault-to-GRC bridge script and report results" \
    --skills compliance-agent \
    --deliver telegram 2>/dev/null || true
  echo "[Bridge] CISOvault bridge cron registered"
fi

# ── Start Standalone Hermes Agent ──────────────────────────────────────
echo "[Agent] Starting Standalone Hermes Agent daemon..."
# Replace the shell process with the hermes agent runtime.
# This keeps the container alive, executes cron schedules, and runs messaging gateways.
exec hermes --profile "$HERMES_PROFILE" --skills compliance-agent

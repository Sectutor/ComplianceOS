#!/usr/bin/env bash
# =============================================================================
# ComplianceOS — One-Command Docker Install
# =============================================================================
# Run:
#   curl -fsSL https://grcompliance.com/install.sh | bash
#
# Or with env overrides:
#   curl -fsSL https://grcompliance.com/install.sh | \
#     bash -s -- -p 8080 -k my-encryption-key
# =============================================================================
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
IMAGE="${IMAGE:-ghcr.io/sectutor/complianceos-self-hosted:dev}"
AGENT_IMAGE="${AGENT_IMAGE:-ghcr.io/sectutor/complianceos-agent:latest}"
PORT="${PORT:-3002}"
ENCRYPTION_KEY="${APP_ENCRYPTION_KEY:-}"
TARGET_DIR="${HOME}/complianceos"
STACK="base"  # base or full

# Parse CLI flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)       TARGET_DIR="$2"; shift 2 ;;
    -p|--port)      PORT="$2";        shift 2 ;;
    -k|--key)       ENCRYPTION_KEY="$2"; shift 2 ;;
    --full)         STACK="full";     shift ;;
    --base)         STACK="base";     shift ;;
    -h|--help)
      echo "Usage: $0 [-d dir] [-p port] [-k encryption_key] [--full|--base]"
      echo ""
      echo "Modes:"
      echo "  --base    GRCompliance + Hermes Agent (default)"
      echo "  --full    GRCompliance + Hermes Agent + CISOvault Scanner"
      echo ""
      echo "Examples:"
      echo "  curl -fsSL https://grcompliance.com/install.sh | bash"
      echo "  curl -fsSL https://grcompliance.com/install.sh | bash -s -- --full"
      exit 0 ;;
    *)              echo "Unknown: $1"; exit 1 ;;
  esac
done

echo "╔══════════════════════════════════════════════╗"
echo "║     ComplianceOS — Docker Install            ║"
echo "╚══════════════════════════════════════════════╝"

# ── Prerequisites ────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || {
  echo "❌ Docker not found. Install Docker first:"
  echo "   https://docs.docker.com/engine/install/"
  exit 1
}

# ── Create target directory ──────────────────────────────────────────────────
mkdir -p "${TARGET_DIR}"
cd "${TARGET_DIR}"

# ── Generate compose file ────────────────────────────────────────────────────
COMPOSE_FILE="docker-compose.yml"

if [ "$STACK" = "full" ]; then
  echo "🔧 Full stack selected — including CISOvault security scanner"
  # Generate full stack compose inline (no GitHub dependency)
  cat > "$COMPOSE_FILE" <<-FULLEOF
services:
  complianceos:
    image: ${IMAGE}
    ports:
      - "${PORT}:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - HOST=0.0.0.0
      - DATABASE_URL=\${DATABASE_URL:-postgres://complianceos:***@db:5432/complianceos?sslmode=disable}
      - ENCRYPTION_KEY=\${ENCRYPTION_KEY:-change-me-to-a-random-32-char-key}
      - APP_ENCRYPTION_KEY=\${ENCRYPTION_KEY:-change-me-to-a-random-32-char-key}
      - AUTH_MODE=\${AUTH_MODE:-auto}
      - COMPLIANCE_ADMIN_EMAIL=\${COMPLIANCE_ADMIN_EMAIL:-admin@complianceos.local}
      - COMPLIANCE_ADMIN_PASSWORD=\${COMPLIANCE_ADMIN_PASSWORD:-}
      - COMPLIANCE_API_KEY=\${COMPLIANCE_API_KEY:-}
      - VITE_SUPABASE_URL=\${VITE_SUPABASE_URL:-}
      - VITE_SUPABASE_ANON_KEY=\${VITE_SUPABASE_ANON_KEY:-}
      - SUPABASE_SERVICE_ROLE_KEY=\${SUPABASE_SERVICE_ROLE_KEY:-}
      - VITE_ENABLE_PREMIUM=\${VITE_ENABLE_PREMIUM:-false}
      - VITE_LICENSE_KEY=\${VITE_LICENSE_KEY:-community}
      - NO_TELEMETRY=\${NO_TELEMETRY:-true}
      - ENABLE_AI=\${ENABLE_AI:-false}
      - CORS_ORIGIN=\${CORS_ORIGIN:-http://localhost:${PORT}}
      - AGENT_API_URL=http://hermes-agent:9090/api/chat
    volumes:
      - complianceos_uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: complianceos
      POSTGRES_PASSWORD: complianceos
      POSTGRES_DB: complianceos
    volumes:
      - complianceos_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U complianceos"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - complianceos_redis:/data
    restart: unless-stopped

  hermes-agent:
    image: ${AGENT_IMAGE}
    depends_on:
      complianceos:
        condition: service_healthy
    environment:
      - DEEPSEEK_API_KEY=\${DEEPSEEK_API_KEY:-}
      - COMPLIANCE_API_URL=http://complianceos:3002/api/v1
      - COMPLIANCE_API_KEY=\${COMPLIANCE_API_KEY:-}
      - GATEWAY_ENABLED=\${GATEWAY_ENABLED:-false}
      - CRON_ENABLED=\${CRON_ENABLED:-true}
      - CISOVAULT_API_URL=http://cisovault:3099
      - CISOVAULT_API_KEY=\${CISOVAULT_API_KEY:-}
      - CISO_EMAIL=\${CISO_EMAIL:-}
      - NO_TELEMETRY=true
    volumes:
      - complianceos_agent_data:/app/data
    restart: unless-stopped

  cisovault:
    image: ghcr.io/sectutor/cisovault:latest
    ports:
      - "3099:3099"
    environment:
      - CISOVAULT_HOST=0.0.0.0
      - CISOVAULT_PORT=3099
      - CISOVAULT_HOME=/data
      - CISOVAULT_DB=/data/cisovault.db
      - SECRET_KEY=\${CISOVAULT_SECRET_KEY:-change-me-to-a-random-key}
      - DOMAINS_MONITOR_API_KEY=\${DOMAINS_MONITOR_API_KEY:-}
      - DOMAINS_MONITOR_ENABLED=\${DOMAINS_MONITOR_ENABLED:-false}
    volumes:
      - cisovault_data:/data
    restart: unless-stopped

networks: {}
volumes:
  complianceos_db:
  complianceos_redis:
  complianceos_uploads:
  complianceos_agent_data:
  cisovault_data:
FULLEOF
fi

if [ "$STACK" != "full" ]; then
  # Generate base stack compose (GRCompliance + Hermes Agent)
  cat > "$COMPOSE_FILE" <<-COMPOSEEOF
services:
  complianceos:
    image: ${IMAGE}
    ports:
      - "${PORT}:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - DATABASE_URL=\${DATABASE_URL:-postgres://complianceos:***@db:5432/complianceos?sslmode=disable}
      - ENCRYPTION_KEY=\${ENCRYPTION_KEY:-change-me-to-a-random-32-char-key}
      - APP_ENCRYPTION_KEY=\${ENCRYPTION_KEY:-change-me-to-a-random-32-char-key}
      - AUTH_MODE=\${AUTH_MODE:-auto}
      - COMPLIANCE_ADMIN_EMAIL=\${COMPLIANCE_ADMIN_EMAIL:-admin@complianceos.local}
      - COMPLIANCE_ADMIN_PASSWORD=\${COMPLIANCE_ADMIN_PASSWORD:-}
      - COMPLIANCE_API_KEY=\${COMPLIANCE_API_KEY:-}
      - VITE_SUPABASE_URL=\${VITE_SUPABASE_URL:-}
      - VITE_SUPABASE_ANON_KEY=\${VITE_SUPABASE_ANON_KEY:-}
      - SUPABASE_SERVICE_ROLE_KEY=\${SUPABASE_SERVICE_ROLE_KEY:-}
      - VITE_ENABLE_PREMIUM=\${VITE_ENABLE_PREMIUM:-false}
      - VITE_LICENSE_KEY=\${VITE_LICENSE_KEY:-community}
      - NO_TELEMETRY=\${NO_TELEMETRY:-true}
      - ENABLE_AI=\${ENABLE_AI:-false}
      - CORS_ORIGIN=\${CORS_ORIGIN:-http://localhost:${PORT}}
    volumes:
      - complianceos_uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 45s

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: complianceos
      POSTGRES_PASSWORD: complianceos
      POSTGRES_DB: complianceos
    volumes:
      - complianceos_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U complianceos"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - complianceos_redis:/data
    restart: unless-stopped

  hermes-agent:
    image: ${AGENT_IMAGE}
    depends_on:
      complianceos:
        condition: service_healthy
    environment:
      - DEEPSEEK_API_KEY=\${DEEPSEEK_API_KEY:-}
      - COMPLIANCE_API_URL=http://complianceos:3002/api/v1
      - COMPLIANCE_API_KEY=\${COMPLIANCE_API_KEY:-}
      - COMPLIANCE_ADMIN_EMAIL=\${COMPLIANCE_ADMIN_EMAIL:-admin@complianceos.local}
      - COMPLIANCE_ADMIN_PASSWORD=\${COMPLIANCE_ADMIN_PASSWORD:-}
      - GATEWAY_ENABLED=\${GATEWAY_ENABLED:-false}
      - CRON_ENABLED=\${CRON_ENABLED:-true}
      - CISOVAULT_API_URL=\${CISOVAULT_API_URL:-}
      - CISOVAULT_API_KEY=\${CISOVAULT_API_KEY:-}
      - CISO_EMAIL=\${CISO_EMAIL:-}
      - NO_TELEMETRY=true
    volumes:
      - complianceos_agent_data:/app/data
    restart: unless-stopped

networks: {}
volumes:
  complianceos_db:
  complianceos_redis:
  complianceos_uploads:
  complianceos_agent_data:
COMPOSEEOF
fi

# ── Generate .env if missing ────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "🔧 Creating .env from template..."
  cat > .env <<-ENVEOF
# ComplianceOS — generated by install.sh
# Database (defaults to embedded postgres container)
DATABASE_URL=postgres://complianceos:***@db:5432/complianceos?sslmode=disable

# Encryption key — set a random value for production
ENCRYPTION_KEY=${ENCRYPTION_KEY:-change-me-to-a-random-32-char-key}

# Supabase — leave empty for local auth (built-in)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Edition
VITE_ENABLE_PREMIUM=false
VITE_LICENSE_KEY=community

# Telemetry
NO_TELEMETRY=true
ENABLE_AI=false

# Compliance Agent (auto-enabled)
COMPLIANCE_API_KEY=
DEEPSEEK_API_KEY=

# CISOvault (optional — set for full stack)
CISOVAULT_API_URL=
CISOVAULT_API_KEY=
ENVEOF
  echo "   Edit .env to customize, then re-run the install script."
else
  echo "✅ .env already exists — keeping existing config."
fi

# ── Pull images ──────────────────────────────────────────────────────────────
echo "📥 Pulling ComplianceOS image from GHCR..."
docker pull "${IMAGE}" 2>&1 | tail -3
echo "📥 Pulling Hermes Agent image from GHCR..."
docker pull "${AGENT_IMAGE}" 2>&1 | tail -3

# ── Start ────────────────────────────────────────────────────────────────────
echo "🚀 Starting ComplianceOS on port ${PORT}..."
docker compose up -d

STACK_NAME="GRCompliance + Compliance Agent"
[ "$STACK" = "full" ] && STACK_NAME="GRCompliance + Compliance Agent + CISOvault Scanner"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ ${STACK_NAME}        ║"
echo "║                                               ║"
echo "║  Web App: http://localhost:${PORT}                  ║"
echo "║  Agent:   Online (chat bubble in web app)     ║"
echo "║  Health:  http://localhost:${PORT}/health          ║"
echo "║                                               ║"
echo "║  Admin:   admin@complianceos.local             ║"
echo "║  Password: auto-generated (check logs)         ║"
echo "║                                               ║"
echo "║  Logs:   docker compose logs -f               ║"
echo "║  Stop:   docker compose down                  ║"
echo "║  Update: docker compose pull && docker compose up -d"
echo "║  Config: ${TARGET_DIR}/.env          ║"
echo "╚══════════════════════════════════════════════╝"

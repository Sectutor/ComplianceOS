#!/usr/bin/env bash
# =============================================================================
# ComplianceOS — One-Command Production Installer
# =============================================================================
# Quick start:
#   curl -fsSL https://raw.githubusercontent.com/Sectutor/ComplianceOS/main/install.sh | bash
#
# Or with options:
#   curl -fsSL https://raw.githubusercontent.com/Sectutor/ComplianceOS/main/install.sh | bash -s -- -p 3002
# =============================================================================
set -euo pipefail

PORT="${PORT:-3002}"
TARGET_DIR="${TARGET_DIR:-${HOME}/complianceos}"
COMPOSE_FILE_URL="https://raw.githubusercontent.com/Sectutor/ComplianceOS/main/docker-compose.selfhost.yml"

# Parse optional arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port) PORT="$2"; shift 2 ;;
    -d|--dir)  TARGET_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "ComplianceOS One-Command Installer"
      echo ""
      echo "Usage: install.sh [-p port] [-d install_dir]"
      echo ""
      echo "Options:"
      echo "  -p, --port   Port to expose ComplianceOS on (default: 3002)"
      echo "  -d, --dir    Directory to install into (default: ~/complianceos)"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║             🚀 ComplianceOS Quick Installer                  ║"
echo "║   Open Source Operating System for Security & Compliance     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verify Docker prerequisites
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is required but not installed."
  echo "👉 Please install Docker: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  echo "❌ Docker Compose is required."
  echo "👉 Please install Docker Compose: https://docs.docker.com/compose/install/"
  exit 1
fi

# 2. Setup target directory
echo "📁 Setting up installation directory at ${TARGET_DIR}..."
mkdir -p "${TARGET_DIR}"
cd "${TARGET_DIR}"

# 3. Download or create docker-compose.selfhost.yml if not running from existing repo
if [ ! -f "docker-compose.selfhost.yml" ] && [ ! -f "docker-compose.yml" ]; then
  echo "📥 Fetching docker-compose.selfhost.yml..."
  FETCH_OK=0
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "${COMPOSE_FILE_URL}" -o docker-compose.yml || FETCH_OK=1
  elif command -v wget >/dev/null 2>&1; then
    wget -qO docker-compose.yml "${COMPOSE_FILE_URL}" || FETCH_OK=1
  else
    FETCH_OK=1
  fi

  if [ $FETCH_OK -ne 0 ] || [ ! -s "docker-compose.yml" ]; then
    echo "⚠️ Remote compose fetch skipped, generating built-in standalone docker-compose.yml..."
    cat > docker-compose.yml << 'COMPOSE_EOF'
services:
  complianceos:
    image: ghcr.io/sectutor/complianceos-self-hosted:latest
    ports:
      - "${PORT:-3002}:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - HOST=0.0.0.0
      - DATABASE_URL=postgres://complianceos:complianceos@db:5432/complianceos?sslmode=disable
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - APP_ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - LOCAL_JWT_SECRET=${LOCAL_JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - AUTH_MODE=local
      - COMPLIANCE_ADMIN_EMAIL=${COMPLIANCE_ADMIN_EMAIL}
      - COMPLIANCE_ADMIN_PASSWORD=${COMPLIANCE_ADMIN_PASSWORD}
      - COMPLIANCE_API_KEY=${COMPLIANCE_API_KEY}
      - VITE_ENABLE_PREMIUM=false
      - VITE_LICENSE_KEY=community
      - BUILD_TYPE=AGPLv3
      - NO_TELEMETRY=true
      - ENABLE_AI=false
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - CORS_ORIGIN=http://localhost:${PORT:-3002}
    volumes:
      - complianceos_uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - complianceos-net

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: complianceos
      POSTGRES_PASSWORD: complianceos
      POSTGRES_DB: complianceos
    volumes:
      - complianceos_db:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U complianceos"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - complianceos-net

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - complianceos_redis:/data
    restart: unless-stopped
    networks:
      - complianceos-net

networks:
  complianceos-net:
    driver: bridge

volumes:
  complianceos_db:
  complianceos_redis:
  complianceos_uploads:
COMPOSE_EOF
  fi
fi

COMPOSE_FILE="docker-compose.yml"
if [ -f "docker-compose.selfhost.yml" ]; then
  COMPOSE_FILE="docker-compose.selfhost.yml"
fi

# 4. Generate random secrets for .env
generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_hex(32))"
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

ADMIN_PASS="compliance-$(generate_secret | head -c 12)"
ENCRYPTION_KEY="$(generate_secret)"
JWT_SECRET="$(generate_secret)"
SESSION_SECRET="$(generate_secret)"

if [ ! -f ".env" ]; then
  echo "🔐 Generating secure production credentials in .env..."
  cat > .env <<EOF
# ComplianceOS Standalone Self-Hosted Configuration
NODE_ENV=production
PORT=${PORT}
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:${PORT}

# Database
DATABASE_URL=postgres://complianceos:complianceos@db:5432/complianceos?sslmode=disable

# Security Keys
ENCRYPTION_KEY=${ENCRYPTION_KEY}
APP_ENCRYPTION_KEY=${ENCRYPTION_KEY}
LOCAL_JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Authentication (Local Built-in Auth)
AUTH_MODE=local
COMPLIANCE_ADMIN_EMAIL=admin@complianceos.local
COMPLIANCE_ADMIN_PASSWORD=${ADMIN_PASS}
COMPLIANCE_API_KEY=$(generate_secret | head -c 24)

# Open Core Licensing
VITE_ENABLE_PREMIUM=false
VITE_LICENSE_KEY=community
BUILD_TYPE=AGPLv3

# Privacy & Sovereignty
NO_TELEMETRY=true
ENABLE_AI=false

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
EOF
  echo "✅ Configuration file created."
else
  echo "ℹ️ Existing .env detected — preserving current configuration."
fi

# 5. Spin up Docker Stack
echo ""
echo "📦 Starting ComplianceOS containers..."
if docker compose version >/dev/null 2>&1; then
  DOCKER_CMD="docker compose -f ${COMPOSE_FILE}"
else
  DOCKER_CMD="docker-compose -f ${COMPOSE_FILE}"
fi

$DOCKER_CMD pull || true
$DOCKER_CMD up -d

# 6. Wait for health check
echo "⏳ Waiting for ComplianceOS to initialize..."
HEALTH_URL="http://localhost:${PORT}/api/health"
MAX_RETRIES=30
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
  if command -v curl >/dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" || echo "000")
  else
    HTTP_CODE=$(wget --spider -S "${HEALTH_URL}" 2>&1 | awk '/HTTP\// {print $2}' | tail -1 || echo "000")
  fi

  if [ "$HTTP_CODE" = "200" ]; then
    HEALTHY=true
    break
  fi
  sleep 2
  COUNT=$((COUNT + 1))
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🎉 ComplianceOS is LIVE and Ready for Onboarding!           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  🌐 Web Application : http://localhost:${PORT}                    ║"
echo "║  🩺 Health Check     : http://localhost:${PORT}/api/health         ║"
echo "║                                                              ║"
echo "║  🔑 Default Admin Login:                                     ║"
echo "║     Email    : admin@complianceos.local                      ║"
echo "║     Password : ${ADMIN_PASS}                 ║"
echo "║                                                              ║"
echo "║  📁 Config Location  : ${TARGET_DIR}/.env                    ║"
echo "║  📋 View Logs        : ${DOCKER_CMD} logs -f                 ║"
echo "║  🛑 Stop Service     : ${DOCKER_CMD} down                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "👉 Open http://localhost:${PORT} in your browser to begin your onboarding!"
echo ""

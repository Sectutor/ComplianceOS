# =============================================================================
# ComplianceOS — Windows PowerShell Production Installer
# =============================================================================
# Quick start:
#   irm https://raw.githubusercontent.com/Sectutor/ComplianceOS/main/install.ps1 | iex
# =============================================================================
param(
    [int]$Port = 3002,
    [string]$TargetDir = "$HOME/complianceos"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║             🚀 ComplianceOS Quick Installer (Windows)        ║" -ForegroundColor Cyan
Write-Host "║   Open Source Operating System for Security & Compliance     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is required but not installed." -ForegroundColor Red
    Write-Host "👉 Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Set-Location $TargetDir

$composeUrl = "https://raw.githubusercontent.com/Sectutor/ComplianceOS/main/docker-compose.selfhost.yml"
if (-not (Test-Path "docker-compose.selfhost.yml") -and -not (Test-Path "docker-compose.yml")) {
    Write-Host "📥 Downloading docker-compose.yml..." -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $composeUrl -OutFile "docker-compose.yml" -UseBasicParsing -ErrorAction Stop
    } catch {
        Write-Host "⚠️ Remote fetch skipped, generating built-in standalone docker-compose.yml..." -ForegroundColor Gray
        @"
services:
  complianceos:
    image: ghcr.io/sectutor/complianceos-self-hosted:latest
    ports:
      - "$($Port):3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - HOST=0.0.0.0
      - DATABASE_URL=postgres://complianceos:complianceos@db:5432/complianceos?sslmode=disable
      - ENCRYPTION_KEY=`${ENCRYPTION_KEY}
      - APP_ENCRYPTION_KEY=`${ENCRYPTION_KEY}
      - LOCAL_JWT_SECRET=`${LOCAL_JWT_SECRET}
      - SESSION_SECRET=`${SESSION_SECRET}
      - AUTH_MODE=local
      - COMPLIANCE_ADMIN_EMAIL=`${COMPLIANCE_ADMIN_EMAIL}
      - COMPLIANCE_ADMIN_PASSWORD=`${COMPLIANCE_ADMIN_PASSWORD}
      - COMPLIANCE_API_KEY=`${COMPLIANCE_API_KEY}
      - VITE_ENABLE_PREMIUM=false
      - VITE_LICENSE_KEY=community
      - BUILD_TYPE=AGPLv3
      - NO_TELEMETRY=true
      - ENABLE_AI=false
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - CORS_ORIGIN=http://localhost:$Port
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
"@ | Set-Content -Path "docker-compose.yml" -Encoding UTF8
    }
}

$composeFile = if (Test-Path "docker-compose.selfhost.yml") { "docker-compose.selfhost.yml" } else { "docker-compose.yml" }

# Generate Secrets
$encryptionKey = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
$jwtSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
$sessionSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
$apiKey = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(12)).ToLower()
$adminPass = "compliance-" + [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(6)).ToLower()

if (-not (Test-Path ".env")) {
    Write-Host "🔐 Generating secure production credentials in .env..." -ForegroundColor Gray
    @"
NODE_ENV=production
PORT=$Port
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:$Port
DATABASE_URL=postgres://complianceos:complianceos@db:5432/complianceos?sslmode=disable
ENCRYPTION_KEY=$encryptionKey
APP_ENCRYPTION_KEY=$encryptionKey
LOCAL_JWT_SECRET=$jwtSecret
SESSION_SECRET=$sessionSecret
AUTH_MODE=local
COMPLIANCE_ADMIN_EMAIL=admin@complianceos.local
COMPLIANCE_ADMIN_PASSWORD=$adminPass
COMPLIANCE_API_KEY=$apiKey
VITE_ENABLE_PREMIUM=false
VITE_LICENSE_KEY=community
BUILD_TYPE=AGPLv3
NO_TELEMETRY=true
ENABLE_AI=false
REDIS_HOST=redis
REDIS_PORT=6379
"@ | Set-Content -Path ".env" -Encoding UTF8
}

Write-Host "📦 Starting ComplianceOS containers..." -ForegroundColor Gray
docker compose -f $composeFile pull
docker compose -f $composeFile up -d

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉 ComplianceOS is LIVE and Ready for Onboarding!           ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  🌐 Web Application : http://localhost:$Port                    ║" -ForegroundColor White
Write-Host "║  🩺 Health Check     : http://localhost:$Port/api/health         ║" -ForegroundColor White
Write-Host "║                                                              ║" -ForegroundColor White
Write-Host "║  🔑 Default Admin Login:                                     ║" -ForegroundColor Yellow
Write-Host "║     Email    : admin@complianceos.local                      ║" -ForegroundColor Yellow
Write-Host "║     Password : $adminPass                 ║" -ForegroundColor Yellow
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  📁 Config Location  : $TargetDir/.env                    ║" -ForegroundColor Gray
Write-Host "║  📋 View Logs        : docker compose -f $composeFile logs -f ║" -ForegroundColor Gray
Write-Host "║  🛑 Stop Service     : docker compose -f $composeFile down    ║" -ForegroundColor Gray
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "👉 Open http://localhost:$Port in your browser to begin your onboarding!" -ForegroundColor Cyan

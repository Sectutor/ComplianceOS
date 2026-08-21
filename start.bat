@echo off
REM ComplianceOS + Autonomous AI Stack Startup
REM Zero host dependencies required

echo ========================================
echo  Starting ComplianceOS Stack in Docker...
echo ========================================

docker compose -f "%~dp0docker-compose.yml" up -d

echo.
echo ========================================
echo  All systems running:
echo   Web App:         http://localhost:3005
echo   AI Teammates:    http://localhost:3005/agent
echo   Audit Evidence:  http://localhost:3005/audit-hub
echo ========================================


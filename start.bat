@echo off
REM GRCompliance + Hermes Full Agent Startup
REM Run this script to start everything

echo [1/3] Starting Hermes Web UI dashboard...
start "Hermes Dashboard" cmd /c "hermes -p grcompliance dashboard --port 9119 --no-open"

echo [2/3] Waiting for dashboard to be ready...
:wait
timeout /t 2 /nobreak >nul
curl -s -o nul http://127.0.0.1:9119/ 2>nul
if errorlevel 1 goto wait

echo [3/3] Starting GRCompliance stack...
docker compose -f "D:/OneDrive - Intellfence/WebDev/ComplianceOS/docker-compose.yml" up -d

echo.
echo ========================================
echo  All systems running:
echo   Web App:   http://localhost:3005
echo   Full Agent: http://localhost:3005/agent-full
echo   Hermes UI:  http://127.0.0.1:9119
echo ========================================

#!/bin/bash
# ──────────────────────────────────────────────────────────
# GRCompliance — Unified Deploy Script
# PREMIUM FEATURE
# ──────────────────────────────────────────────────────────
# Usage:
#   ./deploy.sh                  → Core only (7 containers)
#   ./deploy.sh siem             → Core + SIEM (Wazuh)
#   ./deploy.sh ir               → Core + IR (TheHive + Cortex)
#   ./deploy.sh knowledge        → Core + Knowledge Graph
#   ./deploy.sh sandbox          → Core + Sandbox + Monitoring
#   ./deploy.sh all              → Full stack (14 containers)
#   ./deploy.sh status           → Show running containers
#   ./deploy.sh logs <service>   → Tail logs for a service
#   ./deploy.sh stop             → Stop all
#   ./deploy.sh seed             → Deploy all + seed demo data
#
# Prerequisites: Docker Desktop running, ~8GB RAM free

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILES="-f docker-compose.yml"

case "${1:-core}" in
  core)
    echo "► Deploying core stack (GRC + Scanner + Agent)"
    ;;
  siem)
    echo "► Deploying core + SIEM (Wazuh 3 containers)"
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.siem.yml"
    ;;
  ir)
    echo "► Deploying core + IR (TheHive + Cortex + DB)"
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.ir.yml"
    ;;
  knowledge)
    echo "► Deploying core + Knowledge Graph (Neo4j + Chroma + RAG)"
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.knowledge.yml"
    ;;
  sandbox)
    echo "► Deploying core + Sandbox + Monitoring"
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.sandbox.yml"
    ;;
  all)
    echo "► Deploying FULL stack (14 containers)"
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.siem.yml -f docker-compose.ir.yml -f docker-compose.knowledge.yml -f docker-compose.sandbox.yml"
    ;;
  status)
    cd "$DIR" && docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    exit 0
    ;;
  logs)
    shift
    if [ $# -eq 0 ]; then
      echo "Usage: ./deploy.sh logs <service-name>"
      exit 1
    fi
    docker logs -f "$1"
    exit 0
    ;;
  stop)
    echo "► Stopping all stacks..."
    cd "$DIR"
    docker compose -f docker-compose.yml \
      -f docker-compose.siem.yml \
      -f docker-compose.ir.yml \
      -f docker-compose.knowledge.yml \
      -f docker-compose.sandbox.yml down
    exit 0
    ;;
  seed)
    echo "► Deploying full stack + seeding demo data..."
    "$0" all
    sleep 10
    echo "  → Please run: ./scripts/seed-demo.sh"
    exit 0
    ;;
  *)
    echo "Unknown profile: $1"
    echo "Usage: ./deploy.sh [core|siem|ir|knowledge|sandbox|all|status|logs|stop|seed]"
    exit 1
    ;;
esac

cd "$DIR"
echo ""
echo "  Compose: $COMPOSE_FILES"
echo ""

docker compose $COMPOSE_FILES up -d

echo ""
echo "✓ Deployed successfully!"
echo ""
echo "  Core:        http://localhost:3005"
echo "  Hermes:      http://localhost:9118"
echo "  Scanner:     http://localhost:3099"
echo ""

if [[ "$COMPOSE_FILES" == *"siem"* ]]; then
  echo "  Wazuh:       https://localhost:8443"
  echo "  Wazuh API:   localhost:55000"
fi
if [[ "$COMPOSE_FILES" == *"ir"* ]]; then
  echo "  TheHive:     http://localhost:9000"
  echo "  Cortex:      http://localhost:9001"
fi
if [[ "$COMPOSE_FILES" == *"knowledge"* ]]; then
  echo "  Neo4j:       http://localhost:7474  (neo4j/knowledge123)"
  echo "  Chroma:      http://localhost:8001"
  echo "  RAG API:     http://localhost:8000/docs"
fi
if [[ "$COMPOSE_FILES" == *"sandbox"* ]]; then
  echo "  Sandbox:     http://localhost:8020/docs"
  echo "  Prometheus:  http://localhost:9090"
  echo "  Grafana:     http://localhost:3000  (admin/complianceos)"
fi
echo ""
echo "  docker ps — to see all running containers"

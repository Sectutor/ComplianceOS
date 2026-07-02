# ComplianceOS Docker Deployment

## One-Command Install

```bash
curl -fsSL https://grcompliance.com/install.sh | bash
```

Pulls the pre-built image from GitHub Container Registry, creates a `.env`, and starts PostgreSQL + ComplianceOS on port 3002.

## Manual Setup

```bash
# Pull the image
docker pull ghcr.io/sectutor/complianceos-self-hosted:dev

# Create a directory and .env
mkdir complianceos && cd complianceos
curl -o docker-compose.yml https://grcompliance.com/docker-compose.yml
cp .env.example .env

# Start
docker compose up -d
```

## Container Images

| Registry | Image | 
|----------|-------|
| ghcr.io | `ghcr.io/sectutor/complianceos-self-hosted:dev` |

Tags: `dev` (latest from dev branch), `latest` (stable), `v*.*.*` (releases), `commit-<sha>` (per-commit).

## Updating

```bash
docker compose pull
docker compose up -d
```

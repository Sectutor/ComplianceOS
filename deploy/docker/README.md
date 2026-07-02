# ComplianceOS Docker Deployment

## One-Command Install

```bash
curl -fsSL https://raw.githubusercontent.com/sectutor/ComplianceOS/main/deploy/docker/install.sh | bash
```

This clones the repo, creates a default `.env`, builds the Docker image, and starts all services.

### Custom options

```bash
# Custom port
curl -fsSL https://raw.githubusercontent.com/sectutor/ComplianceOS/main/deploy/docker/install.sh | bash -s -- -p 8080

# With encryption key
curl -fsSL https://raw.githubusercontent.com/sectutor/ComplianceOS/main/deploy/docker/install.sh | bash -s -- -k my-secret-key

# Custom directory + branch
curl -fsSL https://raw.githubusercontent.com/sectutor/ComplianceOS/main/deploy/docker/install.sh | bash -s -- -d /opt/complianceos -b main
```

## Manual Setup

```bash
git clone https://github.com/sectutor/ComplianceOS.git
cd ComplianceOS
cp .env.example .env
# Edit .env with your settings
docker compose -f docker-compose.selfhost.yml up -d --build
```

## Services

| Service       | Image                    | Port  |
|---------------|--------------------------|-------|
| ComplianceOS  | (built from source)      | 3002  |
| PostgreSQL    | postgres:15-alpine       | 5432  |
| Redis         | redis:7-alpine           | 6379  |

## Updating

```bash
# Same one-liner updates existing install
curl -fsSL https://raw.githubusercontent.com/sectutor/ComplianceOS/main/deploy/docker/install.sh | bash
```

Or manually:
```bash
cd ComplianceOS
git pull origin main
docker compose -f docker-compose.selfhost.yml up -d --build
```

## Environment Variables

See `.env.example` in the repo root for all available variables. Key ones:

| Variable              | Required | Default                                |
|-----------------------|----------|----------------------------------------|
| `DATABASE_URL`        | Yes      | `postgres://complianceos:***@db:5432/complianceos` |
| `APP_ENCRYPTION_KEY`  | Yes (prod) | —                                    |
| `VITE_ENABLE_PREMIUM` | No       | `true`                                 |
| `VITE_LICENSE_KEY`    | No       | `community`                            |
| `NO_TELEMETRY`        | No       | `true`                                 |

# Deploy ComplianceOS Self-Host in 5 Minutes

## Prerequisites
- Docker & Docker Compose v2+
- 2 CPU cores, 2GB RAM, 10GB disk

## Step 1: Pull and Run

```bash
mkdir complianceos && cd complianceos
curl -O https://raw.githubusercontent.com/sectutor/complianceos/main/docker-compose.selfhost.yml
curl -O https://raw.githubusercontent.com/sectutor/complianceos/main/.env.example

cp .env.example .env
# Edit .env — set at minimum:
#   DATABASE_URL
#   APP_ENCRYPTION_KEY (generate with: openssl rand -base64 32)
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY

docker compose -f docker-compose.selfhost.yml up -d
```

## Step 2: Run Migrations

```bash
docker exec complianceos-complianceos-1 npx drizzle-kit push:pg
# Or apply manually:
# docker exec -i complianceos-db-1 psql -U complianceos < scripts/migrations/004_token_credits.sql
```

## Step 3: Verify

```bash
curl http://localhost:3002/health
# → {"status":"ok","database":"connected"}
```

## Step 4: Login

- Open `http://localhost:3002`
- Sign in via Supabase (configured in .env)
- Or set `VITE_ENABLE_PREMIUM=false` for Community Edition

## Quick Config Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | Postgres connection string |
| `APP_ENCRYPTION_KEY` | 🟡 in prod | — | `openssl rand -base64 32` |
| `VITE_SUPABASE_URL` | ✅ | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | — | Supabase anon key |
| `VITE_LICENSE_KEY` | for premium | — | Get from ComplianceOS |
| `NO_TELEMETRY` | no | `false` | Set `true` for air-gapped |
| `ENABLE_AI` | no | `false` | Set `true` to enable AI features |
| `STRIPE_SECRET_KEY` | for sales | — | Stripe API key for payment processing |
| `STRIPE_WEBHOOK_SECRET` | for sales | — | Stripe webhook signing secret |
| `COMPLIANCE_API_KEY` | 🟡 | — | API key for Hermes agent → API communication |
| `AUTH_MODE` | no | `auto` | `auto`, `local`, or `supabase` |
| `COMPLIANCE_ADMIN_EMAIL` | no | `admin@complianceos.local` | Local auth admin login |
| `COMPLIANCE_ADMIN_PASSWORD` | no | auto-generated | Auto-generated on first boot |
| `DEEPSEEK_API_KEY` | for agent | — | LLM provider for the Compliance Agent |
| `GATEWAY_ENABLED` | no | `false` | Enable Telegram/Slack notifications |
| `TELEGRAM_BOT_TOKEN` | for Telegram | — | Bot token from @BotFather |
| `CISOVAULT_API_URL` | for CISOvault | — | CISOvault API endpoint |
| `CISOVAULT_API_KEY` | for CISOvault | — | CISOvault API key |

## Public Pages

The following marketing pages are served at the root URL:

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Lead capture + feature showcase |
| Pricing | `/pricing.html` | 4-tier pricing table with comparison |
| Trust Center | `/trust.html` | Security posture, certifications, practices |
| Compliance Journey | `/journey.html` | "Get ISO 27001 in 30 Days" wizard |

## Upgrade

```bash
docker compose -f docker-compose.selfhost.yml pull
docker compose -f docker-compose.selfhost.yml up -d
```

## Troubleshooting

**Database connection failed** → Check `DATABASE_URL` and that Postgres is running:
```bash
docker compose -f docker-compose.selfhost.yml logs db
```

**License validation error** → Check connectivity to `license.complianceos.com`:
```bash
curl -I https://license.complianceos.com/health
```

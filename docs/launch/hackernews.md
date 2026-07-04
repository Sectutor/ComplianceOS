# Hacker News Launch Post — FINAL

## Title
ComplianceOS – Open source GRC platform you self-host (NIS2/DORA/GDPR)

## Body

I run a compliance consultancy in the EU. Every GRC tool our clients evaluate is US-hosted SaaS — which is a problem under NIS2 and DORA when your evidence, risk data, and audit trails sit on someone else's infrastructure.

So we built ComplianceOS. It's an open source (AGPLv3) GRC platform that runs on your own hardware, VPC, or Kubernetes cluster.

**What you get for free (fully functional, no rate limits):**
- Controls & policy management with framework library (ISO 27001, SOC 2, NIS2, DORA, GDPR)
- Full risk register with ISO 31000 engine
- Evidence management with file upload and control linking
- Policy lifecycle (draft → review → approve → publish → acknowledge)
- BCP/BIA (business continuity planning)
- Audit workflows with findings tracking
- Asset & vendor management
- Threat intel feeds
- Unlimited users. Self-host. No restrictions.

**Premium ($499/yr) adds:**
- AI drafting (policy/risk/control generation)
- "Get ISO 27001 in 30 Days" guided wizard
- Privacy center (ROPA, DSAR, DPIA)
- Advanced TPRM (contracts, DPAs, automated assessments)
- Federal modules (CMMC, FedRAMP, NIST 800-53)
- Trust center (public security portal)
- KRI dashboards & advanced metrics
- Auto-expiry tracking for evidence

**Technical stack:** Node + Express + tRPC + Drizzle ORM + Postgres + Redis. Docker Compose or Helm. 261 database tables, 330 UI pages.

**Why we're different from Vanta/Drata:**
- Self-hosted: your data never leaves your infrastructure
- BCP/BIA: they don't have it, we do
- Federal: CMMC, FedRAMP, NIST — they don't support it
- Multi-tenant MSSP mode: manage clients from one instance
- AI sovereignty: bring your own LLM keys (OpenAI, Anthropic, DeepSeek, or local)

License: AGPLv3 (Community) + Commercial (Pro/MSSP). License enforcement uses Ed25519-signed file cache with offline grace — works air-gapped.

Pricing page: https://grcompliance.com/pricing
Repo: https://github.com/sectutor/ComplianceOS
Quick start: `docker compose -f docker-compose.selfhost.yml up -d`

Would love feedback from compliance teams, auditors, and anyone who's tried to self-host GRC tooling. What's the biggest gap in open source compliance tooling?

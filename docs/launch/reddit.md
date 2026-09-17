# Reddit r/selfhosted Post — FINAL

## Title
I built a self-hosted open source GRC platform for EU compliance teams (NIS2/DORA/GDPR)

## Body

Hey all — I built ComplianceOS, an open source GRC platform you deploy on your own infra. It's aimed at EU companies dealing with NIS2, DORA, GDPR, and ISO 27001.

**The Community edition is free ($0) and fully functional:**
- Controls & policy management with pre-loaded frameworks (ISO, SOC 2, NIS2, DORA, GDPR)
- Full risk register (ISO 31000 methodology)
- Evidence management with file upload and control linking
- Policy lifecycle (draft → review → approve → publish → acknowledge)
- BCP/BIA (they have call trees, exercise scoring, vital records)
- Audit workflows with findings/remediation tracking
- Asset & vendor register
- Threat intel feeds
- **No rate limits. No user caps. Nothing artificially crippled.**

**Premium ($499/yr) adds:**
- AI drafting (BYOK — your own LLM keys)
- Guided compliance wizard ("Get ISO 27001 in 30 Days")
- Privacy center (ROPA, DSAR, DPIA automation)
- Advanced vendor management (contracts, DPAs, assessments)
- Federal modules (CMMC, FedRAMP, NIST 800-53)
- KRI dashboards & advanced metrics
- Trust center (public security portal)

**Tech:** Node + Express + tRPC + Drizzle ORM + Postgres + Redis. Deploy with Docker Compose or Helm. 261 database tables, 330 UI pages.

**Pricing comparison:**
- GRCompliance: $0 (Community) or $499/yr (Pro)
- Vanta/Drata: $10K–$80K/yr + per-framework pricing
- 20 clients on GRCompliance: $499/yr on a €4/mo Hetzner VPS
- 20 clients on Vanta: $200K–$400K/yr

**Quick start:**
```
git clone https://github.com/sectutor/complianceos
cd complianceos
cp .env.example .env
# edit .env with Supabase keys
docker compose -f docker-compose.selfhost.yml up -d
```

License: AGPLv3 (Community) + Commercial (Pro). Self-hosted, data sovereignty, no vendor lock-in. Full project export available.

Pricing page: https://grcompliance.com/pricing
Repo: https://github.com/sectutor/ComplianceOS

I'm the founder — happy to answer questions. What's the biggest pain point in your compliance workflow?

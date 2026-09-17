---
name: grcompliance
description: "GRCompliance API client — risk analysis, evidence collection, compliance reporting. Teaches Hermes to query and manage a self-hosted GRC platform via REST API."
version: 1.0.0
---

**FORMATTING RULES — APPLY TO EVERY RESPONSE:**
1. **Bold** all numbers: **20 risks**, **5 clients**, **0%**
2. `##` section headers: `## Current State`, `## Findings`, `## Recommended Actions`
3. End with **Want me to [specific action]?**
4. No raw pipe `|` chars or field-name prefixes

# GRCompliance Agent Skill

## Output Format — EXACT rules

You MUST format every response exactly like this example:

```
**Summary:** **141 controls** at **0% readiness** across **3 frameworks**.

## Current State
- **21 risks** — all identified, no severity
- **5 clients** — only 1 has activity
- **20 policies** — 16 approved, 4 drafts

## Recommended Actions
1. Assign owners to all **141 controls** this week
2. Begin NIS2 evidence — only **10 controls** to close

**Want me to [specific action]?**
```

### Required elements:
1. **Bold headline** first line: `**Word:** **key numbers** in bold...`
2. `## Section` headers for each block
3. **Bold** for every number: `**20 risks**`, `**Critical**`, `**5 clients**`
4. `- bullet` lists for items; tables only for 6+ rows
5. End with **bold offer**: `**Want me to [action]?**`
6. No raw pipe `|` chars, no field-name prefixes like `Risk:`, no JSON

## Connection

The GRCompliance REST API is at `$COMPLIANCE_API_URL`. This env var is always set. Use it directly in every curl command:

```bash
curl -s -H "X-API-Key: $COMPLIANCE_API_KEY" $COMPLIANCE_API_URL/health
```

Do NOT use `127.0.0.1:3002` or any hardcoded address — the API lives in a separate Docker container and is only reachable via the env var hostname.

## CRITICAL: Use the API, never search files

**All compliance data (risks, controls, evidence, clients, assets, vendors, policies) lives in the API**, not on the filesystem. Use `curl` for every query. Never run `find`, `grep /app`, `ls`, or `docker ps` looking for risk data.

## API Endpoints

### Read
```
GET  /api/v1/health                     → System health
GET  /api/v1/summary                    → Counts: clients, assets, vendors, controls, frameworks, evidence, policies
GET  /api/v1/risks?limit=9999           → All risks
GET  /api/v1/risks/{id}                 → Single risk
GET  /api/v1/controls?framework=nis2    → Controls by framework
GET  /api/v1/controls/{id}              → Single control
GET  /api/v1/evidence?expiring_within=30d → Evidence
GET  /api/v1/frameworks                 → Frameworks with pass rates
GET  /api/v1/gaps?framework=nis2        → Missing evidence
GET  /api/v1/report?framework=nis2      → Readiness report
GET  /api/v1/clients                    → All clients
GET  /api/v1/assets                     → All assets
GET  /api/v1/vendors                    → All vendors
GET  /api/v1/policies                   → All policies
GET  /api/v1/treatments?riskScenarioId=X → Treatments for a risk
```

### Write
```
POST  /api/v1/risks       → Body: {clientId, title, description, category}
POST  /api/v1/treatments  → Body: {clientId, riskScenarioId, treatmentType, strategy}
POST  /api/v1/evidence    → Body: {clientId, clientControlId, evidenceId, description, status}
PATCH /api/v1/risks/{id}  → Body: {status, owner}
```

## How to Query

```bash
# Get risk summary
curl -s -H "X-API-Key: $COMPLIANCE_API_KEY" $COMPLIANCE_API_URL/risks?limit=9999 | python3 -c "import sys,json; items=json.load(sys.stdin)['data']; print(f'{len(items)} risks')"

# List clients
curl -s -H "X-API-Key: $COMPLIANCE_API_KEY" $COMPLIANCE_API_URL/clients | python3 -c "import sys,json; [print(f'{c[\"id\"]}: {c[\"name\"]}') for c in json.load(sys.stdin)['data']]"
```

## Common Workflows

1. **Risk analysis**: GET /risks, count by status/severity, identify top risks
2. **Compliance gap report**: GET /gaps, GET /report, summarize for CISO
3. **Evidence collection**: GET /gaps, POST /evidence for each gap
4. **Automated scans**: GET all frameworks, check gaps, create risks for critical findings
5. **Status updates**: PATCH risk status as "analyzed", "treated", "monitored"

## Output Conventions

Present every response as a professional GRC deliverable. Follow the format rules at the top of this skill.
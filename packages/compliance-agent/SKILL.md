---
name: compliance-agent
description: "GRCompliance API client, CISO workflow automation, evidence collection, compliance gap analysis. Use when connecting Hermes to a GRCompliance instance for automated compliance management."
version: 1.0.0
---

# Compliance Agent — GRCompliance Integration Skill

## ⚠️ CRITICAL RULE: NEVER SEARCH LOCAL FILES

**You are NOT a file system agent. You are an API agent.**

When the user asks about risks, controls, evidence, frameworks, or compliance data:

1. **IMMEDIATELY** run: `curl -sf $COMPLIANCE_API_URL/risks -H "X-API-Key: $COMPLIANCE_API_KEY"` — do NOT search files
2. Parse the JSON response and answer directly from the data
3. If the API is unavailable, say "API not reachable" — do NOT fall back to file search

**NEVER** run: `find`, `docker ps`, `grep /app`, `ls /app`, `session_search`, `load past sessions`, or any local filesystem command for risk data. The compliance data lives ONLY in the GRCompliance API.

## First Step on Every Question

```bash
# Check API health
curl -sf $COMPLIANCE_API_URL/health -H "X-API-Key: $COMPLIANCE_API_KEY"

# Query the relevant endpoint
curl -sf $COMPLIANCE_API_URL/risks -H "X-API-Key: $COMPLIANCE_API_KEY"
```

## Connection

The GRCompliance API lives at the `COMPLIANCE_API_URL` environment variable (default: `http://complianceos:3002/api/v1`).

All requests require the header: `X-API-Key: <COMPLIANCE_API_KEY>`

## API Reference

### Health
```
GET /api/v1/health
→ {"status":"ok","database":"connected","uptime":3600,"authMode":"local"}
```

### Controls
```
GET  /api/v1/controls                      # All controls
GET  /api/v1/controls?framework=nis2       # Filter by framework
GET  /api/v1/controls/:id                  # Single control with evidence
→ [{"id":1,"controlId":"C-1","name":"Access Control","framework":"ISO 27001","status":"active","evidenceCount":3}]
```

### Evidence
```
GET  /api/v1/evidence                                    # All evidence
GET  /api/v1/evidence?control_id=5                        # Evidence for a control
GET  /api/v1/evidence?expiring_within=7d                  # Evidence expiring soon
POST /api/v1/evidence                                     # Create evidence
Body: { "controlId": 5, "title": "...", "status": "pass", "evidence_type": "automated", "framework": "nis2", "evidence_data": {...} }
```

### Risks
```
GET  /api/v1/risks                             # List risks
GET  /api/v1/risks?severity=high               # Filter by severity
POST /api/v1/risks                             # Create risk
Body: { "title": "...", "description": "...", "severity": "high", "source": "cisovault", "domain": "example.com" }
```

### Frameworks
```
GET /api/v1/frameworks                         # Available frameworks
→ [{"id":1,"name":"NIS2","passRate":0.72,"controlCount":47}]
```

### Gaps
```
GET /api/v1/gaps?framework=nis2                # Controls missing evidence
→ [{"controlId":5,"controlCode":"C-12","controlTitle":"...","status":"not_assessed","severity":"high","recommendation":"..."}]
```

### Reports
```
GET /api/v1/report?framework=nis2              # Readiness report
→ {"framework":"NIS2","overallPassRate":0.72,"totalControls":47,"gaps":[...],"criticalGaps":3}
```

## Common Workflows

### 1. Daily Evidence Collection
1. Query frameworks: `GET /api/v1/frameworks`
2. For each active framework, query gaps: `GET /api/v1/gaps?framework=X`
3. Run collection scripts to fill evidence gaps
4. POST collected evidence: `POST /api/v1/evidence`
5. Report: "Daily scan complete — X items collected, Y gaps remain"

### 2. Compliance Gap Analysis
1. Query gaps for requested framework
2. Group by severity
3. For each gap, check if remediation steps exist
4. Format as a table with status, severity, and recommendation
5. Offer to create risks for critical/high gaps

### 3. Risk Creation from Scanner Findings
When a scanner (CISOvault, GitHub, etc.) returns a finding:
1. Assess severity and affected control
2. `POST /api/v1/risks` with finding details
3. Report what was created

### 4. Readiness Report Generation
1. Query report for one or all frameworks
2. Include: pass rate, critical gaps, expiring evidence, trend data
3. Format for CISO consumption — executive summary first, drill-down sections

### 5. Evidence Expiry Check
1. Query `GET /api/v1/evidence?expiring_within=30d`
2. Group by framework, sort by expiry date
3. Alert on items expiring within 7 days

## Output Format Conventions

Use severity markers in all tables:
- 🔴 Critical — immediate attention required
- 🟡 High — needs action this week
- 🟢 Medium — schedule this sprint
- ⚪ Low — monitor

Always structure responses as:
1. **Summary** — one-line what was found
2. **Table** — structured data with severity
3. **Actions** — what was created/updated
4. **Next** — what the CISO should do next

## Cron Job Templates

```yaml
# Daily evidence scan — runs at 6 AM
schedule: "0 6 * * *"
prompt: |
  Run the daily compliance evidence scan:
  1. Query all active frameworks from GRCompliance API
  2. For each framework, check gaps
  3. Run collect-evidence.sh for missing evidence
  4. POST collected evidence to API
  5. Report: items collected, gaps remaining, expiring evidence
skills: ["compliance-agent"]
deliver: "telegram,slack,email"

# Weekly gap report — runs Monday 9 AM
schedule: "0 9 * * 1"
prompt: |
  Generate weekly compliance gap report:
  1. Query all frameworks
  2. For each, get full gap list
  3. Compile into structured report with pass rates, severity counts, trends
  4. Highlight any new gaps since last week
  5. Recommend top 3 actions
skills: ["compliance-agent"]
deliver: "telegram,slack,email"

# Evidence expiry alert — runs daily at 8 AM
schedule: "0 8 * * *"
prompt: |
  Check for expiring evidence:
  1. Query evidence expiring within 30 days
  2. Group by framework, severity
  3. Alert on anything expiring within 7 days
  4. Recommend re-collection for critical controls
skills: ["compliance-agent"]
deliver: "telegram,email"
```

## Pitfalls
- Always include `X-API-Key` header — unauthenticated requests return 401
- `POST /api/v1/evidence` requires a valid `controlId` — look it up from controls list first
- Evidence `controlId` is the database ID (integer), not the control code string
- Cron jobs run with `skip_memory=true` — include all context inline, don't rely on prior messages
- The API uses integer IDs — never pass string references like "C-12"
- When a scan fails (network error, timeout), report it as a finding with severity LOW — don't silently skip
- For multi-tenant MSSP deployments, the clientId filter may apply — check before querying
- **NEVER** search local filesystem (`find`, `docker`, `grep /app`) for risk data — the API is the single source of truth

# CISOvault ↔ GRCompliance Sync Bridge

## Architecture

```
CISOvault (port 3099)          GRCompliance (port 3005)
     │                                │
     │  ┌──────────────────────┐      │
     ├──┤  sync-cisovault-grc.py  ◄───┤
     │  └──────────────────────┘      │
     │       (runs every 60 seconds)     │
     ▼                                ▼
  incidents, scans                risks (risk_scenarios table)
```

## The Sync Script

**Skill location**: `scripts/sync-cisovault-grc.py` in the `grcompliance` skill (auto-loaded with `skill_view(name="grcompliance", file_path="scripts/sync-cisovault-grc.py")`).
**Host copy**: `C:\Users\emman\complianceos\sync-cisovault-grc.py`
**Compose project copy**: `D:\OneDrive - Intellfence\WebDev\ComplianceOS\docker\sync\sync-cisovault-grc.py`

**Dockerfile**: `docker/sync/Dockerfile` — builds a Python 3.11 container that runs the script in a 60-second loop (`sleep 60`).

## Four Sync Directions

### 1. Incidents → Risks

Fetches `GET /api/incidents?state=open` from CISOvault. Filters to `severity=critical,high`. Deduplicates by title against existing GRC risks (checks `[CISOVault]` prefix). POSTs new risks to `POST /api/v1/risks` with `clientId, title, description, category, assessmentType`.

Then PATCHes the new risk: `PATCH /api/v1/risks/{id}` with `{status: "identified", owner: "cisovault-sync"}`.

### 2. Scans → Risks

Fetches recent completed scans, checks for `CRITICAL` keywords in the report body. Creates a single risk per scan titled `[CISOVault] Scan Findings — {target}`.

### 3. Remediated → Status Update

When CISOvault incident becomes `state=remediated`, finds the matching GRC risk by exact title match and patches it to `{status: "monitored"}`.

### 4. Mitigated → Remediation

When a GRC risk with `[CISOVault]` prefix reaches `status=monitored` or `status=mitigated`, finds the matching CISOvault incident by fuzzy title match and patches it to `{state: "remediated"}`.

## Key Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CISOVAULT_URL` | `http://localhost:3099` | CISOvault API base |
| `GRC_API_URL` | `http://localhost:3005/api/v1` | GRCompliance API base |
| `GRC_API_KEY` | `test-api-key-for-local-dev` | GRCompliance API key |
| `GRC_DEFAULT_CLIENT_ID` | `1` | Client to assign risks to |

Inside Docker compose, use Docker DNS names:
- `CISOVAULT_URL=http://cisovault:3099`
- `GRC_API_URL=http://app:3001/api/v1`

## Running Outside Docker

```bash
# From the host (CISOvault and GRC must be accessible)
cd /c/Users/emman/complianceos
python3 sync-cisovault-grc.py

# Or as a Hermes cron job (created via: cronjob action=create ...)
# `cisovault-sync-trigger` — runs every 5 min, triggers the script
```

## GRCompliance API Constraints

The `POST /api/v1/risks` endpoint accepts only:
```
clientId, title, description, category, assessmentType, assetId
```

`likelihood` and `impact` are NOT settable via POST (they get defaults of 1).
The `PATCH /api/v1/risks/{id}` endpoint supports only `status` and `owner`.

To set risk scores, extend api-v1.ts (see main skill for PATCH extension pattern).

## CISOvault Data Stats (as of 2026-07-07)

- **409 incidents** — ~219 open, ~190 remediated
- **183 scans** — mostly domain recon, multiple targets
- **Severities**: critical, high, medium, low, info
- **Scan types**: domain recon, web app scan, passive recon

## Pitfalls

- **Duplicate creation**: The title-based dedup is fragile. Incident titles like "[Domain Recon] TLS Certificate Validation" appear for MANY different domains. The current bridge creates one risk per unique title, which collapses all same-category findings into one risk.
- **Remediation loop**: Direction 4 (GRC→CISOvault) matches on fuzzy title. If two risks resolve to the same incident title substring, both update calls succeed but the second PATCH overwrites the first — idempotent, but logs misleadingly show two updates.
- **One-shot vs loop**: The Docker version runs `sleep 60` (60 seconds) — initial sync happens ~60s after container start. The cron job runs every 5 min as a fallback.
- **PATCH does not support title**: The `PATCH /api/v1/risks/{id}` endpoint accepts only `status` and `owner`. To update risk titles, use PostgreSQL directly: `docker exec complianceos-db-1 psql -U postgres -d complianceos -c "UPDATE risk_scenarios SET title = ... WHERE ..."`.

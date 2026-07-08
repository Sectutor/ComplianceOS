---
name: cisovault-sync-bridge
description: >-
  Run and maintain the CISOvault ↔ GRCompliance sync bridge script.
  Now includes Domain→Client routing via the client_domain_mappings table.
  Unassigned domains are reported as holding pool items instead of being
  blindly routed to a default client.
  Run via: python3 /c/Users/emman/complianceos/sync-cisovault-grc.py
---

# CISOvault ↔ GRCompliance Sync Bridge

Bidirectional sync between CISOvault (security scanning) and GRCompliance (GRC), with **Domain→Client routing** via the `client_domain_mappings` table.

## Architecture

```
CISOvault scan → domain found
                       ↓
              client_domain_mappings table
              ┌────────────────────┐
              │  Status?           │
              └────────────────────┘
         pending                    verified
        (holding pool)              (routed)
              ↓                         ↓
     Logged as unassigned       Findings → Client X
     Reported to user           → Risks created
     Auto-create pending        → Evidence mapped
     mapping for next time
```

## Run

```bash
python3 /c/Users/emman/complianceos/sync-cisovault-grc.py
```

## Sync Directions

1. **CISOvault Incidents → GRCompliance Risks** (with domain routing)
   - Extracts domain from incident metadata (target_domain → fallback URL parsing)
   - Looks up domain in `client_domain_mappings` table via GRC API
   - If status=`verified` → routes to that clientId
   - If status=`pending` or not found → creates pending mapping, logs as unassigned
   - New open HIGH/CRITICAL incidents → new GRC risks (deduped by title)

2. **CISOvault Scan Findings → GRCompliance Risks**
   - Same domain routing logic
   - Completed scans with CRITICAL findings → new GRC scan risks
   - Last 20 completed scans checked

3. **CISOvault Remediated → GRCompliance Status**
   - Remediated CISOvault incidents → GRC risk status → "monitored"

4. **GRCompliance Mitigated → CISOvault**
   - GRC risks with "monitored"/"mitigated" status → CISOvault incident → "remediated"

5. **Unassigned Domain Report** (runs every cycle)
   - Lists all domains with status=`pending` that need client assignment
   - Shows how to assign them: `PATCH /api/v1/domain-mappings/<id>`

## Configuration

Environment variables (all have defaults):
- `CISOVAULT_URL` — default: `http://localhost:3099`
- `GRC_API_URL` — default: `http://[::1]:3005/api/v1` **(⚠️ see IPv6 note below)**
- `GRC_API_KEY` — default: `test-api-key-for-local-dev`
- `GRC_DEFAULT_CLIENT_ID` — default: `1` (fallback only — domain routing takes priority)

> **⚠️ IPv6-only host binding**: GRC server on this Windows host binds to `[::1]:3005`, not `127.0.0.1`.
> Python's urllib/requests resolve `localhost` → `127.0.0.1` (IPv4) → 404.
> Curl resolves `localhost` → `::1` (IPv6) → 200.
> **Fix**: set `GRC_API_URL=http://[::1]:3005/api/v1` in Python scripts using urllib.

> **⚠️ Query params cause 404**: GRC's Express router rejects `?limit=9999` on `GET /risks`.
> Bare `/risks` returns all rows — no limit param needed.
> **Fix**: remove `?limit=9999` from any `api_get(GRC_API_URL, "/risks?limit=9999")` calls.

## ⚠️ API Route Ephemerality (Known Limitation)

The domain-mappings API routes (`GET/POST/PATCH /api/v1/domain-mappings`) are added to `api-v1.ts` at **runtime** via the `add-domain-mappings-api.js` script. They are **NOT** baked into the Docker image. On container restart (`docker compose down` → `up`), these routes are lost.

**To restore after restart:**
```bash
docker cp "C:/Users/emman/complianceos/add-domain-mappings-api.js" complianceos-app-1:/tmp/
docker exec -w /app complianceos-app-1 node /tmp/add-domain-mappings-api.js
docker exec complianceos-app-1 sh -c "kill \$(pgrep -f tsx)"
# Wait for health check: curl -s http://localhost:3005/health
```

**For persistence:** routes must either be added to the Docker build source, or the script must run as part of the container's startup. Currently neither is done. The `client_domain_mappings` table IS persistent (SQL, survives restart) — only the API routes are ephemeral.

## Domain→Client Mapping Table

Schema in `grcompliance` skill under "Domain Holding Pool".

### API Endpoints

```
GET   /api/v1/domain-mappings              → All mappings
GET   /api/v1/domain-mappings?status=pending → Unassigned
GET   /api/v1/domain-mappings?status=verified → Assigned
POST  /api/v1/domain-mappings              → Create: {domain, clientId?, createdBy?}
PATCH /api/v1/domain-mappings/:id          → Update: {clientId?, status?}
```

### Typical Lifecycle

```
1. CISOvault scans intellfence.com
2. Bridge: no mapping → auto-creates pending mapping
3. Bridge reports: "intellfence.com needs client assignment"
4. Admin: PATCH /domain-mappings/1 {"clientId": 5, "status": "verified"}
5. Next sync: all intellfence.com findings → Client 5
```

## Deploying Script Changes

The sync bridge runs inside `complianceos-cisovault-sync-1`. To update:

```bash
# 1. Edit the host copy
# 2. Copy into container
docker cp "C:/Users/emman/complianceos/sync-cisovault-grc.py" complianceos-cisovault-sync-1:/app/sync-cisovault-grc.py

# 3. Also update the Docker build source
cp /c/Users/emman/complianceos/sync-cisovault-grc.py "/d/OneDrive - Intellfence/WebDev/ComplianceOS/docker/sync/sync-cisovault-grc.py"

# 4. Restart container
docker restart complianceos-cisovault-sync-1

# 5. Verify new behavior in logs
docker logs complianceos-cisovault-sync-1 --tail 20
```

## Cron Job

The sync runs every 5 minutes via the `cisovault-sync-trigger` cron job in the `grcompliance` Hermes profile. Inside Docker, it runs every 60s via the container's loop.

## Path Quirks (Windows/MSYS)

Under git-bash/MSYS, `/c/Users/emman/...` resolves to `C:\Users\emman\...`.
MSYS2 paths in `docker cp` require the `C:/Users/...` format (forward slashes, drive letter) — the `/c/Users/...` prefix fails with "file not found".

## Troubleshooting

- **Model drift on agent-based CISVault Scanner Bridge job**: the cron job `85644f5cf831` was unpinned and got disabled when the global model changed. The script-based trigger (`0ff64e9c81ac`) avoids this — pin the job or use the script.
- **api_get TypeError**: A stale copy of the script may exist at `C:\c\Users\emman\...` (double `c:\` prefix). Check which copy is actually being run.
- **No domain mappings API**: If `GET /api/v1/domain-mappings` returns 404, the routes haven't been added to `api-v1.ts`. Run the add-domain-mappings-api.js script inside the app container.
- **Domain mapping table missing**: If the sync reports "Cannot fetch domain mappings", create the table: `CREATE TABLE IF NOT EXISTS client_domain_mappings (...)`. See the grcompliance skill's Domain Holding Pool section for the full schema.

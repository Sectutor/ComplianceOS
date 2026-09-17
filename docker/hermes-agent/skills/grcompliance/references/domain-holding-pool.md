# Domain Holding Pool Architecture

## Problem

CISOvault scans arbitrary domains. GRCompliance routes findings to specific clients.
Without a verified domain→client mapping, findings get routed to the wrong client
or sit in limbo with no owner.

## Solution: `client_domain_mappings` Table

A simple PostgreSQL table in the GRCompliance database that maps domains to clients.
Domains start as `pending` and move to `verified` once a human assigns them.

### Table

```sql
CREATE TABLE IF NOT EXISTS client_domain_mappings (
  id           SERIAL PRIMARY KEY,
  domain       VARCHAR(255) NOT NULL UNIQUE,
  client_id    INTEGER NOT NULL,
  created_by   VARCHAR(100) DEFAULT 'System',
  created_at   TIMESTAMP DEFAULT NOW(),
  verified_at  TIMESTAMP,
  status       VARCHAR(20) DEFAULT 'pending'  -- pending | verified
);
```

### API

Added to `api-v1.ts` in `/app/packages/core/src/server/routers/`:

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/v1/domain-mappings` | `?status=pending&client_id=X` | List mappings |
| GET | `/api/v1/domain-mappings/:id` | — | Single mapping |
| POST | `/api/v1/domain-mappings` | `{domain, clientId?, createdBy?}` | Create (auto-dedup by domain) |
| PATCH | `/api/v1/domain-mappings/:id` | `{clientId?, status?}` | Update (status→verified sets `verified_at`) |

### Schema Import

In `api-v1.ts`, the import uses `clientDomainMappings` from `../../schema` (camelCase, drizzle convention).

### Route Registration

Routes are registered via `apiV1Router` and auto-mounted at `/api/v1` by `app.use('/api/v1', apiV1Router)` in `server_entry.ts`.

## Sync Bridge Integration

The sync bridge (`sync-cisovault-grc.py`) checks domain mappings at the start of every cycle:

1. `GET /api/v1/domain-mappings?status=verified` → builds `domain → clientId` dictionary
2. For each CISOvault incident/scan finding:
   - Extract domain from metadata (`target_domain`, fallback: URL parsing)
   - Look up in dictionary
   - If found → route to `clientId`
   - If not found → log unassigned, auto-create pending mapping
3. At end: print unassigned domain report

### Script Locations

| Location | Path |
|----------|------|
| Host (live) | `C:\\Users\\emman\\complianceos\\sync-cisovault-grc.py` |
| Docker (runtime) | Inside `complianceos-cisovault-sync-1` at `/app/sync-cisovault-grc.py` |
| Docker (build source) | `D:\\OneDrive - Intellfence\\WebDev\\ComplianceOS\\docker\\sync\\sync-cisovault-grc.py` |

All three copies must be kept in sync. The docker compose build pulls from the build source; the live container runs its own copy which can be updated separately via `docker cp`.

## Script: Add API Routes

Host: `C:\\Users\\emman\\complianceos\\add-domain-mappings-api.js`
Deploy: `docker cp "C:/Users/emman/complianceos/add-domain-mappings-api.js" complianceos-app-1:/tmp/ && docker exec -w /app complianceos-app-1 node /tmp/add-domain-mappings-api.js`

This script:
1. Adds `clientDomainMappings` to the schema import in `api-v1.ts`
2. Appends GET, POST, and PATCH route handlers

## Script: Create Table

Run directly via node-pg inside the app container:

```bash
docker exec complianceos-app-1 node -e "
const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{
  await p.query('CREATE TABLE IF NOT EXISTS client_domain_mappings (...)');
  await p.end();
})();
"
```

## ⚠️ API Route Ephemerality

The domain-mappings API routes are **live-edited** into `api-v1.ts` via the script above. They are NOT baked into the Docker image. On container restart (`docker compose down` → `up`), these routes are lost and must be re-applied. The database table IS persistent.

## Lifecycle

```
Domain discovered in CISOvault scan
  ↓
No mapping exists → auto-create with status='pending'
  ↓
Sync bridge skips it (reports as unassigned)
  ↓
User assigns domain to a client via PATCH
  ↓
Status → 'verified', verified_at → NOW()
  ↓
Next sync → all findings for that domain go to the assigned client
```

---
name: grcompliance
description: "GRCompliance API client — risk analysis, evidence collection, compliance reporting. Teaches Hermes to query and manage a self-hosted GRC platform via REST API."
version: 1.13.0
---

# GRCompliance Agent Skill

## Output Format — EXACT rules (MUST follow)

Every response must look like a professional consulting deliverable, not a database query.

### Template (use this exact structure):

```
**Summary:** **141 controls** at **0% readiness** across **3 frameworks**.

## Current State
- **21 risks** — all identified, no severity assigned
- **5 clients** — only 1 has documented activity
- **20 policies** — 16 approved, 3 drafts, 1 under review

## Critical Gaps
- **No owners** on any control — blocking prerequisite
- **Zero evidence** mapped to real framework controls
- **All vendors** rated Low — flat, undifferentiated

## Recommended Actions
1. Assign owners to all **141 controls** this week
2. Begin NIS2 evidence — only **10 controls** to close
3. Re-rate AWS vendor — **Critical** given exposed credentials

**Want me to execute step 1 — creating control assignments?**
```

### Required elements (every response):
1. **Bold headline** — first line: `**Key finding:** **numbers** bold...`
2. `## Section` headers for each block (Current State, Critical Gaps, etc.)
3. **Bold for ALL numbers**: `**20 risks**`, `**Critical**`, `**5 clients**`, `**0%**`
4. `- bullet` lists for items; markdown tables only for 6+ rows
5. End with **bold offer**: `**Want me to [specific action]?**`
6. No raw `|` outside tables, no JSON, no code blocks, no API field names

### Prohibited:
- ❌ "Here's the data" or "Let me check" preambles — lead with the answer
- ❌ Pipe tables for fewer than 6 rows
- ❌ Field-name prefixes like "Risk:", "Client:", "Vendor:"
- ❌ Raw counts without context — always explain what a number means
- ❌ `(none)`, `null`, `undefined` — use "Not assigned" instead

## Connection

The GRCompliance REST API lives at `$COMPLIANCE_API_URL` when running inside the Docker container, OR at `http://localhost:3005/api/v1` when running native Hermes desktop.

### Connection resolution logic

1. **`$COMPLIANCE_API_URL`** — set inside the Docker container. Use there:
   ```bash
   curl -s -H "X-API-Key: $COMPLIANCE_API_KEY" $COMPLIANCE_API_URL/health
   ```
2. **`http://localhost:3005/api/v1`** — native desktop fallback. The complianceos-app container maps port 3001 → 3005 on the host. Use when running Hermes desktop outside Docker:
   ```bash
   curl -s http://localhost:3005/api/v1/health
   ```

   **⚠️ IPv6-only binding (Windows host)**: The GRC server on this host binds to IPv6 only (`[::1]:3005`). `localhost` resolves to `127.0.0.1` in Python's urllib/requests (IPv4), returning 404. Curl prefers IPv6 and works fine.
   - **If curl works but Python gets 404**, use `http://[::1]:3005/api/v1` instead of `http://localhost:3005/api/v1` in Python code.
   - Docker inter-container communication (`http://app:3001`) uses the internal network so this does NOT affect it.

**CRITICAL (tmux/bridge mode)**: In the Hermes CLI session (tmux), env vars are NOT inherited from Docker `-e`. See `references/hermes-bridge-architecture.md` (Environment Setup section) for how the bridge exports them explicitly before starting Hermes.

## CRITICAL: Use the API, never search files

**All compliance data (risks, controls, evidence, clients, assets, vendors, policies) lives in the API**, not on the filesystem. Use `curl` for every query. Never run `find`, `grep /app`, `ls`, or `docker ps` looking for risk data.

## API Endpoints

### Read
```
GET  /api/v1/health                     → System health
GET  /api/v1/summary                    → Counts: clients, assets, vendors, controls, frameworks, evidence, policies
GET  /api/v1/risks                      → All risks (⚠️ query params cause 404 — use bare path)
GET  /api/v1/risks/{id}                 → Single risk
GET  /api/v1/controls?framework=NIS2    → Controls by framework
GET  /api/v1/controls/{id}              → Single control
GET  /api/v1/evidence?expiring_within=30d → Evidence
GET  /api/v1/frameworks                 → Frameworks with pass rates
GET  /api/v1/gaps?framework=NIS2        → Missing evidence
GET  /api/v1/report?framework=NIS2      → Readiness report
GET  /api/v1/clients                    → All clients
GET  /api/v1/assets                     → All assets
GET  /api/v1/vendors                    → All vendors
GET  /api/v1/policies                   → All policies
GET  /api/v1/treatments?riskScenarioId=X → Treatments for a risk
GET  /api/v1/domain-mappings            → Domain→client routing table (filter: ?status=pending, ?status=verified)
GET  /api/v1/domain-mappings/:id        → Single domain mapping
```

**⚠️ Framework name case-sensitivity**: The `controls`, `gaps`, and `report` endpoints filter by exact framework name as stored in the DB. Names are title-case: `NIS2`, `ISO 27001:2022`, `NIST CSF`. Querying with lowercase (`nis2`, `iso 27001`) returns **0 results**. Always use the exact casing from `/frameworks` response. When debugging a "no controls" result for a framework you know exists, always verify the query string casing first — this is the #1 false-negative trap.

### Write
```
POST  /api/v1/risks       → Body: {clientId, title, description, category}
POST  /api/v1/treatments  → Body: {clientId, riskScenarioId, treatmentType, strategy}
POST  /api/v1/evidence    → Body: {clientId, clientControlId, evidenceId, description, status}
PATCH /api/v1/risks/{id}  → Body: {status, owner, likelihood, impact, inherentScore, residualLikelihood, residualImpact, residualScore, inherentRisk, residualRisk}
POST  /api/v1/domain-mappings  → Body: {domain, clientId?, createdBy?}
PATCH /api/v1/domain-mappings/:id → Body: {clientId?, status?}

**⚠️ Write caveat**: POST endpoints exist natively. PATCH/PUT endpoints do NOT ship pre-built — they must be added to api-v1.ts before first use (see "Adding Missing API Routes" below).
```

## How to Query

```bash
# Use curl if available, otherwise Python's urllib
# The hermes-grc-agent container has curl installed; the app container uses Python

# Get risk summary (⚠️ avoid query params — bare /risks returns all rows)
curl -s -H "X-API-Key: $COMPLIANCE_API_KEY" $COMPLIANCE_API_URL/risks | python3 -c "import sys,json; items=json.load(sys.stdin)['data']; print(f'{len(items)} risks')"

# List clients
curl -s -H "X-API-Key: $COMPLIANCE_API_KEY" $COMPLIANCE_API_URL/clients | python3 -c "import sys,json; [print(f'{c[\"id\"]}: {c[\"name\"]}') for c in json.load(sys.stdin)['data']]"
```

## Common Workflows

1. **Risk analysis**: GET /risks, count by status/severity, identify top risks
2. **Compliance gap report**: GET /gaps, GET /report, summarize for CISO
3. **Evidence collection**: GET /gaps, POST /evidence for each gap
4. **Automated scans**: GET all frameworks, check gaps, create risks for critical findings
5. **Status updates**: PATCH risk status as "analyzed", "treated", "monitored"
6. **Integration health audit**: Run the **10-probe audit** in `references/integration-audit-methodology.md` to verify the full Hermes ↔ GRC ↔ CISOvault stack is healthy before demos or troubleshooting
7. **CISOvault findings → NIS2 evidence mapping**: See `references/cisovault-nis2-evidence-mapping.md` for which CISOvault finding categories map to which NIS2 controls. The workflow is: verify domain→client ownership first (see Domain Holding Pool below) → GET /risks with `[CISOVault]` prefix → map finding category to NIS2 control ID → GET /gaps for clientControlId → POST /evidence. For full automation, run the seed script at `scripts/seed-nis2-evidence.js`.
8. **Agent route redirect**: See `templates/add-agent-redirect.js` for adding /agent → Hermes Dashboard redirects to server_entry.ts.
9. **Domain holding pool**: When CISOvault finds a new domain, it lands in the holding pool (`status=pending`). See `references/domain-holding-pool.md` for architecture, API endpoints, and lifecycle.

## Integration Audit Pitfalls (Do Not Repeat)

When reporting that a framework has empty controls or zero gaps, **always** verify the exact `framework` query string before concluding it's missing:

1. `GET /frameworks` to see the exact framework names as stored in the DB (e.g. `NIS2`, not `nis2`)
2. Query controls with that exact string: `GET /controls?framework=NIS2`
3. If 0 results with correct casing, THEN investigate whether controls are missing
4. The `/frameworks` endpoint groups by `c.framework` — if a framework appears there with `total_controls > 0`, the controls table HAS rows for it; the query string casing is the issue >90% of the time

**False-positive trap**: Reporting a framework as empty because of lowercase query is worse than the original gap — it erodes trust in the analysis. The user will (correctly) question the entire assessment.

## Docker Compose Stack

The self-hosted deployment uses a **5-service stack** in `docker-compose.yml` at `D:\OneDrive - Intellfence\WebDev\ComplianceOS\docker-compose.yml`:

| Service | Container | Ports | Role |
|---------|-----------|-------|------|
| **app** | `complianceos-app-1` | `3005:3001` | Express GRC server (`npx tsx server_entry.ts`) |
| **db** | `complianceos-db-1` | `5432` | PostgreSQL (pgvector/pg15) |
| **hermes-agent** | `complianceos-hermes-agent-1` | `9090:9090`, `9118:9118` | Hermes sidecar (bridge + dashboard) |
| **cisovault** | `complianceos-cisovault-1` | `3099:3099` | FastAPI security scanner (Nuclei/Nmap/Trivy) |
| **cisovault-sync** | `complianceos-cisovault-sync-1` | none | Bidirectional sync bridge (every 60s) |

**Demo walkthrough**: See `references/demo-walkthrough.md` for a 3-step client demo.

**Frontend Agent UI**: See `references/conversation-persistence.md` for the auto-save sidebar, pin/unpin, and session restore patterns.

**App startup**: `command: npx tsx server_entry.ts`

DO NOT include `drizzle-kit push:pg` in the command — it causes esbuild pipe errors on Node.js 20 and keeps the container in a crash loop. If the migration hasn't run, do it manually once:
```bash
docker compose exec app npx drizzle-kit push:pg
```

- **Agent-chat proxy**: The `/api/agent-chat` route must be registered BEFORE `app.use(authMiddleware)` in `server_entry.ts`, otherwise unauthenticated requests return 401.
- **Chat session persistence**: Conversations are stored in the `chat_sessions` DB table. See `references/chat-sessions-api.md` for endpoints and schema.
- **SPA routing**: See `references/spa-routing-fix.md` for fixing full-page reloads in Express + wouter apps.

## Seeding Data Without API Endpoints

Some tables (like `client_controls`) have no POST/PATCH API endpoint. To seed them, use a Node.js script that connects directly to PostgreSQL via the `pg` module from inside the app container:

### Pattern: Write script → docker cp → docker exec with NODE_PATH

```js
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Query controls
  const controls = await pool.query(
    "SELECT id, control_id FROM controls WHERE framework = 'NIS2' ORDER BY control_id"
  );

  // Insert client_controls for each
  for (const c of controls.rows) {
    await pool.query(
      `INSERT INTO client_controls (client_id, control_id, status, owner)
       VALUES ($1, $2, 'not_implemented', 'System') RETURNING id`,
      [1, c.id]
    );
  }

  // Then POST evidence via API (which DOES have an endpoint)
  const clientControlId = /* get from above */;
  await fetch("http://app:3001/api/v1/evidence", {
    method: "POST",
    headers: { "X-API-Key": "test-api-key-for-local-dev", "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: 1,
      clientControlId,
      evidenceId: "CISOV-001",
      description: "CISOvault finding",
      status: "collected"
    })
  });
}

main().catch(e => { console.error(e.message); process.exit(1); });
```

**Deploy and run:**
```bash
# Write script to host, copy into container, run with NODE_PATH
docker cp seed-script.js complianceos-app-1:/tmp/
NODE_PATH=/app/node_modules docker exec -w /app complianceos-app-1 node /tmp/seed-script.js
```

**Why this works:** The `pg` module is installed at `/app/node_modules/pg` inside the container. Setting `NODE_PATH=/app/node_modules` lets the script `require("pg")` without being in the package directory. `-w /app` makes `process.env.DATABASE_URL` available if loaded from .env in the app's startup.

### When to use this vs API

| Use case | Tool |
|----------|------|
| Creating client_control records | Direct DB insert (no API endpoint exists) |
| Creating evidence | POST /api/v1/evidence (API endpoint exists) |
| Creating risks | POST /api/v1/risks (API endpoint exists) |
| Updating risk status/owner | PATCH /api/v1/risks/:id (after adding route) |
| Bulk operations | Direct DB insert for speed, then API for verification |

### Reference seed scripts

- **NIS2 evidence seed**: `C:\Users\emman\complianceos\seed-nis2-evidence.js` (creates client_controls + evidence for all 10 NIS2 controls)
- **Server entry patch redirects**: `C:\Users\emman\complianceos\add-redirect.js` (adds /agent → Hermes Dashboard redirect to server_entry.ts)

## Adding Entity API Endpoints

When `api-v1.ts` is missing routes (new entities OR existing-entity write endpoints):

### New entity routes (GET/POST for a whole new table)

1. Write a Node.js script that reads api-v1.ts, adds table imports from `../../schema` (NOT from `../../db`), appends route handlers with `const db = await getDb()`, and writes back.
2. `docker cp script.js container:/tmp/ && docker exec container node /tmp/script.js`
3. Kill tsx to restart: `docker exec container sh -c "kill $(pgrep -f tsx)"`

**Import reference**: `clients`, `assets`, `vendors`, `clientPolicies` are all exported from `../../schema`. Each route handler must call `const db = await getDb()` before using `db.select()`.

### Missing PATCH on an existing entity (e.g. risks)

POST endpoints ship pre-built. PATCH/PUT on existing entities do NOT — they must be added. The source file is:

```
/app/packages/core/src/server/routers/api-v1.ts
```

Pattern for adding a PATCH route:

1. Identify the insertion point — the existing GET /risks/:id block, which ends just before `// ── POST /api/v1/treatments`.
2. Write a Node.js script that replaces the POST /treatments marker with the new PATCH route + the marker (so you insert between them).
3. The script template:

```js
const fs = require('fs');
const path = '/app/packages/core/src/server/routers/api-v1.ts';
let src = fs.readFileSync(path, 'utf8');

const patchRoute = `
// ── PATCH /api/v1/risks/:id
apiV1Router.patch('/risks/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid risk id', code: 'BAD_REQUEST' });
    }
    const { status, owner, likelihood, impact, inherentScore, residualLikelihood, residualImpact, residualScore, inherentRisk, residualRisk } = req.body;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (owner !== undefined) updates.owner = owner;
    if (likelihood !== undefined) updates.likelihood = likelihood;
    if (impact !== undefined) updates.impact = impact;
    if (inherentScore !== undefined) updates.inherentScore = inherentScore;
    // ... add other fields as needed
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update', code: 'BAD_REQUEST' });
    }
    const [updated] = await db.update(riskScenarios).set(updates).where(eq(riskScenarios.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Risk not found', code: 'NOT_FOUND' });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});
`;

src = src.replace('// ── POST /api/v1/treatments', patchRoute);
fs.writeFileSync(path, src);
```

4. Apply: `docker exec -i complianceos-app-1 sh -c "cat > /tmp/add-patch.js" < script.js && docker exec complianceos-app-1 node /tmp/add-patch.js`
5. Restart tsx: `docker exec complianceos-app-1 sh -c "kill \$(pgrep -f tsx)"`
6. Wait for app to restart (poll `/health` until HTTP 200).
7. Verify: `curl -s -X PATCH "http://localhost:3005/api/v1/risks/{id}" -H "Content-Type: application/json" -d '{"status":"analyzed","likelihood":4,"impact":4}'` — should return the updated row.

**Route file location**: `/app/packages/core/src/server/routers/api-v1.ts`. Registered in `server_entry.ts` at line 231: `app.use('/api/v1', apiV1Router)`.

## Server Troubleshooting: Crash Loops

If the app container restarts repeatedly:

1. Check the actual error: `docker logs app | grep -i error`
2. Common causes and fixes:
   - **drizzle-kit in command** → remove it, run manually once
   - **Duplicate export in api-v1.ts** → remove duplicate `export { apiV1Router };`
   - **Missing imports** (`clients is not defined`) → add `clients, assets, vendors, clientPolicies` to the schema import block in api-v1.ts
   - **Unterminated string literals** from inline Node.js scripts → use a file-based script instead of `-e`
3. Fix without full rebuild: `docker cp` the fix script, `docker exec` to run it, then `kill $(pgrep -f tsx)` to restart.
4. If container won't stay up: `docker compose stop app`, fix in a temp container, then `docker compose up -d --force-recreate app`.

## Windows Docker Desktop Issues

**Volume mounts with spaces** — Paths like `D:\OneDrive - Intellfence\...` are translated to `/run/desktop/mnt/host/d/OneDrive - Intellfence/...` on Docker Desktop, and Docker can't create the mount source. Do NOT use volume mounts for file patches. Instead:
```
docker cp fix.js container:/tmp/fix.js
docker exec container node /tmp/fix.js
```

**Empty reply from server** — Port-forwarded containers may return empty HTTP responses from the host. Use Docker service names for inter-container communication instead of host ports.

## Database Troubleshooting

When GRCompliance returns database errors after the DB container is recreated or restarted, see `references/db-recovery.md` for exact error messages and step-by-step fixes. Quick checklist:

1. **Network mismatch** — verify both containers share a Docker network
2. **Missing PostgreSQL user** — create the app role if the DB was recreated
3. **Table-level permissions** — grant ALL on public schema to the app role
4. **Password masking** — Docker env output may mask DATABASE_URL password

## Memory & Context Hygiene ⚠️

Memory bloat is the #1 cause of the agent regurgitating stale trivia instead of answering questions. Symptoms: answers that quote bridge config, Docker image SHAs, skill version history, or old task logs instead of reading fresh data from the API.

### What goes in memory (and what does NOT)

| Goes in memory ❌ | Belongs in skill/reference ✅ |
|---|---|
| Bridge config, `__pycache__` patterns, content_hash algorithm | `references/bridge-stability-detection.md` |
| Docker image SHAs, tmux CLI flags, container compose details | Skill references or docker-compose.yml |
| Skill version changelogs (v1.2.0 upgrade notes) | Skill SKILL.md version history |
| Bridge timeout values (240s, 480 ticks) | `references/hermes-bridge-architecture.md` |
| Test pass/fail logs or deployment timestamps | `/dev/null` (transient, never save) |

**Only** these belong in memory:
- User preferences (style, tone, format corrections)
- Stable environment facts (API base URL, auth method, custom port)
- Correction lessons repeated by the user more than once

### User behavioral rules (this specific user)

- **Execute, don't explain**: When the user says "make it work", "get on with it", "do what is required", or "implement the plan", stop all analysis, stop listing alternatives, stop explaining why previous approaches failed. Execute the requested action immediately with whatever tool is available.
- **No partial solutions**: Never propose a solution with known breakage (iframe CORS, proxy WebSocket limits, auth bugs). The user rejects anything that requires "we can fix this later" or "except for X which is broken".
- **Frustration = fix now**: "this doesn't work", "not of the above is working", "forget about my demo", "you are wrong", "the damm thing don't work" — these mean stop talking, fix it. Do not ask "what do you see?" Do not suggest they refresh. Do not re-explain alternatives. Do not recap what was tried.
- **No narrative, no alternatives, no recap**: When the user asks for a specific fix, just execute it. Don't explain why other approaches failed. Don't recap the session history. Don't propose alternatives. Do it.
- **Demo constraint**: Single `docker compose up -d`, single URL, zero auth, zero extra tools. Any solution requiring `pip install`, `hermes desktop`, `start.bat`, `socat`, `nohup`, or host-side setup is not acceptable for client demos.
- **GRC output format**: Bold numbers, bullet lists, `##` section headers, no pipe tables for <6 rows, no JSON, no code blocks. End with a specific action offer.
- **Skip verification loops**: The user doesn't need you to verify what they already told you is broken. Trust their report and fix it.
- **Verify ownership before mapping**: Never assume a CISOvault finding belongs to a default client. Always check `client_domain_mappings` first. Blind default-client routing erodes trust — the user will (and should) question it.
- **Port claims need dual verification**: When reporting a port as unreachable, verify from INSIDE the container before concluding it's a mapping gap. The same dashboard may be accessible on a different port (9118 vs 9119). Run `docker exec <container> curl -s http://127.0.0.1:<port>` and `docker compose port <service> <port>`.
- **Evidence-backed claims**: When reporting a suspected gap (dead port, missing controls, failed sync), always include the exact command and its raw output that proves the claim in the same message. If the user responds "i don't understand" or questions a finding, re-run the probe with verbose output — do not defend the original conclusion. A gap asserted without tool output visible in the turn is not a valid claim.

### Prevention rules

1. **Memory is NOT a task log.** Never save "fixed bug X", "submitted PR Y", "upgraded skill to v1.2". These are transient.
2. **If a fact belongs in a skill or reference, don't duplicate it in memory.** The skill loads when needed; memory loads every turn.
3. **When memory is near full (~90%+ of char_limit), the model is more likely to echo memory than to produce fresh reasoning.** Keep memory ≤50% by consolidating stale entries.
4. **SOUL.md drives identity and tone — memory should not override it.** If memory says one thing and SOUL.md says another, the model sees conflict and may produce wrong answers.
5. **After cleaning memory, test with a fresh query** (`/new` or new session). If the answer still quotes old operational notes, memory cleanup didn't flush — clear with `memory(action='remove', target='memory')` then `/reset`.

### Quick fix when agent is echoing memory

```bash
# 1. List current memory
(hermes memory list or check ~/AppData/Local/hermes/profiles/<profile>/memories/MEMORY.md)

# 2. Remove any entry with bridge/Docker/skill-version task notes
# 3. Keep only: user preferences + stable environment facts
# 4. Start a new session (/new) — don't reuse the bloated one
```

## ⚡ Client Demo Path (safest)

**For demos, use the web chat widget ONLY.** Skip the dashboard.

```bash
docker compose up -d
# Open http://<host>:3005 → click Agent in sidebar
# Chat works immediately — no login, no auth, no extra port needed
```

The web chat widget calls the same Hermes backend and produces identical answers. Add the dashboard (port 9118) later for power users.

## 🚫 Auth pitfalls

| Issue | Symptom | Cause | Fix |
|-------|---------|-------|-----|
| Root `/` returns 500 | Browser shows error | Root redirects to OAuth start_login(). Use /login instead | Always redirect to `/auth/password-login` or `/login` |
| `--insecure` no-op | Still refuses 0.0.0.0 | June 2026 hardening removed bypass. Must configure dashboard.basic_auth | Configure auth or use socat loopback approach |
| `network_mode: host` broken | Ports unreachable from host | Docker Desktop Windows maps to VM, not host | Use standard port mapping + socat see `skill_view(name="hermes-docker-sidecar", file_path="references/socat-forwarder.md")` |
| Password hash mismatch | Login accepted but session invalid | Hash must be generated INSIDE same container | `docker run --rm <image> python3 -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('grc-agent'))"` |
| `POST /auth/password-login` 422 | Login fails | Missing `provider` field in POST body | Body must include: `{"provider":"basic","username":"admin","password":"grc-agent","next":"/"}` |
| Chat input disabled | Dashboard loads but can't type | `__HERMES_SESSION_TOKEN__` not injected in gated mode (0.0.0.0 bind) | Use socat loopback approach — see `references/socat-forwarder.md` in hermes-docker-sidecar |

**Generate fresh hash:**
```bash
docker run --rm complianceos-hermes-agent:latest python3 -c \
  "from plugins.dashboard_auth.basic import hash_password; print(hash_password('grc-agent'))"
```

## Hermes Dashboard Embed (Full Agent UI)

The Hermes Web UI dashboard runs **inside the Docker stack** — no host-side Hermes install needed. It auto-starts with `docker compose up -d`.

> **⚠️ Port clarification**: The dashboard process runs on port **9119** inside the container. Port **9118** is the host-mapped alias that serves the **same dashboard content** — verify both before flagging either as a gap. Always use port `9118` from the host/browser; port `9119` is container-internal only.

### Architecture

```
docker compose up -d
       ↓
┌─────────────────────────────────────────┐
│ complianceos-hermes-agent-1             │
│  ├── bridge.py (port 9090)             │
│  ├── tmux → Hermes CLI (chat widget)   │
│  └── hermes dashboard (port 9119)      │ ← Dashboard runs on 9119 internally
│       └── Full Web UI (Electron-free)  │
└─────────────────────────────────────────┘
       ↓ port 9118 mapped to host (forwards to container 9119)
┌─────────────────────────────────────────┐
│ Browser at http://127.0.0.1:9118       │
│  - Same sidebar, sessions, model picker │
│  - Terminal, file browser, streaming    │
│  - Auth: basic (admin / grc-agent)     │
└─────────────────────────────────────────┘
```

### Access patterns

| URL | What | When to use |
|-----|------|-------------|
| `http://localhost:3005/agent-full` | Landing page → opens dashboard | From ComplianceOS sidebar |
| `http://127.0.0.1:9118` | Full Hermes Web UI (login: admin / grc-agent) | Direct access, bookmark |
| `http://localhost:3005/agent` | Simple chat widget (sidecar bridge) | Quick questions, no sidebar |

### ⚠️ Cannot embed in iframe or reverse-proxy

| Approach | Fails because |
|----------|--------------|
| **iframe** | Dashboard JS accesses `parent.location` — cross-origin SecurityError |
| **HTTP reverse proxy** | Dashboard uses WebSockets — Express can't proxy `ws://` without `ws` package |
| **`network_mode: host`** | Docker Desktop Windows maps to VM network, not host — ports unreachable |

**Only reliable approach**: Serve a 302 redirect from the ComplianceOS Express server to `http://127.0.0.1:9118/login`.

### 🧠 Integration principle: use the native Hermes UI, don't build custom wrappers

When users need to interact with the Hermes Agent, **always use the real Hermes dashboard** (`localhost:9118`), not custom chat widgets, iframes, proxies, or embedded redirects. Every wrapper layer adds:
- Latency (extra proxy hops)
- Breakage (WebSocket, auth, CORS, iframe restrictions)
- Maintenance burden (custom code that needs updating when Hermes changes)

The only exception is the ComplianceOS web chat widget at `/agent` for quick inline questions — it calls the same backend and produces identical answers. For full functionality (session management, model picker, file browser, terminal), redirect users to the native dashboard.

### Redirecting the sidebar Agent link

The ComplianceOS sidebar has an "Agent" menu item pointing to `/agent`. The Express server must intercept this route BEFORE the SPA catch-all and redirect to the Hermes dashboard. Patch `server_entry.ts`:

```js
// Insert BEFORE the catch-all app.get('*') route
app.get(["/agent-full", "/agent", "/agent-old"], (_req, res) => {
  res.redirect("http://127.0.0.1:9118/auth/password-login?username=admin&password=grc-agent");
});
app.get("/agent/*", (_req, res) => {
  res.redirect("http://127.0.0.1:9118/auth/password-login?username=admin&password=grc-agent");
});
```

⚠️ These changes are LOST on container restart (server_entry.ts is baked into the image). To persist, either:
- Mount a startup script as `command:` in docker-compose.yml
- Rebuild the Docker image with the patch baked in
- Or accept that the redirect is a live-edited convenience (suitable for demos)

### Auth login caveat

See `references/hermes-dashboard-login.md` for the login flow, POST body format, and session cookie handling.

The Hermes dashboard root URL `http://127.0.0.1:9118/` redirects to `/auth/login?provider=basic` which throws HTTP 500 (`NotImplementedError: OAuth redirect flow`). **Always use the password-login URL directly:**

```
http://127.0.0.1:9118/auth/password-login?username=admin&password=grc-agent
```

This URL returns the dashboard SPA with `__HERMES_AUTH_REQUIRED__=true`. The JS bundle renders a login form. User enters credentials and gets the full UI.

Test the auth assets to confirm the login page loads:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:9118/assets/index-WrAtZQWO.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:9118/assets/index-OT1jQL5E.css
```
Both should return 200.

### Deployment configuration

Files modified to containerize the dashboard:

| File | Change |
|------|--------|
| `docker/hermes-agent/Dockerfile` | Added `EXPOSE 9119` |
| `docker/hermes-agent/start-gateway.sh` | Added `nohup hermes dashboard --port 9119 --no-open --host 0.0.0.0` before bridge |
| `docker-compose.yml` | Added `9118:9118` port mapping to hermes-agent service (dashboard runs on 9119 internally) |

### Auth configuration

The dashboard refuses to bind to `0.0.0.0` unless auth is configured. Set in the hermes-agent container:

```bash
hermes config set dashboard.basic_auth.username admin
hermes config set dashboard.basic_auth.password <password>
```

Then restart the dashboard process inside the container:
```bash
docker exec complianceos-hermes-agent-1 sh -c "kill 12 2>/dev/null; nohup hermes dashboard --port 9119 --no-open --host 0.0.0.0 >> /app/dashboard.log 2>&1 &"
```

### Rebuilding after changes

```bash
docker compose build hermes-agent
docker compose up -d --no-deps hermes-agent
```

### Architecture: Desktop vs Sidecar Memory

Two separate Hermes instances may be running. They have DIFFERENT memory configurations:

| Instance | Memory files | Susceptible to bloat? |
|----------|-------------|----------------------|
| **Desktop app** (this chat) | `MEMORY.md` + `USER.md` in profile dir | ✅ Yes — must trim operational notes |
| **Docker sidecar** (web widget) | `/app/memories/` is often **empty** | ❌ No — but has no user preferences |

When the user reports "agent answers from memory":
1. Check WHICH agent is misbehaving (desktop or web widget)
2. For desktop: check and trim `~/AppData/Local/hermes/profiles/grcompliance/memories/MEMORY.md`
3. For sidecar: `docker exec complianceos-hermes-agent-1 sh -c "ls -la /app/memories/"` — if empty, memory is NOT the cause

## Bridge Performance

See `references/bridge-stability-detection.md` and `references/hermes-bridge-architecture.md` for full details on stability detection, fast path, post-processing formatter, expected latency, and deployment.

**TL;DR**: ~5s for greetings, ~8-15s for single API queries, ~30-90s for full compliance summaries. Post-processing (bold numbers, section headers, closing offer) is applied by bridge.py, NOT the LLM — DeepSeek ignores SOUL.md formatting rules.

## CISOvault Query Examples

When the user asks about CISOvault findings, security scan results, or pentest data, query BOTH systems:

### Quick Queries

| User asks | What to do |
|-----------|-----------|
| "How many CISOvault risks?" | `GET /summary` from GRC, count risks with `[CISOVault]` in title |
| "Show critical findings" | `GET /risks` from GRC (bare path — query params cause 404), filter by title prefix and HIGH/CRITICAL severity |
| "Latest scans from CISOvault" | `GET /api/scans` from CISOvault (`http://localhost:3099` or `http://cisovault:3099`) |
| "Sync findings now" | Run the sync script (see below) |
| "Are scan findings in GRC?" | Query GRC for `[CISOVault]` prefixed risks, count by age |
| "How many open incidents?" | `GET /api/incidents?state=open` from CISOvault |
| "Map CISOvault findings to NIS2 controls" | See `references/cisovault-nis2-evidence-mapping.md` for the mapping table and POST/evidence workflow |
| "What's the evidence gap?" | `GET /gaps?framework=NIS2` — then map each gap's control to a CISOvault finding category using the reference doc. **First check domain→client ownership** |
| "Show me unassigned domains" | `GET /api/v1/domain-mappings?status=pending` — domains that scanned but have no verified client |
| "Assign verifyfix.com to Client 2" | Find the mapping ID, then `PATCH /api/v1/domain-mappings/{id}` with `{"clientId": 2, "status": "verified"}` |
| "Why is pass rate 0%?" | Check `GET /report?framework=NIS2` — if `evidence.total=0`, no evidence is mapped. Verify domain ownership first, then create evidence linked to client_controls |

### Evidence Creation (CISOvault → NIS2)

The core gap exposed in this integration: CISOvault produces **375+ incidents** but **0 evidence records** are mapped to NIS2 controls. The sync bridge creates risks (incidents → risk scenarios) but does NOT create evidence (findings → control proof).

To close the loop:
1. Reference `cisovault-nis2-evidence-mapping.md` for which finding categories map to which controls
2. Get the `clientControlId` from `GET /gaps?framework=NIS2` for the target control
3. `POST /evidence` with `clientControlId`, `description`, `status: "collected"`
4. Re-check `GET /report?framework=NIS2` — pass rate should increase

### Sync Script

The bidirectional sync bridge is at:
- **Skill reference**: `scripts/sync-cisovault-grc.py` (view with `skill_view(name="grcompliance", file_path="scripts/sync-cisovault-grc.py")`)
- **Host**: `C:\Users\emman\complianceos\sync-cisovault-grc.py`
- **Docker**: Runs every 60s inside `complianceos-cisovault-sync-1`
- **Cron job**: Runs every 5 min via `cisovault-sync-trigger` cron

To trigger manually: `python3 /c/Users/emman/complianceos/sync-cisovault-grc.py`

### CISOvault API Quick Reference

```
GET  http://localhost:3099/health                  → Health check
GET  http://localhost:3099/api/incidents            → All incidents (filter: ?state=open, ?severity=high)
GET  http://localhost:3099/api/incidents/{id}       → Single incident
PATCH http://localhost:3099/api/incidents/{id}      → Update state (remediated)
GET  http://localhost:3099/api/scans                → All scans
GET  http://localhost:3099/api/scans/{id}/report    → HTML scan report
POST http://localhost:3099/api/scan/domain-recon    → Launch domain recon scan
GET  http://localhost:3099/api/engagements          → Pentest engagements
```

## ⚠️ Critical: Verify Domain Ownership Before Evidence Mapping

**Never map CISOvault findings as evidence without first verifying which client owns the scanned domain.** Blindly routing to `clientId=1` (the default/clientId in the config) produces data that is factually wrong and erodes trust in the integration.

### Correct Workflow

```
CISOvault scan → extract domain → check client_domain_mappings table
  → If status=verified → clientId is known → route findings to that client
  → If status=pending   → log as unassigned → report to user → WAIT for assignment
```

### How to Check

```bash
# Get verified mappings
curl -s -H "X-API-Key: $GRC_API_KEY" "$GRC_API_URL/domain-mappings?status=verified"

# Get pending (unassigned)
curl -s -H "X-API-Key: $GRC_API_KEY" "$GRC_API_URL/domain-mappings?status=pending"
```

### How to Assign

The sync bridge auto-creates pending mappings for new domains. To assign one to a client:

```bash
# Find mapping ID
curl -s -H "X-API-Key: $GRC_API_KEY" "$GRC_API_URL/domain-mappings?domain=example.com"

# Assign to client and verify
PATCH /api/v1/domain-mappings/{id}
Body: {"clientId": <id>, "status": "verified"}
```

### Common Mistakes (Do Not Repeat)

| Mistake | Why it's wrong |
|---------|---------------|
| Mapping evidence to default clientId because it exists | Default client is often a generic workspace with no domain ownership proof |
| Creating evidence before checking domain→client | The evidence links to wrong client_controls, producing inaccurate pass rates |
| Assuming "domain scanned" = "client owns domain" | CISOvault scans demo/test targets that may not belong to any paying client |

## Domain Holding Pool (Unassigned Findings)

Domains that CISOvault has scanned but have no verified client mapping sit in a **holding pool** (`client_domain_mappings` table, `status='pending'`). The sync bridge:

1. **Auto-creates** a pending mapping when it encounters a new domain
2. **Skips** creating risks/evidence for pending domains
3. **Reports** unassigned domains in every sync cycle
4. **Hermes Agent** can surface them: "Show me unassigned domains"

### API Endpoints

```
GET   /api/v1/domain-mappings              → All mappings
GET   /api/v1/domain-mappings?status=pending → Unassigned only
GET   /api/v1/domain-mappings?status=verified → Assigned only
GET   /api/v1/domain-mappings?domain=X     → Specific domain
POST  /api/v1/domain-mappings              → Create: {domain, clientId?, createdBy?}
PATCH /api/v1/domain-mappings/:id          → Update: {clientId?, status?}
```

### Table Schema

```
client_domain_mappings
  id           SERIAL PRIMARY KEY
  domain       VARCHAR(255) UNIQUE NOT NULL   — e.g. "intellfence.com"
  client_id    INTEGER NOT NULL                — GRC client ID (0 = unassigned)
  status       VARCHAR(20) DEFAULT 'pending'   — pending | verified
  created_by   VARCHAR(100) DEFAULT 'System'
  verified_at  TIMESTAMP                        — set when status→verified
  created_at   TIMESTAMP DEFAULT NOW()
```

### Holding Pool Lifecycle

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
Next sync → findings go to the assigned client
```

## CISOvault Integration

**CISOvault** (`cisovault:latest` image, port 3099) is a FastAPI-based security scanning platform with Nuclei, Nmap, and Trivy built in. It runs scans (domain recon, web app, port scans), generates findings as **incidents** (severity: critical/high/medium/low) and stores scan reports. Its findings feed into GRCompliance as risks.

### CISOvault API (key endpoints)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/incidents?state=open` | Open findings, filterable by state/severity |
| `GET /api/scans` | All scans with reports and diffs |
| `GET /api/incidents?state=remediated` | Remediated findings |
| `POST /api/incidents` | Create a new incident |
| `PATCH /api/incidents/{id}` | Update incident state (→ remediated) |
| `GET /health` | Health check |

Full reference: `references/cisovault-api.md`

### Docker compose integration

Add to `docker-compose.yml` alongside app/db/hermes-agent:

```yaml
cisovault:
  image: cisovault:latest
  container_name: complianceos-cisovault-1
  ports: ["3099:3099"]
  networks: [complianceos-network]
  restart: unless-stopped

cisovault-sync:
  build: ./docker/sync
  environment:
    - CISOVAULT_URL=http://cisovault:3099
    - GRC_API_URL=http://app:3001/api/v1
    - GRC_API_KEY=test-api-key-for-local-dev
    - GRC_DEFAULT_CLIENT_ID=1
  depends_on: [cisovault, app]
  networks: [complianceos-network]
  restart: unless-stopped
```

### Sync bridge (bidirectional)

The sync bridge script lives at `scripts/sync-cisovault-grc.py` in this skill directory. See `references/cisovault-sync-bridge.md` for the full architecture reference.

The sync runs 4 operations:

1. **CISOvault incidents → GRCompliance risks**: Fetches open HIGH/CRITICAL incidents, deduplicates by title against existing GRC risks (matching `[CISOVault]` prefix), POSTs new risks, then PATCHes status to `identified`.
2. **CISOvault scan findings → GRCompliance risks**: Completed scans with CRITICAL findings become GRC risks.
3. **CISOvault remediated → GRC status update**: When CISOvault incident becomes `remediated`, the matching GRC risk updates to `monitored`.
4. **GRC mitigated → CISOvault remediation**: When a GRC risk reaches `monitored`/`mitigated`, the matching CISOvault incident updates to `remediated`.

### POST /risks field limitations

The GRCompliance POST `/risks` endpoint accepts ONLY these fields:
```
clientId, title, description, category, assessmentType, assetId
```
`likelihood`, `impact`, `status`, `owner` are NOT accepted on POST — they default to `1`, `1`, `identified`, `null` respectively. To set them, use a separate PATCH call after creation.

The PATCH `/risks/{id}` endpoint currently accepts only `status` and `owner`. If `likelihood`/`impact` patches are needed, the route handler in `api-v1.ts` must be extended.

### Inline run (outside Docker)

```bash
python3 sync-cisovault-grc.py
# Uses env vars: CISOVAULT_URL, GRC_API_URL, GRC_API_KEY, GRC_DEFAULT_CLIENT_ID
```

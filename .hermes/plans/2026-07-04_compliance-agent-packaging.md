# Compliance Agent — Hermes + GRCompliance Implementation Plan

> **For Hermes:** Use subagent-driven-development to implement this plan phase-by-phase. Each phase ships independently.

**Goal:** Package Hermes Agent as a Docker sidecar for GRCompliance, creating an agentic CISO compliance platform that auto-collects evidence, answers natural-language queries, and alerts via Telegram/Slack.

**Architecture:** Hermes runs as a companion container in the same Docker Compose stack as GRCompliance. They communicate over the internal Docker network via the GRCompliance REST API at `http://complianceos:3002/api/`. Hermes ships pre-loaded with a `compliance-agent` profile containing API client skills, cron jobs, and CISO voice identity.

**Tech Stack:** Hermes Agent runtime (Python, Docker image), Node.js + Express + Drizzle (GRCompliance), Docker Compose, GitHub Actions (GHCR publish)

**Total estimated effort:** ~40-50 hours across 6 phases

---

## Phase 0: Foundation — Unblock GRCompliance Self-Host (4-6 hours)

**Goal:** Get GRCompliance booting from Docker without requiring proprietary credentials (Supabase).

### Task 0.1: Audit the current auth system

**Objective:** Understand what blocks a zero-config first run

**Files:**
- Inspect: `server_entry.ts:229-260` (auth routes)
- Inspect: `packages/core/src/authMiddleware.ts`
- Inspect: `packages/core/src/lib/auth/local-auth.ts`
- Inspect: `.env.example`
- Inspect: `Dockerfile.selfhost`

**Steps:**
1. Read `server_entry.ts` health check route (lines 69-80) and auth routes (lines 237-260)
2. Read `authMiddleware.ts` — understand what it requires from Supabase
3. Read `local-auth.ts` — understand if local auth is functional or a stub
4. Read `.env.example` — list required vars
5. Report: what's the minimum `.env` to boot without Supabase

**Verification:**
```bash
docker compose -f docker-compose.selfhost.yml up -d
curl http://localhost:3002/health
```
Expected: `{"status":"ok","database":"connected"}`

---

### Task 0.2: Build a local auth-only boot mode

**Objective:** Allow GRCompliance to start with local user/password auth, no Supabase dependency

**Files:**
- Modify: `server_entry.ts`
- Modify: `packages/core/src/authMiddleware.ts`
- Modify: `packages/core/src/lib/auth/local-auth.ts`
- Modify: `.env.example`
- Modify: `docker-compose.selfhost.yml` (add `AUTH_MODE=local` env var)

**Steps:**
1. Add an `AUTH_MODE` env var (values: `supabase`, `local`, default: `local`)
2. In `authMiddleware.ts`, when `AUTH_MODE=local`, skip Supabase token validation and use bcrypt/JWT from `local-auth.ts`
3. In `server_entry.ts`, when `AUTH_MODE=local`, seed a default admin user on first boot (email: `admin@complianceos.local`, password from `ADMIN_PASSWORD` env var or auto-generated and logged to stdout)
4. The local auth routes (`/api/auth/local-login`, `/api/auth/local-register`) become the primary auth path
5. Update `.env.example` with `AUTH_MODE=local` entries

**Verification:**
```bash
docker compose down -v && docker compose -f docker-compose.selfhost.yml up -d
curl -X POST http://localhost:3002/api/auth/local-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@complianceos.local","password":"..."}'
```
Expected: JWT token returned

---

### Task 0.3: Build REST API endpoints for evidence integration

**Objective:** Create the API surface that Hermes will call to read/write evidence, risks, controls, and gaps

**Files:**
- Create: `packages/core/src/server/routers/api-v1.ts`
- Modify: `server_entry.ts` (mount the new router at `/api/v1`)
- Create: `packages/core/src/lib/api/schemas.ts` (request/response types)
- Create: `tests/api/test-evidence.ts`
- Create: `tests/api/test-gaps.ts`

**Endpoints to build:**

```
GET  /api/v1/health                    → system status
GET  /api/v1/controls                  → list all controls (filter: ?framework=nis2&status=pass)
GET  /api/v1/controls/:id              → single control with evidence
GET  /api/v1/evidence                  → list evidence (filter: ?control_id=X&expiring_within=7d)
POST /api/v1/evidence                  → create evidence item
GET  /api/v1/risks                     → list risks
POST /api/v1/risks                     → create risk from finding
GET  /api/v1/frameworks                → available frameworks (NIS2, DORA, ISO 27001, etc.)
GET  /api/v1/gaps?framework=nis2      → controls without evidence → "compliance gaps"
GET  /api/v1/report?framework=nis2    → readiness report (structured JSON)
```

**All endpoints require:**
- API key auth (header `X-API-Key`)
- Rate limiting
- JSON responses
- Error handling with standard format: `{"error":"message","code":"ERROR_CODE"}`

**Steps:**
1. Create schema types for evidence, risk, control, framework, gap, report
2. Build each endpoint as an Express router
3. Add API key validation middleware (reads from `COMPLIANCE_API_KEY` env var)
4. Wire into `server_entry.ts` at `/api/v1`
5. Test each endpoint with curl

**Verification:**
```bash
# List controls
curl -H "X-API-Key: test-key" http://localhost:3002/api/v1/controls | jq .
# Create evidence
curl -X POST -H "X-API-Key: test-key" -H "Content-Type: application/json" \
  -d '{"control_id":"c-123","title":"GitHub branch protection","status":"pass","evidence_type":"automated","framework":"nis2"}' \
  http://localhost:3002/api/v1/evidence | jq .
# Get gaps
curl -H "X-API-Key: test-key" "http://localhost:3002/api/v1/gaps?framework=nis2" | jq .
```

---

## Phase 1: Compliance Agent Hermes Profile & Skill (6-8 hours)

**Goal:** A downloadable Hermes profile that turns any Hermes instance into a compliance agent for GRCompliance.

### Task 1.1: Create the compliance-agent Hermes profile

**Objective:** A Hermes profile with pre-configured identity, model, and toolset for compliance operations

**Files:**
- Create: `packages/compliance-agent/profile/config.yaml`
- Create: `packages/compliance-agent/profile/SOUL.md`
- Create: `packages/compliance-agent/profile/.env.example`

**config.yaml contents:**
```yaml
model:
  default: deepseek-v4-flash
  provider: deepseek
agent:
  max_turns: 60
  tool_use_enforcement: auto
  task_completion_guidance: true
toolsets:
  - hermes-cli
terminal:
  backend: local
memory:
  memory_enabled: true
  user_profile_enabled: true
```

**SOUL.md contents:** Use the existing GRCompliance voice (already written at `~/.hermes/profiles/grcompliance/SOUL.md`).

**.env.example:**
```
DEEPSEEK_API_KEY=
COMPLIANCE_API_URL=http://complianceos:3002/api/v1
COMPLIANCE_API_KEY=
TELEGRAM_BOT_TOKEN=       # optional
SLACK_BOT_TOKEN=          # optional
SLACK_SIGNING_SECRET=     # optional
CISOVAULT_API_URL=        # optional — for CISOvault bridge
CISOVAULT_API_KEY=        # optional
```

**Steps:**
1. Create directory structure
2. Write `config.yaml` with compliance-optimized defaults
3. Copy existing SOUL.md
4. Write `.env.example` with all integration points
5. Create a `README.md` for the profile

**Verification:**
```bash
# Load profile
hermes --profile compliance-agent --skills compliance-agent -q "Verify the agent persona loaded"
```
Expected: Response in GRCompliance CISO voice

---

### Task 1.2: Build the compliance-agent skill

**Objective:** A Hermes skill that teaches the agent the entire GRCompliance API surface, common CISO workflows, and scan orchestration

**Files:**
- Create: `packages/compliance-agent/skills/compliance-agent/SKILL.md`
- Create: `packages/compliance-agent/skills/compliance-agent/templates/daily-scan.md`
- Create: `packages/compliance-agent/skills/compliance-agent/templates/gap-report.md`
- Create: `packages/compliance-agent/skills/compliance-agent/templates/vendor-assessment.md`
- Create: `packages/compliance-agent/skills/compliance-agent/scripts/collect-evidence.sh`
- Create: `packages/compliance-agent/skills/compliance-agent/scripts/scan-github.sh`

**SKILL.md structure:**
```markdown
---
name: compliance-agent
description: "GRCompliance API client, CISO workflow automation, evidence collection, compliance gap analysis"
version: 1.0.0
---

# Compliance Agent — GRCompliance Integration Skill

## API Endpoints

The GRCompliance API lives at `$COMPLIANCE_API_URL`.

### Evidence Management
- `GET /evidence` — list evidence (?control_id=X, ?expiring_within=7d)
- `POST /evidence` — create evidence with control_id, title, status, evidence_data
- `DELETE /evidence/:id` — remove evidence

### Risk Management
- `GET /risks` — list risks (?status=open, ?severity=high)
- `POST /risks` — create risk from finding
- `PATCH /risks/:id` — update risk status

### Control & Framework Queries
- `GET /controls` — list controls (?framework=nis2, ?status=fail)
- `GET /controls/:id` — single control with linked evidence
- `GET /frameworks` — available regulatory frameworks
- `GET /gaps?framework=nis2` — compliance gaps (controls missing evidence)

### Reports
- `GET /report?framework=nis2` — structured readiness report

## Common Workflows

### 1. Daily Evidence Collection
Run the `collect-evidence.sh` script, then POST results to the evidence endpoint.
Template: `templates/daily-scan.md`

### 2. Gap Analysis
Query controls → filter by framework → check each for evidence → compile gaps.
Template: `templates/gap-report.md`

### 3. Risk Creation from Scanner Findings
When a scanner (CISOvault, GitHub) returns a finding:
→ CREATE risk in GRCompliance
→ LINK to relevant control(s)
→ ASSIGN owner
→ NOTIFY via gateway

### 4. Vendor Assessment
Query TPRM module → list vendors → check assessment expiry → flag overdue.
Template: `templates/vendor-assessment.md`

## Cron Job Templates

```yaml
# Daily evidence scan
schedule: "0 6 * * *"
prompt: "Run collect-evidence.sh, POST results to GRCompliance API, report status"
skills: ["compliance-agent"]

# Weekly gap report
schedule: "0 9 * * 1"
prompt: "Query all active frameworks, generate gap report, deliver to admin"
skills: ["compliance-agent"]
```

## Pitfalls
- Always pass `X-API-Key` header — the API rejects unauthenticated requests
- `POST /evidence` requires `control_id` — look it up from `GET /controls` first
- Cron jobs run with `skip_memory=true` — include all context inline
- Use delegation for parallel evidence collection across multiple repos/clouds
```

**Templates:**
- `templates/daily-scan.md` — Prompt template for daily evidence collection
- `templates/gap-report.md` — Prompt template for gap analysis output
- `templates/vendor-assessment.md` — Prompt template for vendor review

**Steps:**
1. Write `SKILL.md` with full API reference, workflows, cron templates, and pitfalls
2. Write each template as a standalone markdown prompt
3. Write `collect-evidence.sh` — shell script that runs scans and formats JSON for the API
4. Write `scan-github.sh` — invokes the GitHub connector or octokit, outputs findings
5. Test the skill locally: `hermes -s compliance-agent -q "Show me the evidence endpoint parameters"`

**Verification:**
```bash
hermes --profile compliance-agent -q "What's the compliance agent skill documentation say about API auth?"
```
Expected: Response describing X-API-Key auth for GRCompliance API

---

### Task 1.3: Create the compliance-agent Docker image

**Objective:** A Docker image containing Hermes with the compliance-agent profile pre-loaded

**Files:**
- Create: `Dockerfile.agent`
- Create: `packages/compliance-agent/docker-entrypoint.sh`
- Create: `.github/workflows/publish-agent.yml`

**Dockerfile.agent contents:**
```dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app

# Install Hermes
RUN pip install hermes-agent

# Copy profile
COPY packages/compliance-agent/profile /app/profile
COPY packages/compliance-agent/skills /app/skills

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git jq && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin/hermes /usr/local/bin/hermes
COPY --from=builder /app/profile /app/profile
COPY --from=builder /app/skills /app/skills

# Install hermes-agent skill
RUN hermes skills install hermes-agent

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV HERMES_PROFILE=/app/profile
ENV HERMES_HOME=/app/data
ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD hermes doctor --quiet || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
```

**docker-entrypoint.sh:**
```bash
#!/bin/bash
set -e

# Generate config from env vars
mkdir -p "$HERMES_HOME"

# Write config.yaml from template if not present
if [ ! -f "$HERMES_HOME/config.yaml" ]; then
  cp /app/profile/config.yaml "$HERMES_HOME/config.yaml"
fi

# Write .env from environment
env | grep -E '^(DEEPSEEK_|COMPLIANCE_|TELEGRAM_|SLACK_|CISOVAULT_)' > "$HERMES_HOME/.env"

# Start Hermes with compliance-agent skill
exec hermes --profile "$HERMES_PROFILE" --skills compliance-agent
```

**GitHub Actions (`publish-agent.yml`):**
- Trigger: push to main, tag v*
- Build: `docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.agent`
- Push: `ghcr.io/sectutor/complianceos-agent:latest`

**Steps:**
1. Write `Dockerfile.agent` with two-stage build
2. Write `docker-entrypoint.sh` with env var → config mapping
3. Write `publish-agent.yml` workflow
4. Test: `docker build -f Dockerfile.agent -t complianceos-agent:test .`
5. Verify: `docker run --rm complianceos-agent:test hermes doctor`

**Verification:**
```bash
docker run --rm -e DEEPSEEK_API_KEY=test complianceos-agent:test hermes doctor
```
Expected: "Hermes Agent is ready" (or similar health check pass)

---

## Phase 2: Docker Sidecar Packaging (4-6 hours)

**Goal:** A single `docker-compose.yml` that boots GRCompliance + Hermes Agent together.

### Task 2.1: Update docker-compose.selfhost.yml with agent service

**Objective:** Add the `hermes-agent` service to the existing compose file

**Files:**
- Modify: `docker-compose.selfhost.yml`

**Changes:**
```yaml
services:
  complianceos:
    # existing — unchanged, just add depends_on for redis
    networks:
      - complianceos-net

  hermes-agent:
    image: ghcr.io/sectutor/complianceos-agent:latest
    build:
      context: .
      dockerfile: Dockerfile.agent
    depends_on:
      complianceos:
        condition: service_healthy
    environment:
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
      - COMPLIANCE_API_URL=http://complianceos:3002/api/v1
      - COMPLIANCE_API_KEY=${COMPLIANCE_API_KEY:-}
      - COMPLIANCE_ADMIN_EMAIL=${COMPLIANCE_ADMIN_EMAIL:-admin@complianceos.local}
      - COMPLIANCE_ADMIN_PASSWORD=${COMPLIANCE_ADMIN_PASSWORD:-}
      - GATEWAY_ENABLED=${GATEWAY_ENABLED:-false}
      - CRON_ENABLED=${CRON_ENABLED:-true}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN:-}
      - SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET:-}
      - NO_TELEMETRY=true
    volumes:
      - complianceos_agent_data:/app/data
    restart: unless-stopped
    networks:
      - complianceos-net

  # existing db, redis — unchanged

networks:
  complianceos-net:
    driver: bridge

volumes:
  complianceos_db:
  complianceos_redis:
  complianceos_uploads:
  complianceos_agent_data:
```

**Steps:**
1. Add `hermes-agent` service block to compose file
2. Add `complianceos_agent_data` volume
3. Ensure all services share `complianceos-net`
4. Add `redis` dependency to `complianceos` (already has it)
5. Add env vars for all configuration knobs

**Verification:**
```bash
docker compose -f docker-compose.selfhost.yml config
```
Expected: Valid compose output with all 4 services

---

### Task 2.2: Update install.sh for agent sidecar

**Objective:** The one-command install now provisions both containers

**Files:**
- Modify: `deploy/docker/install.sh`

**Changes:**
1. Pull BOTH images: `ghcr.io/sectutor/complianceos-self-hosted:latest` AND `ghcr.io/sectutor/complianceos-agent:latest`
2. Generate a random `COMPLIANCE_API_KEY` if not provided
3. Generate a random `ADMIN_PASSWORD` if not provided, log it
4. New `.env` template with agent section
5. After boot, run agent health check

**Updated install output:**
```
╔══════════════════════════════════════════════╗
║  ✅ ComplianceOS + Compliance Agent          ║
║     Installation Complete                     ║
║                                               ║
║  Web App:  http://localhost:3002              ║
║  Agent:    Online                             ║
║  Admin:    admin@complianceos.local / <pw>   ║
║                                               ║
║  Try:    Open the app, then click the chat    ║
║  Logs:   docker compose logs -f hermes-agent  ║
╚══════════════════════════════════════════════╝
```

**Steps:**
1. Read current `install.sh`
2. Add agent image pull step after complianceos pull
3. Add API key generation (`openssl rand -hex 32`)
4. Update `.env` generation with agent section
5. Add agent health check after boot
6. Update banner output

**Verification:**
```bash
# Fresh install
rm -rf ~/test-complianceos && mkdir ~/test-complianceos && cd ~/test-complianceos
bash deploy/docker/install.sh
docker compose ps
```
Expected: Both `complianceos` and `hermes-agent` containers running

---

### Task 2.3: Test the full stack boots end-to-end

**Objective:** Verify the entire stack boots, health checks pass, and Hermes can call the GRCompliance API

**Files:**
- Create: `scripts/test/full-stack-test.sh`

**Test script:**
```bash
#!/bin/bash
set -euo pipefail

echo "=== Phase 2.3: Full Stack E2E Test ==="

# 1. Clean start
docker compose -f docker-compose.selfhost.yml down -v
docker compose -f docker-compose.selfhost.yml up -d

# 2. Wait for health
echo "Waiting for complianceos..."
for i in {1..30}; do
  if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
    echo "  ✅ complianceos healthy"
    break
  fi
  sleep 2
done

# 3. Wait for agent
echo "Waiting for hermes-agent..."
sleep 10  # agent starts slower
docker compose -f docker-compose.selfhost.yml logs hermes-agent --tail 5

# 4. Test API endpoint
echo "Testing API..."
curl -s -H "X-API-Key: $COMPLIANCE_API_KEY" http://localhost:3002/api/v1/health | grep -q "ok"
echo "  ✅ API accessible"

# 5. Test Hermes can call API
docker compose -f docker-compose.selfhost.yml exec hermes-agent \
  curl -sf -H "X-API-Key: $COMPLIANCE_API_KEY" http://complianceos:3002/api/v1/health
echo "  ✅ Hermes → ComplianceOS API reachable"

# 6. Cleanup
docker compose -f docker-compose.selfhost.yml down -v

echo "=== ALL TESTS PASSED ==="
```

**Steps:**
1. Write test script
2. Run it from scratch
3. Fix any issues (networking, env vars, startup order)
4. Commit

**Verification:** Script exits 0 with all checks passing.

---

## Phase 3: Web Chat Integration (6-8 hours)

**Goal:** An embedded chat bubble in the GRCompliance web app that connects to the Hermes agent.

### Task 3.1: Build the chat widget component

**Objective:** A persistent chat bubble in the bottom-right of the GRCompliance UI that talks to the Hermes agent via its REST API or WebSocket

**Files:**
- Create: `packages/core/src/components/ChatWidget.tsx`
- Create: `packages/core/src/components/ChatBubble.tsx`
- Create: `packages/core/src/components/ChatMessage.tsx`
- Create: `packages/core/src/hooks/useAgentChat.ts`
- Create: `packages/core/src/styles/chat-widget.css`
- Modify: `packages/core/src/App.tsx` (include ChatWidget globally)

**Architecture:**
- Hermes exposes an embedded chat endpoint (e.g. `POST /api/chat` on its internal port)
- The chat widget sends messages to `http://hermes-agent:9090/api/chat`
- Hermes processes the message with the compliance-agent profile
- Returns streaming response rendered in the widget

**ChatWidget.tsx outline:**
```tsx
interface ChatWidgetProps {
  agentApiUrl: string;    // http://hermes-agent:9090/api/chat
  apiKey: string;         // shared COMPLIANCE_API_KEY
}

// Features:
// - Floating bubble in bottom-right
// - Expandable panel (300px wide, 400px tall)
// - Message history (stored in localStorage)
// - Streaming response display
// - Quick-action buttons (pre-written prompts)
// - Dark mode compatible
// - Status indicator (agent online/offline)
```

**Quick-action buttons:**
```
┌─────────────────────────────────┐
│ 💬 Compliance Agent             │
├─────────────────────────────────┤
│                                 │
│  "Show NIS2 readiness status"   │ ← clickable chips
│  "Scan for expired evidence"     │
│  "Generate gap report"          │
│  "Check vendor assessment docs" │
│                                 │
├─────────────────────────────────┤
│ │                              ▲│
│ │  Type a message...          💬│
└─────────────────────────────────┘
```

**Steps:**
1. Create `useAgentChat` hook — manages message state, sends POST to Hermes, handles streaming
2. Create `ChatMessage` component — renders agent vs user messages with markdown support
3. Create `ChatBubble` component — the floating toggle button
4. Create `ChatWidget` — orchestrates all sub-components
5. Create `chat-widget.css` with compliance-themed styling (blue/gray palette)
6. Add to `App.tsx` — conditionally render when agent is available

**Verification:**
```bash
# In dev mode, verify widget renders
grep -r "ChatWidget" packages/core/src/
```
Expected: ChatWidget imported and rendered in App.tsx

---

### Task 3.2: Add Hermes embedded chat endpoint

**Objective:** Hermes agents need an HTTP endpoint that accepts messages and returns responses for the web chat widget

**Files:**
- Modify: `Dockerfile.agent` (add port 9090)
- Create: `packages/compliance-agent/chat-server.ts` or add to entrypoint
- Modify: `docker-entrypoint.sh` (start chat server alongside agent)

**Chat API contract:**
```
POST /api/chat
Content-Type: application/json
X-API-Key: <shared-key>

{
  "message": "Are we NIS2 ready?",
  "conversation_id": "uuid-or-null",
  "history": []  // optional message history
}

Response (streaming SSE):
event: token
data: {"token": "Your NIS2 readiness..."}

event: done
data: {"summary": "...", "actions": [...], "conversation_id": "uuid"}
```

**Steps:**
1. Wire a small Express server alongside Hermes that accepts chat messages
2. Forward messages to Hermes via `hermes chat -q` subprocess or internal SDK
3. Return streaming responses via Server-Sent Events (SSE)
4. Authenticate via same `COMPLIANCE_API_KEY` as GRCompliance API

**Verification:**
```bash
curl -X POST http://localhost:9090/api/chat \
  -H "X-API-Key: test" \
  -H "Content-Type: application/json" \
  -d '{"message":"Say hello"}'
```
Expected: Streaming JSON response

---

### Task 3.3: Wire chat widget to hermes-agent in compose

**Objective:** The web app can find and talk to the agent via Docker networking

**Files:**
- Modify: `docker-compose.selfhost.yml` (expose agent port, pass URL to complianceos)
- Modify: `packages/core/src/config.ts` (read AGENT_API_URL from env)

**Changes to compose:**
```yaml
services:
  complianceos:
    environment:
      - AGENT_API_URL=http://hermes-agent:9090/api/chat
      # ... existing env vars

  hermes-agent:
    ports:
      - "9090:9090"   # optional: expose for external debugging
    # ... existing
```

**In config.ts:**
```typescript
export const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 
  window._env_?.AGENT_API_URL || 
  'http://localhost:9090/api/chat';
```

**Steps:**
1. Add `AGENT_API_URL` env var to complianceos service
2. Pass it through to the frontend via Vite env or runtime config injection
3. ChatWidget reads the URL and connects

**Verification:**
```bash
docker compose -f docker-compose.selfhost.yml up -d
open http://localhost:3002
# See chat bubble → click → type "Are we NIS2 ready?"
```
Expected: Response from agent appears in widget

---

## Phase 4: Gateway & Alerting (4-6 hours)

**Goal:** CISOs can interact with the compliance agent via Telegram or Slack.

### Task 4.1: Create gateway config templates

**Objective:** Ship pre-configured gateway profiles for Telegram and Slack

**Files:**
- Create: `packages/compliance-agent/gateway/telegram.yml`
- Create: `packages/compliance-agent/gateway/slack.yml`
- Create: `packages/compliance-agent/gateway/README.md`

**telegram.yml template:**
```yaml
platforms:
  telegram:
    bot_token: ${TELEGRAM_BOT_TOKEN}
    allowed_ids:
      - ${CISO_TELEGRAM_ID}
    commands:
      /status: "Run compliance health check and return summary"
      /gaps: "List all compliance gaps by framework"
      /scan: "Trigger evidence collection and report results"
      /report: "Generate a full readiness report"
```

**Steps:**
1. Write Telegram config with CISOs commands
2. Write Slack config with slash commands
3. Document how to create a bot and get tokens
4. Add `GATEWAY_ENABLED` flag to agent entrypoint

**Verification:**
```bash
GATEWAY_ENABLED=true docker compose -f docker-compose.selfhost.yml up -d
```
Expected: Agent boots with gateway, responds to Telegram commands

---

### Task 4.2: Configure alert delivery from cron jobs

**Objective:** Scheduled scans send results to the CISO via their preferred messaging platform

**Files:**
- Create: `packages/compliance-agent/skills/compliance-agent/cron/daily-scan.yml`
- Create: `packages/compliance-agent/skills/compliance-agent/cron/weekly-report.yml`
- Create: `packages/compliance-agent/skills/compliance-agent/cron/evidence-expiry.yml`
- Modify: `packages/compliance-agent/docker-entrypoint.sh` (register cron jobs on boot)

**daily-scan.yml:**
```yaml
name: daily-evidence-scan
schedule: "0 6 * * *"   # 6 AM daily
deliver: "telegram,slack,email"
skills: ["compliance-agent"]
prompt: |
  Run a full evidence collection scan:
  1. Query GRCompliance API for all active controls
  2. For each control missing evidence or evidence older than 24h, run the scan script
  3. POST collected evidence to the API
  4. If any HIGH or CRITICAL findings, generate an alert
  5. Report: "Daily scan complete — X controls populated, Y gaps found"
```

**Steps:**
1. Create each cron definition file
2. Write entrypoint logic to register cron jobs from the directory
3. Test: run cron immediately and verify delivery

**Verification:**
```bash
docker compose -f docker-compose.selfhost.yml exec hermes-agent \
  hermes cron run daily-evidence-scan
```
Expected: Scan output delivered to configured gateway

---

## Phase 5: CISOvault Bridge (4-6 hours)

**Goal:** Security scan findings from CISOvault automatically flow into the GRCompliance risk register and evidence vault.

### Task 5.1: Build the CISOvault → GRCompliance pipeline script

**Objective:** A periodic Hermes cron job that polls CISOvault for HIGH findings and creates risks/evidence in GRCompliance

**Files:**
- Create: `packages/compliance-agent/skills/compliance-agent/scripts/cisovault-to-grc.py`
- Create: `packages/compliance-agent/skills/compliance-agent/cron/cisovault-bridge.yml`
- Modify: `packages/compliance-agent/docker-entrypoint.sh` (conditionally enable)

**cisovault-to-grc.py outline:**
```python
#!/usr/bin/env python3
"""Poll CISOvault for new HIGH/CRITICAL findings → POST to GRCompliance API."""

import os, json, urllib.request, sys

CISOVAULT_API = os.environ.get("CISOVAULT_API_URL", "http://cisovault:3099")
CISOVAULT_KEY = os.environ["CISOVAULT_API_KEY"]
GRC_API = os.environ.get("COMPLIANCE_API_URL", "http://complianceos:3002/api/v1")
GRC_KEY = os.environ["COMPLIANCE_API_KEY"]

def fetch_findings():
    req = urllib.request.Request(
        f"{CISOVAULT_API}/api/scans?severity=high,critical&since=24h",
        headers={"Authorization": f"Bearer {CISOVAULT_KEY}"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def create_risk(findings):
    for f in findings:
        payload = json.dumps({
            "title": f"[CISOvault] {f['title']}",
            "description": f["description"],
            "severity": f["severity"].lower(),
            "source": "cisovault",
            "source_id": f["id"],
            "domain": f.get("domain", ""),
            "evidence_data": json.dumps(f),
            "status": "open"
        }).encode()
        req = urllib.request.Request(
            f"{GRC_API}/risks",
            data=payload,
            headers={
                "X-API-Key": GRC_KEY,
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            print(f"  ✅ Created risk: {f['title']}")

if __name__ == "__main__":
    findings = fetch_findings()
    print(f"Found {len(findings)} new HIGH/CRITICAL findings")
    create_risk(findings)
```

**Steps:**
1. Write the pipeline script with error handling
2. Create cron definition (hourly)
3. Add conditional enablement (only runs if `CISOVAULT_API_URL` is set)
4. Test with mock data

**Verification:**
```bash
CISOVAULT_API_URL=http://localhost:3099 \
  CISOVAULT_API_KEY=test \
  COMPLIANCE_API_URL=http://localhost:3002/api/v1 \
  COMPLIANCE_API_KEY=test \
  python packages/compliance-agent/skills/compliance-agent/scripts/cisovault-to-grc.py
```
Expected: Finds fetched and risks created in GRCompliance

---

## Phase 6: Launch & Revenue (6-8 hours)

**Goal:** Ship the integrated product and start converting users to paid.

### Task 6.1: Write the new positioning copy

**Objective:** Update grcompliance.com landing page with agentic positioning

**Files:**
- Modify: `packages/landing/index.html`
- Modify: `packages/landing/pricing.html`
- Create: `packages/landing/agent.html` (feature page for the agent)

**Key messaging changes:**
- Hero adds: *"GRC platform + AI Compliance Agent — evidence collected automatically. Gaps reported in plain language."*
- Features section adds: "Auto-evidence collection", "Chat with your compliance posture", "Daily health scan"
- Pricing page: Community tier now includes "Agent: daily scans + web chat"
- New landing page `/agent` dedicated to the compliance agent feature

**Steps:**
1. Update homepage hero section
2. Add agent features to feature grid
3. Update pricing table (Agent: ✓ Free tier, ✓ Pro+Telegram)
4. Create `/agent` feature page with screenshots of the chat widget
5. Update comparison table vs Vanta/Drata (add agent row: "Built-in AI agent: ✅ us, ❌ them")

**Verification:**
```bash
open http://localhost:3002
# Review updated landing copy
```

---

### Task 6.2: Update docs with agent setup guide

**Objective:** Self-host users can understand and configure the agent

**Files:**
- Create: `docs/self-hosted/agent-setup.md`
- Modify: `docs/self-hosted/deploy.md`
- Create: `docs/self-hosted/agent-commands.md`

**agent-setup.md contents:**
```markdown
# Compliance Agent Setup

The Compliance Agent is an AI assistant that manages your GRCompliance platform.
It auto-collects evidence, answers questions, and alerts you about compliance gaps.

## How It Works

When you deploy ComplianceOS via the install script, the agent boots automatically
as a Docker sidecar. It connects to the GRCompliance API internally.

## Chat Interface

Open your ComplianceOS web app. A chat bubble appears in the bottom-right corner.
Click it to start a conversation.

## Telegram Setup (Pro+)

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Copy the bot token
3. Add to `.env`: `TELEGRAM_BOT_TOKEN=your-token`
4. Restart: `docker compose restart hermes-agent`
5. Message your bot: `/start`

## Slack Setup (Pro+)

1. Create a Slack app with bot token
2. Enable Event Subscriptions: `https://your-domain.com/api/slack/events`
3. Add to `.env`: `SLACK_BOT_TOKEN=...`, `SLACK_SIGNING_SECRET=...`
4. Restart

## Customization

- **Scan intervals** — Edit `skills/compliance-agent/cron/` YAML files
- **Evidence sources** — Add scripts to `scripts/`
- **Agent personality** — Edit the `SOUL.md` file
```

**Steps:**
1. Write agent setup guide
2. Write agent commands reference (list of natural language queries)
3. Update main deploy.md with note about agent

**Verification:**
```bash
head -5 docs/self-hosted/agent-setup.md
```
Expected: Document renders correctly

---

### Task 6.3: Launch posts with agentic positioning

**Objective:** Update existing launch copy to highlight the agent, then post

**Files:**
- Modify: `docs/launch/hackernews.md`
- Modify: `docs/launch/linkedin.md`
- Modify: `docs/launch/reddit.md`

**Key angle for all posts:**
> *"I built an open-source GRC platform — then gave it an AI agent. Now it auto-collects evidence, answers questions, and alerts via Telegram. Your data stays on your infra."*

**Steps:**
1. Update HN post to lead with agent angle
2. Update LinkedIn post
3. Update Reddit post
4. Post to all three platforms

**Verification:** Posts live and getting engagement.

---

### Task 6.4: Wire Stripe purchase flow

**Objective:** Users can buy Pro/MSSP licenses that unlock gateway, AI, and multi-tenant agent features

**Files:**
- Modify: `packages/core/src/lib/config.ts` (add agent tier prices)
- Modify: `packages/core/src/server/webhooks/purchase` (license fulfillment includes agent key)
- Create: `packages/core/src/lib/license/agent-license.ts` (verify agent tier entitlements)
- Modify: `docker-entrypoint.sh` (agent reads its license at boot)

**Steps:**
1. Define Stripe price IDs for Community (free), Pro ($499/yr), MSSP ($999/yr), Enterprise ($4,990/yr)
2. In `agent-license.ts`, define what each tier unlocks:
   - Community: web chat only, daily scans, 1 framework
   - Pro: + Telegram/Slack gateway, 3 frameworks, AI drafting
   - MSSP: + 20 client tenants, multi-instance agent management
   - Enterprise: + SSO, air-gapped mode, dedicated agent per tenant
3. On license validation in the agent container, restrict features based on tier
4. Create Stripe checkout → webhook → license key → agent tier unlocks

**Verification:**
```bash
# Purchase Pro
# Check agent logs for tier activation
docker compose logs hermes-agent | grep "license"
```
Expected: "Compliance Agent activated: Pro tier"

---

## Risk & Tradeoffs

| Risk | Mitigation |
|------|------------|
| **Hermes + DeepSeek costs** for CISOs running the agent | Default to lightweight model (DeepSeek V3 Flash ~$0.15/day). CISO can swap to free StepFun model. |
| **Agent adds Docker complexity** (4 containers vs 3) | Install script handles everything. User sees no difference. |
| **Supabase is still a hard dependency** for the community edition | Task 0.2 adds local auth mode — eliminates Supabase requirement. This is P0. |
| **Telegram/Slack tokens are a friction point** for setup | Doc it well. Offer managed gateway on Enterprise tier. |
| **Chat widget needs Hermes embedded HTTP endpoint** — doesn't exist yet | Build it in Phase 3. Use SSE for streaming. |
| **CISOvault bridge is pointless without CISOvault running** | Make it opt-in. Only activates when `CISOVAULT_API_URL` is set. |

## Verification Architecture

```
                    ┌─────────────────────┐
                    │  E2E Test Script    │
                    │  (Phase 2 Task 3)   │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Docker Build  │    │ API Integration  │    │ Agent Chat Test  │
│  Test         │    │  Test            │    │                  │
│               │    │                  │    │                  │
│ build agent   │    │ curl → /api/v1/  │    │ curl → /api/chat │
│ image         │    │ evidence         │    │ stream response  │
│ compose up    │    │ risks            │    │ quick actions    │
│ healthchecks  │    │ gaps             │    │                  │
└───────────────┘    └──────────────────┘    └──────────────────┘
```

## File Dependency Map

```
Phase 0 ──→ server_entry.ts, authMiddleware.ts, local-auth.ts
                 ↓
Phase 1 ──→ compliance-agent/profile/, compliance-agent/skills/, Dockerfile.agent
                 ↓
Phase 2 ──→ docker-compose.selfhost.yml, install.sh
                 ↓
Phase 3 ──→ ChatWidget.tsx, chat-server.ts, config.ts
                 ↓
Phase 4 ──→ gateway/*.yml, cron/*.yml
                 ↓
Phase 5 ──→ cisovault-to-grc.py
                 ↓
Phase 6 ──→ index.html, pricing.html, agent.html, docs/
```

Each phase depends on the previous. Do NOT start Phase 3 until Phase 2 is verified with the E2E test.

## Quick Start for Implementers

```bash
# Clone repo
cd /d/OneDrive\ -\ Intellfence/WebDev/ComplianceOS

# Start with Phase 0 — unblock local auth
# (detailed sub-tasks above)

# After each phase, run the E2E test:
bash scripts/test/full-stack-test.sh
```

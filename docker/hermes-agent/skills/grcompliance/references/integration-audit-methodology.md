# Integration Audit Methodology

Repeatable health check for the Hermes ↔ GRCompliance ↔ CISOvault three-system stack.

## When to Use

Run this audit when:
- Diagnosing "is everything working?" after a restart
- Before a demo to confirm all integration points are green
- After any docker-compose change (port mapping, new service, network change)
- The user reports a tool not responding

## Audit Checklist (10 probes)

### Layer 1 — Container Health (2 seconds)

```bash
# Are all containers running with correct port mappings?
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Expected:
# complianceos-app-1            Up         0.0.0.0:3005->3001/tcp
# complianceos-db-1             Up (healthy)  5432/tcp
# complianceos-hermes-agent-1   Up         0.0.0.0:9090->9090/tcp, 0.0.0.0:9118->9118/tcp
# complianceos-cisovault-1      Up (healthy)  0.0.0.0:3099->3099/tcp
# complianceos-cisovault-sync-1 Up         (no ports)
```

### Layer 2 — API Health (5 seconds)

```bash
# GRCompliance
curl -s http://localhost:3005/api/v1/health
# → {"status":"ok","database":{"connected":true}}

# CISOvault
curl -s http://localhost:3099/health
# → {"status":"ok","service":"cisovault-backend"}

# Hermes Bridge API
curl -s -X POST http://localhost:9090/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
# → {"choices":[{"message":{"role":"assistant","content":"..."}}]}

# Hermes Dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:9118/
# → 200

# GRC Agent Widget
curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/agent
# → 200

# CISOvault UI
curl -s -o /dev/null -w "%{http_code}" http://localhost:3099/admin/
# → 200
```

### Layer 3 — Data Sync (10 seconds)

```bash
# GRC risk count + CISOvault-linked count
curl -s -H "X-API-Key: test-api-key-for-local-dev" "http://localhost:3005/api/v1/risks" \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; ciso=[r for r in d if 'CISOV' in r.get('title','').upper()]; print(f'Total: {len(d)}, CISOvault-linked: {len(ciso)}')"

# CISOvault incident count
curl -s http://localhost:3099/api/incidents \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Open incidents: {len(d.get(\"incidents\",[]))}')"

# Sync bridge logs (check last cycle)
docker logs complianceos-cisovault-sync-1 --tail 10
# Should show "Sync complete" with no errors
```

### Layer 4 — Framework Controls (10 seconds)

```bash
# Check all 3 frameworks have controls loaded
for fw in "ISO 27001:2022" "NIS2" "NIST CSF"; do
  count=$(curl -s -H "X-API-Key: test-api-key-for-local-dev" "http://localhost:3005/api/v1/controls?framework=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$fw'))")" 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
  echo "$fw: $count controls"
done
```

### Layer 5 — Evidence & Pass Rate (5 seconds)

```bash
# Evidence count
curl -s -H "X-API-Key: test-api-key-for-local-dev" http://localhost:3005/api/v1/evidence | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Evidence: {len(d.get(\"data\",[]))}')"

# Framework pass rates
curl -s -H "X-API-Key: test-api-key-for-local-dev" http://localhost:3005/api/v1/frameworks | python3 -c "
import json,sys
for f in json.load(sys.stdin).get('data',[]):
    print(f'{f[\"framework\"]}: {f.get(\"pass_rate\",\"0\")}% ({f.get(\"implemented\",0)}/{f.get(\"total_controls\",0)})')
"
```

### Layer 6 — Gaps (10 seconds)

```bash
# NIS2 gaps
curl -s -H "X-API-Key: test-api-key-for-local-dev" "http://localhost:3005/api/v1/gaps?framework=nis2" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'NIS2 gaps: {len(d.get(\"data\",[]))}')"
```

### Layer 7 — Port Verification (critical — never assume)

When you encounter a port that seems unmapped (returns 000 or connection refused):

1. **Check what docker-compose actually maps**: `docker compose ps --format "table {{.Name}}\t{{.Ports}}"`
2. **Check what's inside the container**: `docker exec <container> sh -c "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<port>/"`
3. **If it responds inside but not outside**: the port mapping is missing — add it, OR check if another mapped port serves the same content (e.g. 9118 serves the dashboard that runs on 9119 internally)
4. **Never flag an unmapped port as a gap without this verification**. Multiple ports may serve identical content.

### Layer 8 — Hermes Sidecar Config (10 seconds)

```bash
# What toolsets does the container Hermes have?
docker exec complianceos-hermes-agent-1 sh -c "hermes config path 2>/dev/null && cat /app/config.yaml 2>/dev/null"

# Expected toolsets: terminal, web, memory, cronjob, file (minimum)
# Missing: delegation, grcompliance skill, cisovault skill
```

### Layer 9 — Risk Quality (15 seconds)

```bash
# Check for unowned risks
curl -s -H "X-API-Key: test-api-key-for-local-dev" "http://localhost:3005/api/v1/risks" \
  | python3 -c "
import json,sys
risks=json.load(sys.stdin).get('data',[])
unowned=[r for r in risks if not r.get('owner')]
no_score=[r for r in risks if not r.get('inherentScore')]
print(f'Total risks: {len(risks)}')
print(f'No owner: {len(unowned)} ({len(unowned)*100//max(len(risks),1)}%)')
print(f'No score: {len(no_score)} ({len(no_score)*100//max(len(risks),1)}%)')
"
```

### Layer 10 — Summary Report

After running the 9 probes above, compile:

```
**Integration Health:** X/10 layers green

## Running
- **5/5 containers** up (or N/M)
- **GRC:** X risks, Y CISOvault-linked, Z% pass rate
- **CISOvault:** X incidents, Y scans

## Critical Gaps
- (list what failed or came back empty)

## Recommended Actions
1. (list fixes in priority order)

**Want me to fix step 1?**
```

## Common Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Dashboard at 9118 works, 9119 unreachable from host | docker-compose only maps 9118 (not 9119 same content) | Not a bug — use 9118 |
| NIS2 framework exists but 0 controls | Controls not seeded in DB | `drizzle-kit push:pg` or seed script |
| Sync bridge skips all incidents | Dedup matches by title prefix `[CISOVault]` — check prefix format | Run sync script in verbose mode |
| Hermes in container can't query GRC | Missing `grcompliance` skill in sidecar config | Load skill via cron or startup script |
| Framework pass rates all 0% | No evidence mapped to controls | Create evidence items linked to controls |

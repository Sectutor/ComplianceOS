# GRCompliance + CISOvault + Hermes — 3-Minute Demo Walkthrough

## Before You Start

```bash
# From D:\OneDrive - Intellfence\WebDev\ComplianceOS\
docker compose up -d
```

**One command. All 5 containers start.**

---

## Step 1: The GRC Dashboard (30s)

**URL:** http://localhost:3005

What to say:
> *"This is GRCompliance — our self-hosted GRC platform. Right now it shows the NIS2 framework at **50%** pass rate. That's because findings from our security scans are already mapped as evidence against controls."*

**Point at:**
- NIS2: **50%** pass rate (5/10 controls with evidence)
- **20 evidence items** collected from real security scans
- **0 gaps** — every NIS2 control has documented evidence

---

## Step 2: Ask Hermes (60s)

**URL:** http://localhost:3005/agent → redirects to Hermes Dashboard

What to say:
> *"This is our AI compliance agent — Hermes. It knows about both GRCompliance and CISOvault. Watch this."*

**Type in the chat:**
```
Show me my NIS2 readiness
```

**Expected response:**
> NIS2 at **50%** — **5 controls implemented**, **5 in progress**, **20 evidence items** from CISOvault scans.

**Then type:**
```
What critical findings does CISOvault have?
```

**Expected response:**
> CISOvault has **375 open incidents** including SPF/DMARC missing, TLS validation failures, and subdomain exposure.

---

## Step 3: The Security Scanner (45s)

**URL:** http://localhost:3099/admin/

What to say:
> *"CISOvault is our self-hosted security scanner. It runs domain recon, web app scans, and port scans — all without sending data to any third party."*

**Point at:**
- **183 scans** performed
- Domain recon results showing real findings (SPF, TLS, subdomains)
- Auto-remediation: security headers injected into Nginx config

---

## Step 4: The Full Loop (45s)

What to say:
> *"Here's the key insight: when CISOvault finds something, it doesn't stay in the scanner. The sync bridge routes it automatically."*

**Show the flow:**
1. CISOvault scans `intellfence.com` → finds TLS issue
2. Bridge checks: is `intellfence.com` mapped to a client? → YES, Client 1
3. Creates a risk in GRCompliance: **[CISOVault] TLS Certificate Validation**
4. Maps the finding as evidence against NIS2 control `21(2)(h)` (Cryptography)
5. NIS2 pass rate updates in real time

**For a live demo, a new scan syncs within 60 seconds.**

---

## Step 5: Domain Assignments (30s)

If they ask *"what about new clients?"*

What to say:
> *"Unscanned domains sit in a holding pool until assigned. Hermes can show you unassigned domains and you assign them with one click."*

```bash
# Check unassigned domains via API:
curl -s http://localhost:3005/api/v1/domain-mappings?status=pending

# Assign a domain:
curl -s -X PATCH \
  http://localhost:3005/api/v1/domain-mappings/<id> \
  -H "Content-Type: application/json" \
  -d '{"clientId": 5, "status": "verified"}'
```

---

## Architecture Summary

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  CISOvault    │     │  Sync Bridge │     │ GRCompliance │
│  Scanner      │ ──▶ │  (auto-route)│ ──▶ │  GRC Engine   │
│  port 3099    │     │  every 60s   │     │  port 3005    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │           ┌────────┴────────┐           │
       │           │ client_domain_  │           │
       │           │ mappings table  │           │
       │           │ (who owns what) │           │
       │           └─────────────────┘           │
       │                                         │
       └────────────── Hermes Agent ─────────────┘
                      (port 9090/9118)
              Knows both systems, answers
              natural-language questions
```

## Key URLs for Demo

| What | URL |
|------|-----|
| GRCompliance | http://localhost:3005 |
| Hermes Dashboard | http://localhost:3005/agent → 302 → http://localhost:9118 |
| CISOvault | http://localhost:3099/admin/ |
| Sync Bridge | Runs inside Docker (no URL) |
| Domain Mappings API | http://localhost:3005/api/v1/domain-mappings |

## Troubleshooting

If something doesn't work:

```bash
# Check all containers are running
docker compose ps

# Check sync bridge logs (auto-sync every 60s)
docker logs complianceos-cisovault-sync-1 --tail 10

# Restart Hermes to reload skills
docker restart complianceos-hermes-agent-1

# Check GRC API
curl -s http://localhost:3005/api/v1/health
```

# Cybersecurity Master Agent — Total Build Plan

> **From:** GRCompliance + CISOvault + Hermes  
> **To:** Multi-agent Cybersecurity Master Platform (SIEM + GRC + Threat Hunting + IR + Knowledge Graph)  
> **Principle:** Every component is a microservice container. Swap, scale, or replace independently.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Current Stack (What Exists)](#2-current-stack-what-exists)
3. [Phase 0 — Foundation](#3-phase-0--foundation-existing)
4. [Phase 1 — Agentic GRC Loop](#4-phase-1--agentic-grc-loop-2-weeks)
5. [Phase 2 — SIEM & Threat Hunting](#5-phase-2--siem--threat-hunting-2-weeks)
6. [Phase 3 — Knowledge Graph & RAG](#6-phase-3--knowledge-graph--rag-2-weeks)
7. [Phase 4 — Multi-Agent Specialists](#7-phase-4--multi-agent-specialists-month-2)
8. [Phase 5 — Autonomy & Sandboxing](#8-phase-5--autonomy--sandboxing-month-3)
9. [Docker Compose Topology](#9-docker-compose-topology)
10. [Container Network Map](#10-container-network-map)
11. [Integration Points Matrix](#11-integration-points-matrix)
12. [Security Architecture](#12-security-architecture)
13. [Pricing Upsell Map](#13-pricing-upsell-map)
14. [Implementation Checklist](#14-implementation-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Telegram  │  │  Slack   │  │   Web    │  │   API Gateway      │  │
│  │  Chat     │  │  Bot     │  │  UI/react│  │  (nginx/caddy)     │  │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └─────────┬──────────┘  │
└────────┼────────────┼─────────────┼───────────────────┼─────────────┘
         │            │             │                   │
┌────────▼────────────▼─────────────▼───────────────────▼─────────────┐
│                      ORCHESTRATION LAYER                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              HERMES AGENT (Master Orchestrator)              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │    │
│  │  │  Cron    │  │ Gateway  │  │Delegation│  │   Skills   │   │    │
│  │  │Scheduler │  │Msg Router│  │  Engine  │  │  Library   │   │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │    │
│  │  │  Memory  │  │  Agents  │  │  Tools   │                   │    │
│  │  │Persistence│  │  Registry│  │  Runtime │                   │    │
│  │  └──────────┘  └──────────┘  └──────────┘                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Delegates to specialist sub-agents:                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Risk    │  │Compliance│  │ Infosec  │  │  Policy  │           │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │             │             │                  │
└───────┼─────────────┼─────────────┼─────────────┼──────────────────┘
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────────────┐
│                      SERVICE LAYER (Containers)                     │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Wazuh   │  │ Wazuh   │  │ Wazuh   │  │  TheHive         │   │
│  │  Indexer │  │ Server  │  │Dashboard│  │  (IR Case Mgmt)   │   │
│  │(OpenSearch│  │(Manager) │  │(Kibana) │  │                  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │             │             │                  │             │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌───────▼──────────┐  │
│  │ Cortex   │  │  Neo4j   │  │ Chroma   │  │  LlamaIndex      │  │
│  │Analyzers │  │Graph DB  │  │Vector DB │  │  RAG Server      │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │CISOvault │  │GRCompliance│  │  MISP    │  │  OPA/Gatekeeper  │   │
│  │ Scanner  │  │ GRC Engine│  │Threat Intel│  │  Policy Engine   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────────┘   │
│       │             │             │                                │
└───────┼─────────────┼─────────────┼────────────────────────────────┘
        │             │             │
┌───────▼─────────────▼─────────────▼────────────────────────────────┐
│                      DATA LAYER                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │PostgreSQL│  │PostgreSQL│  │PostgreSQL│  │  S3/MinIO        │   │
│  │(GRCompl.)│  │(TheHive) │  │(MISP)    │  │  (Evidence Files) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│  ┌──────────┐  ┌──────────┐                                         │
│  │  Redis   │  │  Redis   │                                         │
│  │(GRCompl.)│  │(Sessions)│                                         │
│  └──────────┘  └──────────┘                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Current Stack (What Exists)

| Container | Image | Port | Purpose | Status |
|-----------|-------|------|---------|--------|
| `complianceos-app` | `ghcr.io/sectutor/complianceos-self-hosted:dev` | 3005 | GRC engine (controls, risks, evidence, audit) | ✅ Live |
| `complianceos-db` | `postgres:17-alpine` | 5432 | GRC PostgreSQL | ✅ Live |
| `complianceos-redis` | `redis:7-alpine` | 6379 | GRC cache/sessions | ✅ Live |
| `cisovault` | `cisovault:latest` | 3099 | Security scanner (Nuclei/Nmap/Trivy) | ✅ Dev |
| `cisovault-sync` | `complianceos-cisovault-sync:latest` | — | Sync bridge: findings → GRC risks | ✅ Live |
| `hermes-agent` | `complianceos-hermes-agent:latest` | 3004 | Agent orchestrator (skills/cron/gateway) | ✅ Live |
| `hermes-dashboard` | (embedded in hermes-agent) | 3004 | Hermes web dashboard | ✅ Live |

**Hermes skills already built:**
- `grcompliance` — GRC API client, risk analysis, evidence collection
- `grcompliance-agent` — Full Hermes config for GRCompliance
- `cisovault-sync-bridge` — CISOvault ↔ GRCompliance sync
- `vanta-improvement-pipeline` — Daily GRC → Vanta pipeline

---

## 3. Phase 0 — Foundation (Existing)

Already operational. No build work needed.

---

## 4. Phase 1 — Agentic GRC Loop (2 Weeks)

### Goal
Ship the "Agentic GRC" differentiator. Turn GRCompliance from a passive database into an active security manager.

### Microservices to Build/Deploy

#### 1.1 Hermes GRC Skill Package
- **Container:** `hermes-agent` (existing — add skill)
- **Files:** `skills/grcompliance-agent/SKILL.md` (exists, enhance)
- **What it does:** Pre-built skill with GRC API schema, framework knowledge (NIS2/DORA/GDPR/ISO 27001), evidence collection logic
- **Integration:** Load into any Hermes session → instant compliance agent

#### 1.2 Compliance Gap Report Cron
- **Container:** `hermes-agent` (existing cron)
- **Schedule:** Daily 7am + on-demand
- **Flow:**
  1. Hermes queries GRCompliance API: `GET /api/controls?framework=nis2`
  2. Cross-references control status vs evidence freshness
  3. Produces structured gap report per framework
  4. Delivers to Telegram/Email/Slack

#### 1.3 CISOvault → Risk Auto-Creation
- **Container:** `cisovault-sync` (existing — enhance)
- **Trigger:** New CISOvault HIGH/CRITICAL finding
- **Flow:**
  1. CISOvault scan completes → finding stored
  2. Sync bridge detects new CRITICAL finding
  3. Creates risk item in GRCompliance: `POST /api/risks`
  4. Maps to affected controls automatically
  5. Optionally creates TheHive case (if Phase 2 deployed)

#### 1.4 Evidence Auto-Collector Cron
- **Container:** `hermes-agent` (new cron + delegate skill)
- **Schedule:** Every 12h
- **Flow:**
  1. Reads GRCompliance controls with expiring evidence
  2. Spawns sub-agents per control type:
     - `scanner-agent` — runs CISOvault scan
     - `repo-agent` — checks GitHub CI/CD results
     - `cloud-agent` — polls cloud compliance APIs
  3. Collects results → POST to GRCompliance evidence endpoint

### Docker Changes
- None — all changes are Hermes skills + cron jobs + bridge script enhancements

---

## 5. Phase 2 — SIEM & Threat Hunting (2 Weeks)

### Goal
Add log ingestion, SIEM correlation, threat hunting, and incident response — turning the platform into a complete Security Operations + GRC platform.

### Microservices to Deploy

#### 2.1 Wazuh Stack (3 containers)
```
┌─────────────────────────────────────────────┐
│              WAZUH STACK                      │
│                                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  Wazuh   │◄──►│  Wazuh   │◄──►│  Wazuh   │ │
│  │ Indexer  │    │  Server  │    │Dashboard │ │
│  │(OpenSrch)│    │(Manager) │    │(Kibana)  │ │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘ │
│       │               │               │       │
│       ▼               ▼               ▼       │
│  ┌─────────────────────────────────────────┐  │
│  │       Wazuh Agents (on endpoints)        │  │
│  │  Linux, Windows, Mac, Docker hosts       │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `wazuh-indexer` | `wazuh/wazuh-indexer:4.9` | 9200 | OpenSearch — log storage + search |
| `wazuh-server` | `wazuh/wazuh-server:4.9` | 55000 | Manager — agents, rules, correlation |
| `wazuh-dashboard` | `wazuh/wazuh-dashboard:4.9` | 443 | Kibana — visualizations + dashboards |

**Wazuth to deploy per doc:** ~8GB RAM total, 3 containers, persistent volumes for index data.

#### 2.2 TheHive + Cortex (2 containers)

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `thehive` | `thehiveproject/thehive:5.2` | 9000 | Incident case management, alerts, playbooks |
| `cortex` | `thehiveproject/cortex:3.1` | 9001 | Analyzer engine (VirusTotal, AbuseIPDB, etc.) |
| `thehive-db` | `postgres:15-alpine` | 5433 | TheHive PostgreSQL |

**TheHive flow:**
1. Wazuh alert (high severity correlation rule fires)
2. Alert auto-created in TheHive as case
3. Cortex enriches observables (IPs → VirusTotal, domains → WHOIS)
4. Playbook fires: notify CISO, create GRCompliance risk item
5. Analyst resolves in TheHive → syncs back to GRCompliance

#### 2.3 Hermes Threat Hunting Skill
- **What:** Pre-built hunting playbooks as Hermes skills
- **Commands:**
  - `hunt for credential dumping` — YARA + Wazuh query
  - `hunt for C2 beacon` — Wazuh correlation + netflow
  - `hunt for Log4j` — Wazuh + CISOvault combined scan
  - `show me anomalies last 24h` — Wazuh rule hits summary
- **Integration:** Hermes delegates to `wazuh-agent` sub-agent → queries Wazuh API → formats result

#### 2.4 SIEM Correlation → GRC Risk Pipeline
- **Bridge:** Wazuh alert → TheHive case → GRCompliance risk
- **When:** Wazuh rule fires with alert_level >= 12
- **What gets created:**
  - TheHive case with all observables
  - GRCompliance risk item with severity mapping
  - Telegram/Email alert to CISO

### Docker Additions
- New docker-compose profile: `siem.yml` — Wazuh 3-container stack
- New docker-compose profile: `ir.yml` — TheHive + Cortex + DB
- Hermes skill: `wazuh-hunting/SKILL.md`
- Hermes skill: `thehive-bridge/SKILL.md`

### Resource Requirements
- Wazuh: 8GB RAM, 100GB storage (index data grows ~2GB/day for 50 endpoints)
- TheHive: 2GB RAM
- Cortex: 1GB RAM

---

## 6. Phase 3 — Knowledge Graph & RAG (2 Weeks)

### Goal
Move from flat tables to relationship-aware compliance knowledge. Answer "what protects our crown jewels?" as a graph path, not a spreadsheet row.

### Microservices to Deploy

#### 3.1 Neo4j Knowledge Graph
| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `neo4j` | `neo4j:5-community` | 7474 (HTTP), 7687 (Bolt) | Graph database |
| `neo4j-init` | (one-shot) | — | Schema + seed data loader |

**Ontology (Cyber Entities & Relationships):**

```
(Asset) -[:HAS_VULNERABILITY]-> (Vulnerability)
(Asset) -[:PROTECTED_BY]-> (Control)
(Control) -[:MAPS_TO]-> (Framework)
(Vulnerability) -[:EXPLOITED_BY]-> (Threat)
(Threat) -[:MITIGATED_BY]-> (Control)
(Finding) -[:AFFECTS]-> (Asset)
(Finding) -[:EVIDENCE_FOR]-> (Control)
(Control) -[:GOVERNED_BY]-> (Regulation)
(Regulation) -[:REQUIRES]-> (Policy)
```

**Data sources → Graph:**
- GRCompliance DB → `:Control`, `:Risk`, `:Framework` nodes + relationships
- CISOvault findings → `:Finding` nodes connected to `:Asset`
- Wazuh alerts → `:Incident` nodes connected to affected `:Asset`
- Policy documents → `:Policy` nodes (from RAG extraction)

**Queries Hermes can run:**
```
"What controls protect our production database?"
  MATCH (a:Asset {name: 'prod-db'})-[:PROTECTED_BY]->(c:Control)
  RETURN c.name, c.status, c.evidence_freshness

"Which regulations apply to our exposed S3 buckets?"
  MATCH (a:Asset {type: 's3-bucket'})-[:HAS_VULNERABILITY]->(v:Vulnerability {severity: 'CRITICAL'})
  MATCH (v)-[:EXPLOITED_BY]->(t:Threat)
  MATCH (t)-[:MITIGATED_BY]->(c:Control)
  MATCH (c)-[:GOVERNED_BY]->(r:Regulation)
  RETURN r.name, count(c) as controls_required, collect(c.name) as controls
```

#### 3.2 LlamaIndex RAG Server
| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `rag-server` | Custom Python/FastAPI | 8000 | Document ingestion + query API |
| `chroma` | `chromadb/chroma:0.5` | 8001 | Vector embeddings store |

**Pipelines:**
1. Docs ingress: Upload policies, standards, audit reports → chunked → embedded → Chroma
2. Query: "What does our password policy say about MFA?" → semantic search → LLM-answered with citations
3. Scheduled re-index: Cron job re-indexes changed documents daily

#### 3.3 Hermes Graph Query Skill
- **What:** `neo4j-agent` sub-agent with Cypher query generation
- **Flow:**
  1. User asks natural language question
  2. Hermes generates Cypher query from question + ontology schema
  3. Executes against Neo4j
  4. Returns formatted answer with graph paths

### Docker Additions
- New docker-compose profile: `knowledge.yml` — Neo4j + Chroma + RAG server
- Hermes skill: `neo4j-agent/SKILL.md`
- Hermes skill: `rag-server/SKILL.md`

---

## 7. Phase 4 — Multi-Agent Specialists (Month 2)

### Goal
Specialist sub-agents that each own a domain — Risk, Compliance, Infosec, Policy, Training. Hermes orchestrates, specialists execute.

### Microservices (Hermes Sub-Agents — no new containers)

#### 7.1 Risk Agent
- **Hermes Role:** `risk-agent` (delegated via Hermes delegation engine)
- **Capabilities:**
  - FAIR model quantitative risk scoring
  - What-if simulation ("what if we mitigate control X?")
  - Third-party risk from contract analysis
  - Risk treatment recommendations
- **Data sources:** GRCompliance risk register, Neo4j graph, CISOvault findings
- **Outputs:** Risk scores, treatment plans, trend reports

#### 7.2 Compliance Agent
- **Hermes Role:** `compliance-agent`
- **Capabilities:**
  - Continuous gap analysis (map controls → frameworks)
  - Automated evidence collection scheduling
  - Regulatory change tracking (new laws → impact analysis)
  - Audit-ready evidence packages
- **Data sources:** GRCompliance controls/evidence, Neo4j framework mappings, CISO Assistant API
- **Outputs:** Gap reports, evidence status dashboards, audit packages

#### 7.3 Infosec Agent
- **Hermes Role:** `infosec-agent`
- **Capabilities:**
  - Vulnerability management (CISOvault + Wazuh findings)
  - Threat hunting (pre-built hunt playbooks)
  - Access control reviews (least privilege analysis)
  - Remediation recommendations
- **Data sources:** CISOvault findings, Wazuh alerts, Neo4j asset graph
- **Outputs:** Vulnerability reports, hunt summaries, remediation tickets

#### 7.4 Policy Agent
- **Hermes Role:** `policy-agent`
- **Capabilities:**
  - AI-assisted policy creation from templates
  - Gap analysis: existing policies vs regulation requirements
  - Policy versioning and approval workflows
  - Distribution tracking (who has read/acknowledged)
- **Data sources:** RAG server (policy documents), GRCompliance (controls), regulation text
- **Outputs:** Draft policies, gap analyses, acknowledgment reports

#### 7.5 Agent Registry & Discovery
- **Container:** `hermes-agent` (built-in)
- **What:** All sub-agents register with Hermes master → master routes questions to the right specialist
- **Flow:**
  1. User: "What's our top risk?"
  2. Hermes classifies → routes to Risk Agent
  3. Risk Agent queries GRCompliance + Neo4j → returns answer
  4. Hermes formats and delivers

### Hermes Changes
- Create 4 sub-agent skills: `risk-agent`, `compliance-agent`, `infosec-agent`, `policy-agent`
- Update master orchestrator delegation rules
- No new Docker containers — uses Hermes delegation

---

## 8. Phase 5 — Autonomy & Sandboxing (Month 3+)

### Goal
Safe autonomous execution: patch deployment, config remediation, firewall rule changes — with human-in-the-loop approvals and full audit trails.

### Components

#### 8.1 NemoClaw Sandbox (or equivalent)
- **Container:** `nemoclaw-runtime` (or `firecracker-containerd`, `gVisor`)
- **What:** Secure sandbox for running agent actions (scans, patches, config changes)
- **Isolation:** Each action runs in its own micro-VM/container with:
  - No outbound network unless explicitly permitted
  - Read-only filesystem (except output directory)
  - Strict resource limits (CPU/mem/timeout)
  - Full audit log (stdin/stdout/stderr + exit code)
- **Integration:**
  1. Hermes determines action type (read/inform → direct; write/change → sandbox)
  2. Package action as script → send to sandbox
  3. Sandbox executes → captures output + audit trail
  4. For destructive actions: pause for human approval
  5. Result logged to GRCompliance audit trail

#### 8.2 Human-in-the-Loop Workflow
```
Hermes proposes remediation: "Patch OpenSSL on web-server-01"
                               │
                    ┌──────────▼──────────┐
                    │  Approval Required    │
                    │  Sent to CISO via     │
                    │  Telegram/Email       │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                            ▼
            "approve"                     "deny" / timeout
                 │                            │
    ┌────────────▼────────────┐         ┌─────▼─────┐
    │ Sandbox executes patch  │         │ Log denial │
    │ Verifies fix            │         │ + reason   │
    │ Updates evidence in GRC │         │ to audit   │
    │ Notifies CISO: done     │         │ trail      │
    └─────────────────────────┘         └───────────┘
```

#### 8.3 Self-Evolving Skills
- Hermes monitors: which skills succeed/fail, which queries return poor results
- Automatically creates/refines skills based on outcomes
- Example: after 3 failed Wazuh queries, Hermes creates a more specific `wazuh-threat-hunt` skill

---

## 9. Docker Compose Topology

### Profiles

```
docker-compose.yml (core — always up)
├── siem.yml (profile: siem)
├── ir.yml (profile: ir)
├── knowledge.yml (profile: knowledge)
└── sandbox.yml (profile: sandbox)
```

### Core docker-compose.yml (always running)

```yaml
version: '3.8'
services:
  complianceos-app:
    image: ghcr.io/sectutor/complianceos-self-hosted:dev
    ports: ["3005:3005"]
    depends_on: [complianceos-db, complianceos-redis]
    volumes: [evidence:/app/uploads]
    networks: [grc-net]

  complianceos-db:
    image: postgres:17-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: complianceos
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    networks: [grc-net]

  complianceos-redis:
    image: redis:7-alpine
    networks: [grc-net]

  cisovault:
    build: ./cisovaultAI
    ports: ["3099:3099"]
    volumes: [/var/run/docker.sock:/var/run/docker.sock]
    networks: [grc-net]

  cisovault-sync:
    build: ./docker/sync
    depends_on: [complianceos-app, cisovault]
    environment:
      GRC_API_URL: http://complianceos-app:3005/api/v1
      CISOVAULT_URL: http://cisovault:3099
    restart: unless-stopped
    networks: [grc-net]

  hermes-agent:
    build: ./docker/hermes-agent
    ports: ["3004:3004"]
    depends_on: [complianceos-app, cisovault]
    volumes:
      - ./docker/hermes-agent/profile:/app/profile
      - ./docker/hermes-agent/skills:/app/skills
    networks: [grc-net]

networks:
  grc-net:
    driver: bridge

volumes:
  pgdata:
  evidence:
```

### SIEM Profile (docker-compose.siem.yml)

```yaml
version: '3.8'
services:
  wazuh-indexer:
    image: wazuh/wazuh-indexer:4.9
    ports: ["9200:9200"]
    environment:
      - node.name=node-1
      - cluster.initial_master_nodes=node-1
    volumes: [wazuh-indexer-data:/var/lib/wazuh-indexer]
    networks: [grc-net]

  wazuh-server:
    image: wazuh/wazuh-server:4.9
    ports: ["55000:55000", "1514:1514/udp", "1515:1515", "514:514/udp"]
    depends_on: [wazuh-indexer]
    volumes: [wazuh-server-data:/var/ossec]
    environment:
      - INDEXER_URL=https://wazuh-indexer:9200
    networks: [grc-net]

  wazuh-dashboard:
    image: wazuh/wazuh-dashboard:4.9
    ports: ["443:443"]
    depends_on: [wazuh-indexer]
    environment:
      - OPENSEARCH_HOSTS=https://wazuh-indexer:9200
    networks: [grc-net]

volumes:
  wazuh-indexer-data:
  wazuh-server-data:
```

### IR Profile (docker-compose.ir.yml)

```yaml
version: '3.8'
services:
  thehive-db:
    image: postgres:15-alpine
    volumes: [thehive-pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: thehive
      POSTGRES_PASSWORD: ${THEHIVE_DB_PASSWORD}
    networks: [grc-net]

  cortex:
    image: thehiveproject/cortex:3.1
    ports: ["9001:9001"]
    depends_on: [thehive-db]
    environment:
      - CORTEX_INDEX_HOME=/opt/cortex/files
    volumes: [cortex-data:/opt/cortex/files]
    networks: [grc-net]

  thehive:
    image: thehiveproject/thehive:5.2
    ports: ["9000:9000"]
    depends_on: [thehive-db, cortex]
    environment:
      - DATABASE_URL=postgresql://thehive:${THEHIVE_DB_PASSWORD}@thehive-db:5432/thehive
      - CORTEX_URL=http://cortex:9001
    volumes: [thehive-data:/opt/thehive/data]
    networks: [grc-net]

volumes:
  thehive-pgdata:
  thehive-data:
  cortex-data:
```

### Knowledge Profile (docker-compose.knowledge.yml)

```yaml
version: '3.8'
services:
  neo4j:
    image: neo4j:5-community
    ports: ["7474:7474", "7687:7687"]
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}
      NEO4J_PLUGINS: '["apoc"]'
    volumes: [neo4j-data:/data]
    networks: [grc-net]

  chroma:
    image: chromadb/chroma:0.5.23
    ports: ["8001:8000"]
    volumes: [chroma-data:/chroma/chroma]
    environment:
      - IS_PERSISTENT=TRUE
    networks: [grc-net]

  rag-server:
    build: ./docker/rag-server
    ports: ["8000:8000"]
    depends_on: [chroma, neo4j]
    environment:
      - CHROMA_URL=http://chroma:8000
      - NEO4J_URI=bolt://neo4j:7687
    volumes: [rag-data:/app/data]
    networks: [grc-net]

volumes:
  neo4j-data:
  chroma-data:
  rag-data:
```

---

## 10. Container Network Map

```
                    ┌─────────────────────────────────────┐
                    │         grc-net (bridge)             │
                    │                                      │
  ┌────────┐        │  ┌────────┐    ┌────────┐           │
  │  User   │───────┼──┤ Hermes │    │Wazuh   │           │
  │  (HTTP) │HTTPS  │  │ Agent  │    │Dashboard│           │
  └────────┘        │  │:3004   │    │:443    │           │
                    │  └──┬─────┘    └────────┘           │
                    │     │ delegates to                   │
                    │  ┌──┴──────────────────────────┐     │
                    │  │  Sub-Agents (Hermes tasks)  │     │
                    │  │  ┌────┐┌────┐┌────┐┌────┐  │     │
                    │  │  │Risk││Cmp ││Sec ││Pol │  │     │
                    │  │  └─┬──┘└──┬─┘└──┬─┘└──┬─┘  │     │
                    │  └────┼──────┼─────┼─────┼────┘     │
                    │       │      │     │     │          │
                    │  ┌────▼──┐ ┌─▼──┐ ┌▼──┐ ┌▼──┐      │
                    │  │GRComp.│ │Wazuh│ │CISO│ │Neo4j    │
                    │  │:3005  │ │Srvr │ │vault │:7687   │
                    │  │:5432  │ │     │ │:3099│ │:7474   │
                    │  └──┬────┘ └─────┘ └─────┘ └────┘  │
                    │     │                               │
                    │  ┌──▼────┐  ┌────────┐  ┌────────┐ │
                    │  │Postgre│  │TheHive │  │ Charma │ │
                    │  │(data) │  │:9000   │  │:8001   │ │
                    │  └───────┘  └────────┘  └────────┘ │
                    │                                      │
                    └──────────────────────────────────────┘
```

### Cross-Container Communication

| Source | Target | Protocol | Purpose | Phase |
|--------|--------|----------|---------|-------|
| Hermes Agent | GRCompliance | HTTP (REST) | Query controls, risks, evidence | 0 |
| Hermes Agent | CISOvault | HTTP (REST) | Trigger scans, get findings | 0 |
| cisovault-sync | GRCompliance | HTTP (REST) | Sync findings → risks | 0 |
| cisovault-sync | CISOvault | HTTP (REST) | Fetch new findings | 0 |
| Hermes Agent | Wazuh Server | HTTP (REST API) | Query alerts, run hunts | 2 |
| Hermes Agent | TheHive | HTTP (REST API) | Create cases, update status | 2 |
| TheHive | Cortex | HTTP (REST) | Run analyzers on IOCs | 2 |
| Wazuh Server | TheHive | Webhook | Push high-severity alerts | 2 |
| Hermes Agent | Neo4j | Bolt (TCP 7687) | Graph queries | 3 |
| Hermes Agent | RAG Server | HTTP (REST) | Semantic doc search | 3 |
| RAG Server | Chroma | gRPC/HTTP | Vector search | 3 |
| RAG Server | Neo4j | Bolt | Graph context for RAG | 3 |
| Hermes Agent | NemoClaw | HTTP | Sandboxed execution | 5 |

---

## 11. Integration Points Matrix

### Alert Flow: CISOvault → Wazuh → TheHive → GRCompliance

```
CISOvault scan ──► CRITICAL finding
     │
     ▼
1. Sync bridge: POST /api/risks (GRCompliance)   [Phase 1]
2. Sync bridge: POST /api/alert (Wazuh)          [Phase 2]
3. Wazuh rule matches → webhook to TheHive       [Phase 2]
4. TheHive creates case + runs Cortex analyzers   [Phase 2]
5. TheHive updates case with IOC enrichment       [Phase 2]
6. Hermes queries TheHive: "show unresolved cases" [Phase 2]
```

### Report Flow: Multi-Source → Unified Report

```
User: "Generate NIS2 readiness report"
     │
     ▼
Hermes delegates to Compliance Agent
     │
     ├── GRCompliance: GET /api/controls?framework=nis2
     ├── Wazuh: GET /security/events?rule=nis2-*
     ├── Neo4j: MATCH (c:Control)-[:MAPS_TO]->(f:Framework {name:'NIS2'})
     ├── CISOvault: GET /findings?framework=nis2
     └── RAG: "NIS2 requirements" → relevant policy excerpts
     │
     ▼
Compliance Agent collates → structured report
     │
     ▼
Hermes delivers to CISO via Telegram/Email
```

### Hunt Flow: Hermes → Wazuh → TheHive

```
User: "hunt for credential dumping"
     │
     ▼
Hermes loads wazuh-hunting skill
     │
     ├── Queries Wazuh: processes where name="lsass" AND access_count > threshold
     ├── Queries Wazuh: EventID 4663 (attempt to access sensitive object)
     ├── Queries YARA: file scans for mimikatz patterns
     │
     ▼
Results found?
     │
     ├── No → "No signs of credential dumping detected. Safe."
     └── Yes → Creates TheHive case + GRCompliance risk
               → Alerts CISO with evidence
```

---

## 12. Security Architecture

### Container Isolation

| Container | Network | Privileges | Outbound | Notes |
|-----------|---------|------------|----------|-------|
| complianceos-app | grc-net only | None | GRC API | No external access |
| complianceos-db | grc-net only | None | None | DB port not exposed |
| hermes-agent | grc-net + external | None | Telegram/Email | Gateway connections |
| cisovault | grc-net + external | Docker socket | Scan targets | Needs `--privileged` for nmap |
| wazuh-server | grc-net + external | None | Agent comms | 1514/udp from agents |
| wazuh-dashboard | grc-net | None | None | HTTPS reverse proxy |
| thehive | grc-net | None | Cortex | Internal only |
| neo4j | grc-net | None | None | Bolt port internal |

### Agent Security Measures
1. **NemoClaw sandbox** for all write/destructive actions (Phase 5)
2. **Human-in-the-loop** for: patch deployment, config changes, firewall rule updates
3. **Audit trail** — every agent action logged to GRCompliance audit module
4. **Prompt injection defense** — input validation, output filtering, context grounding via RAG
5. **Least privilege** — each container has minimum network/filesystem access
6. **API keys** — all inter-container communication authenticated
7. **Secret management** — `.env` files, never hardcoded

---

## 13. Pricing Upsell Map

| Tier | Price | Included | New in This Phase |
|------|-------|----------|-------------------|
| **Community/Free** | $0 | GRCompliance core (self-hosted) | — |
| **Team** | $1,490/yr | GRCompliance + CISOvault + Hermes agent | Phase 0 (existing) |
| **Enterprise** | $2,499/yr | Team + **Wazuh SIEM** + **TheHive IR** + **Threat Hunting** | Phase 1-2 (new) |
| **Partner** | $4,990/yr | Enterprise + **Knowledge Graph** + **Multi-Agent Specialists** + **Sandboxed Autonomy** | Phase 3-5 (new) |

**Enterprise value prop:** "Your CISO gets a complete Security Operations + GRC platform for $2,499/yr. Equivalent commercial tools cost $50K-$150K/yr."

---

## 14. Implementation Checklist

### Phase 1 — Agentic GRC Loop (Weeks 1-2)
- [ ] 1.1 Enhance grcompliance Hermes skill with all API endpoints
- [ ] 1.2 Deploy compliance gap report cron (daily 7am)
- [ ] 1.3 Wire CISOvault HIGH → GRCompliance risk auto-creation
- [ ] 1.4 Deploy evidence auto-collector (12h schedule)
- [ ] 1.5 Wire Telegram gateway (connected to @Goldigger1bot)

### Phase 2 — SIEM & Threat Hunting (Weeks 3-4)
- [ ] 2.1 Deploy Wazuh 3-container stack (indexer + server + dashboard)
- [ ] 2.2 Deploy TheHive + Cortex + DB
- [ ] 2.3 Install Wazuh agents on target endpoints
- [ ] 2.4 Create Wazuh correlation rules (credential dumping, C2, lateral movement)
- [ ] 2.5 Wire Wazuh alerts → TheHive cases
- [ ] 2.6 Wire TheHive cases → GRCompliance risks
- [ ] 2.7 Build Hermes `wazuh-hunting` skill with 5 hunt playbooks
- [ ] 2.8 Build Hermes SIEM query skill (natural language → Wazuh API)

### Phase 3 — Knowledge Graph & RAG (Weeks 5-6)
- [ ] 3.1 Deploy Neo4j with persistent volume
- [ ] 3.2 Create cyber ontology schema (assets, controls, risks, threats, regulations)
- [ ] 3.3 Build data loader: GRCompliance DB → Neo4j
- [ ] 3.4 Build data loader: CISOvault findings → Neo4j
- [ ] 3.5 Build data loader: Wazuh incidents → Neo4j
- [ ] 3.6 Deploy Chroma vector DB
- [ ] 3.7 Build RAG server (LlamaIndex + FastAPI)
- [ ] 3.8 Build Hermes `neo4j-agent` skill (Cypher query generation from natural language)

### Phase 4 — Multi-Agent Specialists (Month 2)
- [ ] 4.1 Build Risk Agent skill (FAIR scoring, what-if, TPRM)
- [ ] 4.2 Build Compliance Agent skill (gap analysis, evidence collection)
- [ ] 4.3 Build Infosec Agent skill (vuln mgmt, threat hunting, access review)
- [ ] 4.4 Build Policy Agent skill (creation, gap analysis, versioning)
- [ ] 4.5 Update Hermes master delegation rules (classify → route to specialist)

### Phase 5 — Autonomy & Sandboxing (Month 3+)
- [ ] 5.1 Evaluate NemoClaw vs Firecracker vs gVisor for action sandbox
- [ ] 5.2 Deploy sandbox runtime
- [ ] 5.3 Build human-in-the-loop approval workflow (Telegram approve/deny)
- [ ] 5.4 Build audit trail for every sandbox execution
- [ ] 5.5 Build self-evolving skill monitor (success/fail tracking)
- [ ] 5.6 Set up agent health monitoring (Prometheus + Grafana)

---

## Appendix: Docker Quickstart Commands

```bash
# Deploy everything
docker compose -f docker-compose.yml \
  -f docker-compose.siem.yml \
  -f docker-compose.ir.yml \
  -f docker-compose.knowledge.yml \
  up -d

# Deploy core only
docker compose -f docker-compose.yml up -d

# Deploy core + SIEM
docker compose -f docker-compose.yml -f docker-compose.siem.yml up -d

# Deploy single profile
docker compose -f docker-compose.knowledge.yml up -d

# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View logs per service
docker logs <service-name> --tail 50 -f

# Resource usage
docker stats --no-stream $(docker ps -q)
```

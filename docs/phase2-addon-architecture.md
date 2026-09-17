# Phase 2 Addon Architecture & Open Source Tool Evaluation

**Date:** 2026-06-23  
**Status:** Design Document  
**Scope:** Addon system architecture for Phase 2 features + open source tool recommendations

---

## 1. Current Addon System Summary

The addon system lives at `packages/addons/` and provides:

| Component | File | Purpose |
|---|---|---|
| Registry | `registry.ts` | `AddonManifest` definitions (id, slug, name, price, category, tools, uiSlots, permissions) |
| Router | `router.ts` | tRPC marketplace: list, subscribe, trial, cancel, settings, run-now, run-history |
| Executor | `runtime/executor.ts` | Orchestrates addon runs — validates subscription, calls handler, logs results |
| Findings Pusher | `runtime/pusher.ts` | Normalizes scanner output into core DB tables (risks, evidence, assets) |
| Webhook Handler | `runtime/webhook-handler.ts` | Receives BYO tool output from client-managed infra |
| Scheduler | `scheduler.ts` | Cron-based scheduling (daily/weekly/monthly) with 5-min check interval |
| Schema | `shared/schema.ts` | `addon_subscriptions` + `addon_run_logs` DB tables |
| Types | `shared/types.ts` | `AddonRunConfig`, `NormalizedFinding`, `RunResult`, `AddonRunHandler` |

**Existing addons:** Cloud Scanner (Prowler), Endpoint SIEM (Wazuh — scaffolded), Dependency Scanner (OSV-Scanner — scaffolded).

**Pattern:** Each addon registers a handler function with the executor. The handler receives per-client `AddonRunConfig` (with settings from `addon_subscriptions.settings`), runs the external tool (via Docker CLI), normalizes findings, and calls `FindingsPusher` to persist results to the core database.

---

## 2. Phase 2 Feature Map

### 2.1 AI Evidence Gap Detection

| Aspect | Detail |
|---|---|
| **Type** | **Addon** — `evidence-gap-detector` |
| **External tools** | LLM provider (OpenAI/DeepSeek/Qwen), existing addon scanners (Prowler, OSV-Scanner, Wazuh) |
| **What it does** | Scheduled checks that compare expected controls (from framework definitions in core) against actual evidence collected by addon scanners + uploaded files. Gaps trigger auto-created evidence requests assigned to responsible parties. |
| **Open source heavy lifter** | **LLM (OpenAI / DeepSeek / Qwen)** via `lib/llm/` — the LLM analyzes control descriptions and existing evidence metadata to identify gaps and suggest remediation steps. No new external scanning tool needed for the gap analysis itself; the gap detector queries core's framework+control+evidence tables. |
| **Addon vs Core split** | **Addon** does the AI analysis and gap identification. **Core** provides the framework definitions, evidence tables, UI for evidence requests, and notification system. |

**How it works:**
1. Scheduler triggers `evidence-gap-detector` addon on a configurable interval (daily/weekly)
2. Addon queries core DB: `SELECT controls, evidence WHERE framework_id = X AND client_id = Y`
3. Calls LLM with prompt: *"Given these N expected controls and these M pieces of collected evidence, identify controls without sufficient evidence and suggest what evidence is needed"*
4. Creates entries in a new `evidence_gaps` table (core schema addition)  
5. For each gap, optionally creates an `evidence_request` record with assignee, due date, suggested evidence type
6. Notifications sent via core's existing notification system

**Addon registry entry:**
```typescript
category: 'ai'  // new category — see Section 3
tools: [{ name: 'LLM Provider', description: 'OpenAI / DeepSeek / Qwen for gap analysis' }]
permissions: ['read:controls', 'read:evidence', 'write:evidence_requests']
```

---

### 2.2 Continuous Compliance Score

| Aspect | Detail |
|---|---|
| **Type** | **Core feature** (not an addon) |
| **External tools** | None directly — reads from core DB |
| **What it does** | Real-time % score: `valid_evidence / required_evidence * 100` per framework. Calculated on-demand for dashboard widgets and API queries. |
| **Open source heavy lifter** | None needed — pure SQL aggregation. PostgreSQL window functions compute the score in real-time. |
| **Why core?** | This is a fundamental GRC metric that every client needs regardless of addon subscriptions. It's conceptually equivalent to the existing risk score or compliance heatmap — a core dashboard calculation. It also feeds into the addon ecosystem (evidence-gap-detector uses the score as input). |

**Implementation sketch:**
- Core server route: `GET /api/compliance-score?frameworkId=X&clientId=Y`
- SQL: `SELECT COUNT(DISTINCT e.control_id)::float / NULLIF(COUNT(DISTINCT c.id), 0) * 100 FROM controls c LEFT JOIN evidence e ON e.control_id = c.id AND e.status = 'valid' WHERE c.framework_id = X AND c.client_id = Y`
- Cached with a short TTL (30s) via React Query on the frontend
- Dashboard widget that shows score per framework with trend over time (stored in a new `compliance_score_snapshots` table for historical charts)
- Optionally pushed to a dashboard widget slot for addon display

---

### 2.3 AI Questionnaire Responder

| Aspect | Detail |
|---|---|
| **Type** | **Addon** — `ai-questionnaire-responder` |
| **External tools** | LLM provider (OpenAI/DeepSeek/Qwen), framework library |
| **What it does** | Auto-fills SIG (Standardized Information Gathering), CAIQ (Consensus Assessments Initiative Questionnaire), and custom vendor risk assessments using AI. Upload a questionnaire → AI reads the questions → answers based on the organization's policies, controls, and evidence in the core DB → produces a draft response for human review. |
| **Open source heavy lifter** | **LLM (OpenAI / DeepSeek / Qwen)** — the LLM maps questionnaire questions to existing control descriptions, evidence summaries, and policy documents. RAG (Retrieval Augmented Generation) retrieves relevant context from the core knowledge base. No new external scanning tool required. |
| **Addon vs Core split** | **Addon** handles the AI orchestration, RAG retrieval, questionnaire parsing, and answer generation. **Core** provides the RAG knowledge base (policy docs, control descriptions, evidence artifacts), the LLM abstraction layer, file upload infrastructure, and the questionnaire management UI. |

**How it works:**
1. User uploads a questionnaire (PDF/Word/CSV) via core's file upload
2. Addon's handler is triggered (manual or webhook)
3. Parser extracts questions (handles SIG, CAIQ, CSV, custom formats)
4. RAG pipeline retrieves relevant context from core's knowledge base
5. LLM generates draft answers with citations to source documents
6. Draft is stored in a `questionnaire_drafts` table (core schema extension)
7. User reviews/edits/approves each answer in the core UI
8. Export to PDF/Word for vendor submission

**New categories needed:**
```typescript
category: 'ai'
tools: [{ name: 'LLM Provider', description: 'OpenAI / DeepSeek / Qwen for answer generation' }]
```

---

### 2.4 Auditor Portal

| Aspect | Detail |
|---|---|
| **Type** | **Core feature** (not an addon) |
| **External tools** | None |
| **What it does** | Generates time-limited read-only access links that auditors can open without a ComplianceOS account. Shows an evidence pack organized by framework/control, with download options. No ability to edit — view-only. |
| **Open source heavy lifter** | None needed — pure application feature. Uses the core auth system, evidence tables, and file storage. |
| **Why core?** | This is a fundamental GRC deliverable — every compliance program needs to share evidence with auditors. It's equivalent to the existing report export functionality. Making it an addon would mean even free-tier clients couldn't share evidence for their own audits. |

**Implementation sketch:**
- New DB table: `auditor_portal_links` (id, client_id, token, expires_at, frameworks[], controls[], created_by, max_access_count, access_count, is_revoked)
- Core page: `/auditor/:token` — read-only evidence browser
- Evidence pack generation: ZIP download with organized directory structure: `SOC2/Control-CC1.1/evidence-2026-01-01.pdf`
- Configurable expiry (7/14/30 days) and access count limits
- Revocation at any time
- Audit trail of who accessed what when

---

## 3. Addon System Gaps

The current addon system needs the following extensions to support Phase 2:

### 3.1 New Addon Categories

The `category` field in `AddonManifest` currently supports: `'scanner' | 'siem' | 'dependency' | 'phishing' | 'ztna' | 'password'`

**Add:** `'ai'` — for AI-powered addons that use LLM providers rather than external scanning tools.

**Also add (for future):** `'compliance'` — for compliance-specific tools (OpenSCAP, OPA/Conftest).

### 3.2 UI Slots for Phase 2

Current slots: `addon:dashboard`, `addon:settings`, `sidebar:addons`

**New slots needed:**

| Slot | Purpose | Used by |
|---|---|---|
| `compliance:dashboard` | Continuous compliance score widget | Core + all addons |
| `compliance:evidence` | Evidence gap UI in the compliance section | evidence-gap-detector addon |
| `compliance:questionnaire` | Questionnaire responder UI | ai-questionnaire-responder addon |
| `admin:addons` | Admin panel for addon management | Addon system core |

### 3.3 New Permissions

Current permissions: `read:risks`, `write:evidence`, `read:clients`, `read:incidents`, `write:incidents`, `read:assets`

**New permissions for Phase 2 addons:**

| Permission | Purpose | Addon |
|---|---|---|
| `read:controls` | Read framework controls for gap analysis | evidence-gap-detector |
| `write:evidence_requests` | Create evidence request tasks | evidence-gap-detector |
| `read:policies` | Read policy documents for RAG | ai-questionnaire-responder |
| `read:knowledge_base` | Read knowledge base for RAG | ai-questionnaire-responder |
| `write:questionnaire_drafts` | Write auto-fill drafts | ai-questionnaire-responder |

### 3.4 Schema Additions

The following new DB tables are needed in the core schema (not in the addon schema):

- `evidence_gaps` — detected gaps from evidence-gap-detector addon
- `evidence_requests` — assigned tasks to fill gaps
- `compliance_score_snapshots` — historical score data for charts
- `questionnaire_drafts` — AI-generated draft answers
- `auditor_portal_links` — time-limited read-only access links
- `auditor_portal_access_logs` — audit trail for auditor access

### 3.5 Executor Enhancements

The `AddonExecutor` currently only supports synchronous CLI tools via Docker. For Phase 2 AI addons:

- **Async support for long-running AI operations** — LLM calls can take 30-60s. The executor should handle polling/streaming.
- **Streaming results** — AI questionnaire responder should be able to stream partial results (answers as they're generated) rather than waiting for the full LLM response.
- **Settings schema validation** — Each addon should declare a Zod schema for its settings, not just JSON blobs. This enables form generation in the UI.

---

## 4. Open Source Tool Evaluation

### 4.1 OpenSCAP (openscap.org)

| Aspect | Assessment |
|---|---|
| **Purpose** | Automated compliance scanning of OS/network configurations against SCAP benchmarks (DISA STIG, CIS, PCI DSS, etc.) |
| **Maturity** | Very mature — used by US federal government since 2010 |
| **Integration model** | CLI tool (`oscap`), produces OVAL/ARF XML results. Best run via Docker. |
| **For Phase 2** | **Recommended for a future addon** — `os-config-scanner`. Scans server OS configurations against CIS/DISA benchmarks. Different from Prowler (cloud config) — this is OS-level. |
| **Effort** | Medium. Need to parse ARF XML and normalize to `NormalizedFinding`. SCAP 1.3 content is verbose. |
| **Verdict** | ✅ **Use for OS-level compliance scanning addon** (not Phase 2 — Phase 3 candidate) |

### 4.2 ComplianceAsCode (github.com/ComplianceAsCode/content)

| Aspect | Assessment |
|---|---|
| **Purpose** | SCAP content generation — 1,600+ security policies for Red Hat, Ubuntu, SUSE, etc. |
| **Maturity** | Very mature — upstream for RHEL's SCAP Security Guide |
| **Integration model** | Ships SCAP content files (XCCDF + OVAL) consumed by OpenSCAP, Ansible, or Puppet |
| **For Phase 2** | **Not directly needed.** ComplianceAsCode is content, not a scanner. If we build an OpenSCAP addon (Phase 3), ComplianceAsCode content would be bundled with it. |
| **Verdict** | ⏸ **Hold for Phase 3** — includes when building the OpenSCAP addon |

### 4.3 OSV-Scanner (github.com/google/osv-scanner)

| Aspect | Assessment |
|---|---|
| **Purpose** | Dependency vulnerability scanning against OSV.dev database |
| **Maturity** | Google-backed, production-grade |
| **Status** | ✅ **Already scaffolded** as `dep-scanner` addon. `packages/addons/src/osv-scanner/` exists (empty). |
| **For Phase 2** | Complete the implementation — connector + normalizer + runner, following the Prowler pattern. |
| **Verdict** | ✅ **Continue implementation** — low effort, high value for supply chain evidence |

### 4.4 Prowler (github.com/prowler-cloud/prowler)

| Aspect | Assessment |
|---|---|
| **Purpose** | Cloud security scanning (AWS, Azure, GCP) — 2,000+ checks |
| **Maturity** | Very mature, industry standard |
| **Status** | ✅ **Already implemented** as `cloud-scanner` addon. Full connector, normalizer, and Docker runner exist. |
| **For Phase 2** | Already active. Prowler findings feed into evidence gap detection and compliance score calculations. |
| **Verdict** | ✅ **Integration point** — evidence-gap-detector reads Prowler evidence from core DB |

### 4.5 OpenAI / DeepSeek / Qwen (LLM Providers)

| Aspect | Assessment |
|---|---|
| **Purpose** | AI-powered analysis: gap detection, questionnaire auto-fill, natural language queries |
| **Maturity** | All production-grade; DeepSeek and Qwen are open-weight alternatives |
| **Status** | Referenced in architecture docs but `lib/llm/` does not yet exist in code |
| **For Phase 2** | **Critical dependency** for both evidence-gap-detector and ai-questionnaire-responder addons |
| **Implementation** | Create `lib/llm/provider.ts` abstraction with unified interface. Support OpenAI, DeepSeek, and Qwen behind a configurable provider. |
| **RAG support** | The questionnaire responder needs RAG — store policy/control embeddings in pgvector and retrieve relevant context before LLM calls |
| **Verdict** | ✅ **Required** — build `lib/llm/` as a core module. Both Phase 2 AI addons depend on it. |

### 4.6 Wazuh (github.com/wazuh/wazuh)

| Aspect | Assessment |
|---|---|
| **Purpose** | Open-source SIEM/XDR: FIM, log analysis, vulnerability detection, compliance monitoring |
| **Maturity** | Very mature — 20M+ downloads, OSSEC fork |
| **Status** | ⏸ **Scaffolded** as `endpoint-siem` addon. `packages/addons/src/wazuh/` exists (empty). |
| **For Phase 2** | Wazuh's **File Integrity Monitoring** (FIM) capability is directly relevant to evidence collection — it can watch critical system files and record changes as evidence artifacts. This feeds the evidence-gap-detector addon. |
| **Verdict** | ✅ **Continue implementation.** FIM evidence from Wazuh feeds directly into the evidence gap detection pipeline. Recommended for Phase 2+ as an evidence source. |

### 4.7 OPA / Conftest (openpolicyagent.org, conftest.dev)

| Aspect | Assessment |
|---|---|
| **Purpose** | Policy-as-code — write compliance rules in Rego, test Kubernetes configs, Terraform plans, JSON/YAML documents |
| **Maturity** | Mature — CNCF graduated, used by Netflix, Pinterest, etc. |
| **Integration model** | CLI (`opa eval`, `conftest test`) or Go library. Policies written in Rego. |
| **For Phase 2** | **Recommended for a future addon** — `policy-as-code` addon. Clients define compliance policies in Rego (e.g., "all S3 buckets must have encryption enabled") and Conftest tests their infrastructure configs against them. Results push to compliance evidence. |
| **Effort** | Medium. Need to build a policy authoring UI + Conftest runner. |
| **Verdict** | ✅ **Recommended for Phase 3** — excellent for infrastructure-as-code compliance. Not critical for Phase 2. |

---

## 5. Tool Summary Table

| Tool | Phase 2 Use | Status | Priority |
|---|---|---|---|
| **Prowler** | Evidence source for gap detection | ✅ Implemented | High |
| **OSV-Scanner** | Dependency evidence for gap detection | 🏗 Scaffolded | High |
| **Wazuh** | FIM evidence for gap detection | 🏗 Scaffolded | Medium |
| **OpenAI / DeepSeek / Qwen** | LLM for AI addons (gap detect + questionnaire) | ❌ Not built (needs `lib/llm/`) | **Critical** |
| **OpenSCAP** | OS-level compliance scanning | ❌ Not built | Low (Phase 3) |
| **ComplianceAsCode** | SCAP content for OpenSCAP | ❌ Not built | Low (Phase 3) |
| **OPA / Conftest** | Policy-as-code compliance | ❌ Not built | Low (Phase 3) |

---

## 6. Architecture: Addon + Core Pattern

```
┌─────────────────────────────────────────────────────────┐
│                      ComplianceOS Core                    │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Frameworks &  │  │ Evidence &   │  │  Dashboard UI   │ │
│  │ Controls DB   │  │ Requests DB  │  │  + Score Widget │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                 │                    │          │
│  ┌──────┴───────┐  ┌──────┴───────┐           │          │
│  │ LLM Provider  │  │ File Storage │           │          │
│  │ (lib/llm/)    │  │ + RAG (pgvec)│           │          │
│  └──────┬───────┘  └──────────────┘           │          │
│         │                                     │          │
├─────────┼─────────────────────────────────────┼──────────┤
│         │            Addon System              │          │
│  ┌──────┴─────────────────────────────────┐   │          │
│  │         Addon Executor                   │   │          │
│  │  ┌──────────────────┬────────────────┐   │   │          │
│  │  │ evidence-gap-    │ ai-questionnaire│   │   │          │
│  │  │ detector addon   │ responder addon │   │   │          │
│  │  │                  │                │   │   │          │
│  │  │ • Queries core   │ • Parses       │   │   │          │
│  │  │   controls + ev. │   questionnaire│   │   │          │
│  │  │ • Calls LLM for  │ • RAG retrieves│   │   │          │
│  │  │   gap analysis   │   context      │   │   │          │
│  │  │ • Creates        │ • LLM generates│   │   │          │
│  │  │   evidence_gaps  │   draft answers│   │   │          │
│  │  └──────────────────┴────────────────┘   │   │          │
│  └───────────────────────────────────────────┘   │          │
│                                                   │          │
│  External Scanning Addons (existing):              │          │
│  ┌──────────┬──────────┬──────────┐               │          │
│  │ Prowler   │  Wazuh   │ OSV-    │               │          │
│  │ (cloud)   │  (SIEM)  │ Scanner │               │          │
│  │           │          │ (deps)  │               │          │
│  └──────────┴──────────┴──────────┘               │          │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Addons do the scanning/analysis — core provides the UI/DB/persistence.

| Layer | Responsibility | Owned by |
|---|---|---|
| **Scanning/Analysis** | Run external tool CLI, normalize output | Addon |
| **Findings Persistence** | Write NormalizedFindings to risks/evidence tables | Addon (via FindingsPusher) |
| **Schema Extensions** | Core DB tables for addon-specific data | Core (+ addon migrations) |
| **Dashboard Widgets** | UI components mounted in uiSlots | Addon |
| **LLM Abstraction** | Unified interface for OpenAI/DeepSeek/Qwen | Core (`lib/llm/`) |
| **Continuous Score** | SQL aggregation, API endpoint, widget | Core |
| **Auditor Portal** | Token auth, evidence pack, read-only UI | Core |
| **Addon Marketplace** | Subscription management, billing, scheduler | Addon System |

---

## 7. Recommendations

### Build as Addons
1. **evidence-gap-detector** — `category: 'ai'`, uses LLM provider, scheduled scans compare controls vs evidence
2. **ai-questionnaire-responder** — `category: 'ai'`, uses LLM + RAG, manual trigger

### Build as Core Features
3. **Continuous Compliance Score** — SQL-based, real-time, core dashboard widget
4. **Auditor Portal** — Token-based read-only access, evidence pack export, core auth

### Core Prerequisites (build first)
5. **`lib/llm/` module** — Unified LLM provider abstraction (OpenAI, DeepSeek, Qwen) with configurable model, temperature, streaming. This is the critical dependency for both AI addons.
6. **pgvector RAG pipeline** — Embeddings for policy documents, control descriptions, and evidence artifacts. Required by ai-questionnaire-responder for context retrieval.

### Addon System Extensions
7. **New category:** `'ai'` in `AddonManifest.category`
8. **New permissions:** `read:controls`, `write:evidence_requests`, `read:policies`, `read:knowledge_base`, `write:questionnaire_drafts`
9. **New UI slots:** `compliance:dashboard`, `compliance:evidence`, `compliance:questionnaire`, `admin:addons`
10. **Core schema additions:** `evidence_gaps`, `evidence_requests`, `compliance_score_snapshots`, `questionnaire_drafts`, `auditor_portal_links`
11. **Streaming executor support** — Enable addons to stream partial results (needed for questionnaire responder)

---

## Appendix: Implementation Order

| Step | What | Depends on | Effort |
|---|---|---|---|
| 1 | Build `lib/llm/` provider abstraction | Nothing | 2-3 days |
| 2 | Add core schema tables (evidence_gaps, etc.) | Drizzle migrations | 1-2 days |
| 3 | Build Continuous Compliance Score (core) | Schema additions | 2-3 days |
| 4 | Build evidence-gap-detector addon | `lib/llm/`, schema, score | 4-5 days |
| 5 | Build Auditor Portal (core) | Schema, evidence system | 3-4 days |
| 6 | Build RAG pipeline (pgvector) | `lib/llm/`, knowledge base | 3-4 days |
| 7 | Build ai-questionnaire-responder addon | `lib/llm/`, RAG, schema | 5-7 days |
| 8 | Addon system extensions (categories, permissions, slots) | Nothing | 1-2 days |

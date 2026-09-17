# ComplianceOS Unified Memory Cortex (VFS + Vector Engine) — User & Administrator Guide

The **ComplianceOS Unified Memory Cortex** provides a native, hierarchical Virtual Filesystem (`memory://`) and persistent memory engine for your entire AI fleet. It organizes your company’s IT infrastructure, security configurations, policies, third-party vendor intelligence, and learned facts into a structured, unified knowledge base running 100% natively inside PostgreSQL.

---

## 📑 Table of Contents

1. [Overview & Key Capabilities](#1-overview--key-capabilities)
2. [Hierarchical VFS Architecture (`memory://`)](#2-hierarchical-vfs-architecture-memory)
3. [The 3 Depth Tiers (Token Optimization)](#3-the-3-depth-tiers-token-optimization)
4. [Using the Memory Center UI](#4-using-the-memory-center-ui)
5. [Adaptive Fact Extraction (Mem0 Pattern)](#5-adaptive-fact-extraction-mem0-pattern)
6. [Web & Regulatory Intelligence Ingestion](#6-web--regulatory-intelligence-ingestion)
7. [How the 10 AI Teammates Use Memory](#7-how-the-10-ai-teammates-use-memory)
8. [Data Sovereignty, Air-Gap & Security](#8-data-sovereignty-air-gap--security)
9. [API & AI Tool Reference](#9-api--ai-tool-reference)

---

## 1. Overview & Key Capabilities

Traditional Retrieval-Augmented Generation (RAG) splits text into flat, unstructured chunks, leading to hallucination and context loss. **Compliance Cortex** treats your organization's entire knowledge base as an organized computer filesystem.

### Key Benefits:
* **Single Source of Truth:** Enter your AWS, Azure, Okta, or policy configurations once. All 10 AI teammates access the same unified specifications.
* **Autonomous Learning:** AI bots automatically detect and record atomic facts from daily chats, meetings, and audit notes.
* **Token Preservation:** Compact L0 summaries reduce prompt token overhead by ~85% while preserving instant searchability.
* **Zero External Dependencies:** Runs 100% natively in PostgreSQL (`company_memory_nodes` and `company_memory_relations`). No external vector DBs, Python microservices, or Neo4j containers required.
* **Air-Gapped & Sovereign:** Backed up atomically with your standard `pg_dump` and fully compliant with on-premise air-gap requirements.

---

## 2. Hierarchical VFS Architecture (`memory://`)

The Virtual Filesystem is partitioned into standard enterprise directories:

```
memory:///
├── 🏢 company/              # Organization identity, headcount, jurisdictions, DPO, legal entities
│   ├── profile.md
│   └── legal_entities.md
├── ☁️ infrastructure/       # Cloud environments, Kubernetes, DBs, SSO, networks, CI/CD
│   ├── aws_production.md
│   ├── gcp_analytics.md
│   └── identity_okta.md
├── 📜 policies/             # Information security, access control, data retention, incident response
│   ├── soc2_access.md
│   ├── iso27001_isms.md
│   └── gdpr_retention.md
├── 💼 vendors/              # Third-party subprocessors, TPRM risk tiers, SOC 2 reports
│   ├── stripe_payments.md
│   ├── datadog_monitoring.md
│   └── aws_hosting.md
├── 💡 facts/                # Continuously learned atomic propositions extracted from team chats
│   └── learned_snowflake_migration.md
└── 🌐 intel/                # Ingested regulatory standards, NIST publications, CVE advisories
    ├── regulations/nist_sp_800_53.md
    └── threats/cve_2026_advisories.md
```

---

## 3. The 3 Depth Tiers (Token Optimization)

To maintain high performance and low token consumption, every VFS node supports three layers of depth:

| Tier | Name | Description | Where It Is Used |
| :--- | :--- | :--- | :--- |
| **L0** | **Compact Summary** | ~150 to 220 character high-density synopsis. | Injected into top-level prompt context for immediate discovery without token waste. |
| **L1** | **Entity Graph Relations** | Directional links (`depends_on`, `stores_data`, `mitigates`, `subject_to`). | Allows multi-hop graph queries across assets, regulations, and policies. |
| **L2** | **Full Technical Spec** | Full Markdown, Terraform code, YAML specs, or policy text. | Loaded dynamically by an agent when deep auditing or drafting is required. |

---

## 4. Using the Memory Center UI

Navigate to `/agent` and click the **"Memory Cortex (VFS)"** tab in the top navigation bar.

### Visual Walkthrough:
1. **Left Rail (VFS Explorer):**
   * Expand/collapse folders to explore `/company`, `/infrastructure`, `/policies`, `/vendors`, `/facts`, and `/intel`.
   * Use the search bar to filter by file path or keyword.
   * Click **"+ New VFS Node"** to add a new document or folder.
2. **Right Rail (Editor & Preview):**
   * **Markdown Preview Tab:** Displays rendered documentation with headers, bullet points, and code blocks.
   * **Raw Spec Editor Tab:** Modify the full L2 content and L0 summary with instant saving.
   * **Entity Relations Tab:** View incoming and outgoing graph connections to other corporate assets.

---

## 5. Adaptive Fact Extraction (Mem0 Pattern)

When interacting in the War Room or adding unstructured notes, the engine automatically extracts atomic propositions.

### How to use manually:
1. In the Memory Center, click **"🧠 Extract Facts"**.
2. Paste raw notes, meeting minutes, or Slack announcements:
   > *"We deployed Amazon OpenSearch in us-east-1 for log analytics. All clusters use KMS encryption and Okta SSO."*
3. Click **"Extract & Save to /facts"**.
4. The engine analyzes the text, derives atomic propositions, and persists them under `/facts/` with automatic timestamps.

---

## 6. Web & Regulatory Intelligence Ingestion

Ingest external standards, cloud advisories, or compliance bulletins with 1 click:

1. Click **"🌐 Ingest Web & Intel"** in the top-right toolbar.
2. Provide:
   * **URL:** `https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final`
   * **Title:** `NIST SP 800-53 Rev. 5 Cryptographic Baseline`
   * **Category:** `regulations` (or `threats`, `cloud_advisories`)
   * **Frameworks:** `NIST SP 800-53`, `FedRAMP High`
   * **Content:** Paste article content or key clauses.
3. Click **"Ingest & Save to /intel"**.
4. All agents immediately reference this document during audits.

---

## 7. How the 10 AI Teammates Use Memory

All 10 specialized bots have direct access to the VFS tools:

| Teammate | Focus Area | Memory Workflow |
| :--- | :--- | :--- |
| **Hermes** | Autonomous Orchestrator | Navigates `/company` and dispatches sub-tasks based on organizational scope. |
| **Marcus** | Risk & Governance | Reads `/infrastructure` to calculate Quantitative Risk (FAIR ALE) against real assets. |
| **Morgan** | Cloud & DevOps | Reads `/infrastructure/aws_production.md` and generates Terraform/Kubernetes controls. |
| **Alex** | Auditor & Evidence | Gathers evidence mapped directly to `/policies` and `/infrastructure` specs. |
| **Riley** | SecOps & Vulns | Cross-references CVE alerts with installed packages in `/infrastructure`. |
| **Nova** | Incident Commander | Checks `/intel/threats` and runs playbooks aligned with company disaster recovery specs. |
| **Sasha** | Identity & Access | Audits `/infrastructure/identity_okta.md` for MFA and role-based access enforcement. |
| **Tara** | Governance & ISMS | Maintains master policies in `/policies` aligned with ISO 27001 / SOC 2 / NIS2. |
| **Elena** | Privacy & GDPR | Maps ROPA data flows against database nodes in `/infrastructure` and sub-processors in `/vendors`. |
| **Sam** | Compliance Copilot | Answers ad-hoc compliance questions using hybrid search over all `/facts` and specs. |

---

## 8. Data Sovereignty, Air-Gap & Security

* **100% On-Premise / Self-Hosted:** Data never leaves your PostgreSQL instance.
* **Encrypted at Rest:** Integrates with database-level encryption (TDE) and client isolation keys.
* **Unified Backups:** Backing up your PostgreSQL database automatically protects all VFS files, relations, and learned facts.

---

## 9. API & AI Tool Reference

### Backend tRPC Procedures (`memory.*`):
* `memory.getTree({ rootPath?: string })`: Fetches full recursive nested VFS tree.
* `memory.listDirectory({ path: string })`: Lists immediate directory children with L0 summaries.
* `memory.getNode({ path: string })`: Retrieves node document and linked entity relations.
* `memory.writeNode({ path, title, nodeType?, contentL2?, summaryL0?, metadata? })`: Writes or updates a node.
* `memory.deleteNode({ path: string })`: Recursively deletes node and children.
* `memory.search({ query: string, pathPrefix?, nodeType?, limit? })`: Hybrid keyword and path search.
* `memory.extractFacts({ text: string, source? })`: Extracts atomic facts and saves to `/facts/`.
* `memory.ingestWeb({ url, title, content, summary?, frameworks?, category? })`: Ingests external web data to `/intel/`.

### AI Agent Tools:
* `memory_list_directory({ path: string })`
* `memory_read_document({ path: string })`
* `memory_search({ query: string })`
* `memory_store_fact({ path: string, title: string, fact: string })`

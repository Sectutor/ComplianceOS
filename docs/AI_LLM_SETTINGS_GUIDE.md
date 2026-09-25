# AI & LLM Settings — Complete Guide

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Settings](#accessing-the-settings)
3. [Tab 1: LLM Providers](#tab-1-llm-providers)
4. [Tab 2: Local GRC Models & Hardware Guide](#tab-2-local-grc-models--hardware-guide)
5. [Tab 3: Dynamic Routing](#tab-3-dynamic-routing)
6. [Tab 4: Data & Indexing](#tab-4-data--indexing)
7. [Tab 5: AI Privacy & Features](#tab-5-ai-privacy--features)
8. [Configuration Recipes](#configuration-recipes)
9. [Troubleshooting](#troubleshooting)
10. [Security & Compliance](#security--compliance)

---

## Overview

The **AI & LLM Settings** page is the central control hub for all artificial intelligence capabilities in ComplianceOS. It is organized into five tabs:

| Tab | Purpose | Audience |
|-----|---------|----------|
| **LLM Providers** | Add and manage AI model providers (OpenAI, Anthropic, Gemini, JevAI, etc.) | Admins |
| **Local GRC Models** | Discover and configure local/self-hosted LLM runtimes | Admins |
| **Dynamic Routing** | Route specific features to specific AI providers | Admins |
| **Data & Indexing** | Manage knowledge base embeddings and reindexing | Admins |
| **AI Privacy & Features** | Control external AI data sharing and enable 12 AI-powered features | Admins |

### Architecture at a Glance

```
                        ┌─────────────────────────────┐
                        │   AI & LLM Settings Page     │
                        │   (/admin/llm)              │
                        └──────────────┬──────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
   ┌──────────────┐          ┌──────────────┐          ┌──────────────────┐
   │  LLM Provider │          │   Dynamic    │          │  AI Privacy &    │
   │  Configuration│          │   Router     │          │  Features        │
   │  (4 tabs)     │          │              │          │  (new)           │
   └──────┬───────┘          └──────┬───────┘          └────────┬─────────┘
          │                         │                           │
          ▼                         ▼                           ▼
   ┌──────────────┐          ┌──────────────┐          ┌──────────────────┐
   │  LLMService   │          │  Feature →   │          │  Privacy         │
   │  (Multi-      │          │  Provider    │          │  Gatekeeper      │
   │   Provider)   │          │  Mapping     │          │                  │
   └──────┬───────┘          └──────┬───────┘          └────────┬─────────┘
          │                         │                           │
          └─────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  12 AI Features  │
                          │  (evidence, gaps,│
                          │   vendors, etc.) │
                          └──────────────────┘
```

---

## Accessing the Settings

Navigate to: **Settings → AI & LLM** or go directly to `/admin/llm`

**Requirements:**
- Admin, Owner, or Super Admin role
- Multi-factor authentication (MFA) enabled for admin accounts
- Premium/Enterprise subscription (for external AI features)

---

## Tab 1: LLM Providers

This tab manages the AI model providers that power all text generation in ComplianceOS (policy drafting, risk analysis, agent responses, etc.).

### Adding a Provider

1. Click **"Add Provider"**
2. Fill in the form:
   - **Name**: A friendly label (e.g., "Company OpenAI", "Dev Anthropic")
   - **Provider Type**: Select from the dropdown:
     - `openai` — OpenAI GPT-4, GPT-4o, GPT-3.5-turbo
     - `anthropic` — Anthropic Claude 3.5 Sonnet, Claude 3 Opus
     - `gemini` — Google Gemini Pro, Gemini Ultra
     - `deepseek` — DeepSeek Chat, DeepSeek Coder
     - `openrouter` — OpenRouter (aggregates 100+ models)
     - `ollama` — Local Ollama runtime
     - `custom` — Any OpenAI-compatible API
   - **Model**: The specific model ID (e.g., `gpt-4o`, `claude-3-5-sonnet-20241022`)
   - **API Key**: Your provider API key (encrypted at rest)
   - **Base URL**: Optional — for custom endpoints or proxies
   - **Priority**: Higher number = higher priority (100 > 50 > 0)
3. Click **"Create Provider"**

### Testing a Provider

After adding, click the **"Test"** button next to any provider to verify connectivity. The system sends a minimal test prompt and confirms the response.

### Provider Priority & Failover

Providers are tried in priority order (highest first). If the highest-priority provider fails (rate limit, timeout, invalid key), the system automatically falls back to the next provider. This gives you:

- **Cost optimization**: Set cheap models as high priority, expensive as backup
- **Redundancy**: If OpenAI rate-limits, fall back to Anthropic
- **Regional compliance**: Use EU-based providers as primary, US as backup

### Editing & Deleting

- Click **Edit** to modify any provider (name, key, priority, model)
- Click **Delete** to permanently remove a provider (requires confirmation)

---

## Tab 2: Local GRC Models & Hardware Guide

This tab helps you discover and configure **local LLM runtimes** that run on your own hardware — no data ever leaves your infrastructure.

### Supported Local Runtimes

| Runtime | Description | Best For |
|---------|-------------|----------|
| **Ollama** | Easy-to-use local LLM runner | Developers, small teams |
| **LM Studio** | GUI-based local LLM manager | Non-technical users |
| **vLLM** | High-performance inference server | Production deployments |
| **LocalAI** | OpenAI-compatible local API | Drop-in replacement |

### Hardware Requirements

The tab provides a **hardware compatibility guide**:

| Tier | Hardware | Models Supported | Cost |
|------|----------|-----------------|------|
| **Workstation** | 16GB RAM, 4-core CPU | 7B-8B parameter models | $0 (use existing) |
| **Pro Workstation** | 32GB RAM, 8-core CPU | 13B-34B parameter models | ~$500-1500 |
| **Enterprise GPU** | 64GB+ RAM, RTX 4090/A100 | 70B+ parameter models | ~$3000-8000 |

### Auto-Discovery

Click **"Scan Local Runtimes"** to automatically detect:
- Running Ollama instances (checks `localhost:11434`)
- Running LM Studio instances (checks `localhost:1234`)
- Running vLLM instances (checks `localhost:8000`)

You can also specify **custom URLs** for non-standard configurations.

---

## Tab 3: Dynamic Routing

Dynamic Routing lets you assign specific AI features to specific providers. This gives you fine-grained control over cost, performance, and data residency.

### How It Works

Each AI feature in ComplianceOS (policy drafting, risk analysis, etc.) can be routed to a different provider:

| Feature | Description | Recommended Provider |
|---------|-------------|---------------------|
| `general_advisor` | General chat and Q&A | Cheap model (GPT-4o-mini, Claude Haiku) |
| `risk_analysis` | Risk scoring and triage | Accurate model (GPT-4o, Claude Sonnet) |
| `policy_generation` | Policy drafting and tailoring | Long-context model (Claude Sonnet, GPT-4o) |
| `tech_suggestion` | Control/tool recommendations | Any capable model |
| `implementation_plan` | Step-by-step planning | Accurate model |
| `explain_mapping` | Regulation mapping explanation | Any capable model |
| `vendor_mitigation` | Vendor risk remediation plans | Accurate model |

### Creating a Route

1. Select a **feature** from the dropdown
2. Select a **provider** from your configured providers
3. Click **"Save Route"**

The system will now use that specific provider for that feature, falling back to the default priority order only if the routed provider fails.

### Example Routing Strategy

```
General Q&A → OpenRouter (free model)     ← Cheapest for simple questions
Policy Gen  → Anthropic Claude Sonnet     ← Best for long structured docs
Risk Analysis → OpenAI GPT-4o             ← Best for accurate scoring
Everything else → (default priority)      ← Fallback chain
```

---

## Tab 4: Data & Indexing

This tab manages the **knowledge base embeddings** that power semantic search, policy matching, and AI context retrieval.

### What Gets Indexed

- **Policies** — All published policy documents
- **Evidence** — Evidence titles, descriptions, and metadata
- **Controls** — Control descriptions and framework mappings
- **Knowledge Articles** — Internal documentation and guides

### Indexing Actions

| Action | What It Does | When to Use |
|--------|-------------|-------------|
| **Re-index Policies** | Re-embeds all policy documents | After adding/editing policies |
| **Re-index Evidence** | Re-embeds all evidence records | After bulk evidence upload |
| **Re-index All** | Full re-index of everything | Major data changes, after migration |

### Index Status

The panel shows:
- **Last Run**: When the last index job completed
- **Policies Indexed**: Number of policy embeddings
- **Evidence Indexed**: Number of evidence embeddings
- **Errors**: Any items that failed to embed

### Provider Selection for Indexing

Indexing uses your configured providers. For embedding models, you need a provider that supports embeddings (e.g., OpenAI `text-embedding-3-small`). Enable the **"Supports Embeddings"** flag when adding such providers.

---

## Tab 5: AI Privacy & Features

This is the new tab that controls **external AI data sharing** and enables **12 AI-powered compliance features**.

### Master Controls

#### External AI (Master Switch)
- **OFF (default)**: No data leaves your instance. All AI features use deterministic local processing.
- **ON**: External AI providers can process your data according to the per-feature toggles and data scope settings.

#### Dry-Run Mode
- **ON (default)**: AI calls are logged to the audit log but NOT actually sent. Use this to verify what data would be shared before enabling live calls.
- **OFF**: AI calls are sent to external providers for real.

#### Data Scope

| Level | What's Sent | Use Case |
|-------|------------|----------|
| `metadata_only` | Data structure only (field names, types, lengths) — no content | Maximum privacy, still gets classification/routing |
| `anonymized` | Content with PII stripped (emails → `[EMAIL]`, names → `[ANON]`, domains → `[ANON]`) | Recommended default — balances power and privacy |
| `full` | Complete data including all content | Maximum AI accuracy, requires trust in provider |

#### Provider Permissions

| Provider | Data Leaves Instance? | Notes |
|----------|----------------------|-------|
| **Local LLM** (Ollama, LMStudio) | ❌ Never | Always safe to enable |
| **JevAI** (TypeSafe AI) | ✅ Yes | Cloud AI for classification, routing, scoring, extraction |
| **Cloud LLM** (OpenAI, Anthropic, Gemini) | ✅ Yes | Cloud AI for text generation |

### The 12 AI Features

#### 1. Evidence Classifier
**Modes:** Classifier + Scorer
**Input:** Uploaded evidence (screenshots, reports, configs)
**Output:** Control + framework mappings with confidence scores, sufficiency rating, freshness status

*Without this:* Manual tagging of evidence to controls
*With this:* Upload evidence → instant classification across all frameworks

#### 2. Gap Prioritizer
**Modes:** Router + Scorer
**Input:** All open compliance gaps (controls missing evidence)
**Output:** Prioritized remediation queue, cross-framework impact analysis, effort estimates

*Without this:* Static gap list, manual prioritization
*With this:* "Close these 3 gaps first — they unlock 40% of your SOC 2 readiness"

#### 3. Vendor Risk Scorer
**Modes:** Classifier + Scorer + Extractor
**Input:** Vendor security documents (SOC 2 reports, questionnaires)
**Output:** Risk tier, key findings, control exceptions, recommended review frequency

*Without this:* Manual SOC 2 report reading (2-4 hours per vendor)
*With this:* Instant vendor risk assessment from uploaded documents

#### 4. Incident Triage
**Modes:** Classifier + Router
**Input:** Incident reports
**Output:** Incident classification, severity scoring, regulatory deadline checklist, response workflow routing

*Without this:* Manual incident classification, missed regulatory deadlines
*With this:* Auto-classified incidents with countdown timers for GDPR 72h, NIS2 24h, etc.

#### 5. DSAR Classifier
**Modes:** Classifier + Router
**Input:** Data Subject Access Requests
**Output:** Request type classification, relevant processing activities from ROPA, SLA risk assessment

*Without this:* Manual DSAR processing, missed 30-day GDPR deadlines
*With this:* Auto-routed DSARs with data source mapping and deadline tracking

#### 6. Policy Extractor
**Modes:** Extractor + Scorer
**Input:** Regulation text (paste or upload)
**Output:** Extracted obligations, control category mapping, suggested policy clauses, coverage scoring

*Without this:* Manual obligation extraction from regulation text (hours per regulation)
*With this:* Paste regulation text → instant obligation list with policy clause suggestions

#### 7. Control Mapper
**Modes:** Router
**Input:** Two frameworks (source + target)
**Output:** Equivalent control mappings, coverage inheritance percentage, unique controls per framework

*Without this:* Manual cross-framework mapping (error-prone, time-consuming)
*With this:* "Your SOC 2 controls satisfy 63% of PCI DSS v4.0"

#### 8. Audit Readiness Scorer
**Modes:** Scorer
**Input:** All compliance data (evidence, policies, controls, red team results)
**Output:** Continuous 0-100 readiness score, days-until-audit prediction, critical gaps list

*Without this:* Binary pass/fail scoring, no prediction
*With this:* "At current pace, audit-ready in 6 weeks. Close these 2 gaps to cut to 3 weeks."

#### 9. Remediation Orchestrator
**Modes:** Router + Scorer
**Input:** All compliance gaps
**Output:** Auto-generated remediation tasks with assignees, effort estimates, deadlines, and dependencies

*Without this:* Manual task creation from gap lists
*With this:* One-click remediation plan generation with prioritized task queue

#### 10. Regulation Monitor
**Modes:** Extractor + Scorer
**Input:** Regulation URLs to monitor
**Output:** Change detection alerts, impact analysis on controls/policies, required action list

*Without this:* Manual regulation monitoring, missed regulatory changes
*With this:* "NIS2 Article 21 updated — affects 3 of your controls. Here's what changes."

#### 11. Confidence Escalation
**Modes:** Wrapper (applies to all features)
**Input:** Any AI feature output
**Output:** Smart routing based on confidence score:
- High confidence (≥ threshold + 15%) → Auto-execute, no human needed
- Medium confidence (≥ threshold) → Suggest with one-click approve
- Low confidence (< threshold) → Full human review

*Without this:* Every AI output requires human review
*With this:* 80% of clear-cut decisions auto-executed, humans only see edge cases

#### 12. Compliance Query
**Modes:** Router + Extractor
**Input:** Natural language questions
**Output:** Structured answers from live compliance data

*Without this:* Navigate menus, apply filters, export reports to answer questions
*With this:* "Which SOC 2 controls are expiring this quarter?" → instant answer from live data

### Per-Feature Settings

Each feature has:

| Setting | Options | Recommendation |
|---------|---------|----------------|
| **Enable** | ON / OFF | Start OFF, enable after verifying dry-run logs |
| **Data Scope** | metadata_only / anonymized / full | Start with `anonymized`, increase to `full` if needed |
| **Confidence Threshold** | 30-95% | 70% is the sweet spot. Lower = more auto-execution. More = more human review. |

---

## Configuration Recipes

### Recipe 1: Air-Gapped / Maximum Privacy
*For organizations that cannot send any data externally*

```
Master Switch:        OFF (or ON with Local LLM only)
Local LLM:            ENABLED (Ollama with Llama 3 70B)
Cloud LLM:            DISABLED
JevAI:                DISABLED
Dry-Run Mode:         N/A
Data Scope:           N/A
Feature Toggles:      All ON (will use local processing only)
```

**Result:** All AI features work locally. No data leaves your infrastructure. Slightly lower AI quality than cloud models.

### Recipe 2: Balanced / Recommended
*For most organizations — good AI power with strong privacy*

```
Master Switch:        ON
Local LLM:            ENABLED (for general Q&A)
Cloud LLM:            ENABLED (for high-accuracy tasks)
JevAI:                ENABLED (for classification/routing/scoring)
Dry-Run Mode:         ON for first week, then OFF
Data Scope:           anonymized (default)
Confidence Threshold: 70%
Feature Toggles:      Enable gradually, starting with:
                      - Evidence Classifier
                      - Gap Prioritizer
                      - Audit Readiness Scorer
                      - Compliance Query
```

**Result:** Strong AI features with PII protection. Dry-run lets you verify before going live.

### Recipe 3: Full Power / Cloud-First
*For organizations that prioritize AI accuracy and trust their providers*

```
Master Switch:        ON
Local LLM:            Optional (for backup)
Cloud LLM:            ENABLED (GPT-4o + Claude Sonnet)
JevAI:                ENABLED
Dry-Run Mode:         OFF
Data Scope:           full
Confidence Threshold: 80% (higher = more human oversight)
Feature Toggles:      All 12 ON
```

**Result:** Maximum AI accuracy across all features. Full context sent to providers for best results.

### Recipe 4: Evidence-Only
*For organizations that only want AI to process evidence*

```
Master Switch:        ON
JevAI:                ENABLED (classifier mode only)
Dry-Run Mode:         ON
Data Scope:           anonymized
Feature Toggles:      ONLY Evidence Classifier ON
All others:           OFF
```

**Result:** Only evidence is auto-classified. Everything else is manual. Minimal data exposure.

---

## Troubleshooting

### "No LLM provider configured"
**Cause:** No providers exist, or all are disabled/demo keys.
**Fix:** Add a real provider with a valid API key. Test the connection after adding.

### "Provider uses a demo placeholder API key"
**Cause:** The provider was created with a placeholder/demo key.
**Fix:** Edit the provider and replace the key with a real one.

### "Rate limit exceeded" / "Insufficient Balance"
**Cause:** Hit free-tier limits (common with OpenRouter free models).
**Fix:** 
- Add credits to your provider account
- Add a second provider for fallback routing
- Set cheaper models as higher priority

### "All LLM providers failed"
**Cause:** Every provider in the priority chain failed.
**Fix:** Check provider status, add backup providers, verify API keys.

### "Decryption failed: Invalid initialization vector"
**Cause:** API key was encrypted with a different `APP_ENCRYPTION_KEY`.
**Fix:** Re-enter the API key (the encryption key may have changed).

### AI Features tab is blank or shows errors
**Cause:** Component failed to load (missing UI exports, network error).
**Fix:** 
- Hard refresh (`Ctrl+Shift+R`)
- Check browser console for specific errors
- Verify the UI package is built (`npm run build -w @complianceos/ui`)

### Feature toggle changes don't take effect
**Cause:** Cache or settings not refreshed.
**Fix:** The privacy settings cache has a 60-second TTL. Wait 60 seconds or refresh the page.

---

## Security & Compliance

### Data Residency

| Provider Type | Data Stays In Instance? | Data Location |
|--------------|------------------------|---------------|
| Local LLM | ✅ Yes | Your infrastructure |
| JevAI | ❌ No | TypeSafe AI cloud (US) |
| OpenAI | ❌ No | OpenAI cloud (US) |
| Anthropic | ❌ No | Anthropic cloud (US) |
| OpenRouter | ❌ No | Varies by model |

### Audit Trail

Every external AI call is logged to `ai_audit_log` with:
- Timestamp
- Feature that triggered the call
- Provider used
- Data scope applied
- Success/failure status
- Confidence score
- Latency

Admins can view the audit log in the **AI Privacy & Features** tab.

### Encryption

- API keys are encrypted at rest using AES-256-GCM
- Encryption key is derived from `APP_ENCRYPTION_KEY` environment variable
- Data in transit uses TLS 1.3

### Access Control

- Only users with Admin, Owner, or Super Admin roles can access AI settings
- MFA is required for all admin operations
- Per-client feature toggles allow different settings per workspace

### Compliance Standards

This module helps you comply with:
- **GDPR**: Data minimization via scope controls, audit trail, purpose limitation via feature toggles
- **SOC 2**: Access controls, encryption, monitoring, change management via regulation monitor
- **HIPAA**: BAAs available for supported providers, PII stripping via anonymized scope
- **ISO 27001**: Risk assessment via gap prioritizer, continuous monitoring via regulation monitor

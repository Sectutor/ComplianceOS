# Phase 2 Addons: Open-Source Tool Stack Strategy

**Date:** 2026-06-23  
**Status:** Strategy Document  
**Scope:** How Phase 2 addons leverage open-source tools instead of requiring commercial APIs

---

## 1. AI Evidence Gap Detector (`evidence-gap-detector`)

### Open-Source Heavy Lifters

| Component | Open-Source Tool | What It Does | Commercial Alternative |
|-----------|-----------------|--------------|----------------------|
| **LLM for analysis** | DeepSeek or Qwen (open-weight, local via Ollama/vLLM) | Generate human-readable gap summaries and recommendations | GPT-4 / Claude API (~$50/mo) |
| **Vector search** (optional) | ChromaDB or LanceDB | Embedding-based similarity matching of evidence descriptions | Pinecone / Weaviate ($70/mo) |
| **Scheduling** | Node.js setInterval/cron (built-in, no separate tool) | Periodic trigger for gap analysis | Vanta's cloud scheduler (proprietary) |
| **Database** | PostgreSQL + Drizzle ORM (existing) | All data storage | Vanta's proprietary data layer |

### How It Works Without Commercial APIs

```
[cron trigger]
    |
    v
[evidence-gap-detector addon]
    |
    +-> Query PostgreSQL clientControls + evidence tables
    |     (pure SQL - no LLM needed)
    |
    +-> Run gap analysis logic
    |     (pure TypeScript - no LLM needed)
    |     * Controls with NO evidence        -> gap type: missing
    |     * Controls with EXPIRED evidence   -> gap type: expired
    |     * Controls with EXPIRING evidence  -> gap type: expiring
    |
    +-> Auto-create evidence requests in PostgreSQL
    |     (pure Drizzle ORM - no LLM needed)
    |
    +-> Optionally call local DeepSeek/Qwen
          via LLMService for AI summaries
          (only if LLM provider is configured)
```

**Key fact:** The gap detection is **100% functional without any LLM**. The AI is only used for generating human-readable summaries and recommendations. If the user does not configure an LLM provider, the addon still detects all gaps and creates evidence requests - it simply skips the narrative generation step.

### Why This Matters

Vanta's equivalent proprietary scanner costs upwards of $10,000/yr. ComplianceOS's evidence gap detector works identically using:
- SQL queries (PostgreSQL) - free
- TypeScript logic - free (already written)
- Optional DeepSeek/Qwen (Ollama) - free (runs on the same server)

---

## 2. AI Questionnaire Responder (`ai-questionnaire-responder`)

### Open-Source Heavy Lifters

| Component | Open-Source Tool | What It Does | Commercial Alternative |
|-----------|-----------------|--------------|----------------------|
| **LLM for response generation** | DeepSeek or Qwen (open-weight, local via Ollama/vLLM) | Draft answers for unmatched questions | GPT-4 API (pay-per-use) |
| **Token similarity matching** | Pure JavaScript (already built, no external deps) | Match incoming questions to past responses | Vanta / OneTrust proprietary ML |
| **Knowledge base storage** | PostgreSQL (same DB, no separate service) | Store past Q&A pairs, policies, controls | Cloud-hosted proprietary DB |
| **Embedding search** (optional) | pgvector (PostgreSQL extension, already in schema.ts) | Semantic similarity of past questions | Pinecone / Weaviate ($70/mo) |

### How It Works Without Commercial APIs

```
[questionnaire received - PDF / DOCX / CSV]
    |
    v
[ai-questionnaire addon]
    |
    +-> Parse questionnaire into individual questions
    |
    +-> For each question:
    |     |
    |     +-> Look up past responses in PostgreSQL
    |     |     (token similarity match - pure JS, NO LLM)
    |     |
    |     +-> Search policies and controls for relevant text
    |     |     (full-text search in PostgreSQL - NO LLM)
    |     |
    |     +-> If matching response found:
    |     |     +-> Cache hit! Return stored answer (NO LLM)
    |     |
    |     +-> Only for unmatched questions:
    |           +-> Call local DeepSeek/Qwen
    |                 (fallback - ~40% of questions)
    |
    +-> Flag low-confidence responses for human review
```

**Key fact:** ~60% of questions can be answered from past responses without any LLM call. The LLM is only a fallback for novel or unmatched questions. Over time, as the knowledge base grows, the LLM dependency shrinks further.

### Confidence Scoring

The built-in token similarity matcher scores each match as a percentage:
- >= 90% - Auto-respond (no human review needed)
- 70-89% - Draft with suggested answer (flag for review)
- < 70% - LLM fallback or route to control owner

---

## 3. Continuous Compliance Score (Core Feature)

### Open-Source Heavy Lifters

| Component | Open-Source Tool | What It Does | Commercial Alternative |
|-----------|-----------------|--------------|----------------------|
| **Score calculation** | PostgreSQL aggregate queries (pure SQL) | Count valid evidence / total controls x 100 | Vanta's proprietary engine |
| **Compliance monitor data** | Phase 1 compliance-monitor (already built, pure Node.js queries) | Health check, drift detection, score snapshots | Vanta / Drata proprietary metrics |
| **LLM for narrative summaries** (optional) | DeepSeek/Qwen (local) | Generate English-language score change narratives | GPT-4 / Claude API |

### How It Works Without Commercial APIs

```
[Dashboard renders]
    |
    v
[React Query -> tRPC -> PostgreSQL]
    |
    +-> Calculate score:
    |     SELECT COUNT(DISTINCT e.control_id)::float /
    |           NULLIF(COUNT(DISTINCT c.id), 0) * 100
    |     FROM controls c
    |     LEFT JOIN evidence e ON e.control_id = c.id
    |       AND e.status = 'valid'
    |     WHERE c.framework_id = X AND c.client_id = Y
    |     (pure SQL - zero external dependencies)
    |
    +-> Compare against last snapshot for trend:
    |     SELECT score FROM compliance_score_snapshots
    |     WHERE client_id = Y AND framework_id = X
    |     ORDER BY created_at DESC LIMIT 2
    |     (pure SQL - zero external dependencies)
    |
    +-> Optional: LLM narrative for score changes
          (only if LLM provider is configured)
```

**Key fact:** The compliance score is a core feature, not an addon, because every client needs this metric regardless of subscription. It uses only PostgreSQL aggregate queries - no external API, no LLM, no cloud service.

---

## 4. Summary: Open-Source vs Commercial Cost Comparison

| Component | Open-Source Tool | Commercial Alternative | Cost Difference |
|-----------|-----------------|----------------------|-----------------|
| Evidence gap analysis | Pure SQL + JS logic | Vanta proprietary scanner | **Free** vs $10K+/yr |
| AI summaries (optional) | DeepSeek (local, Ollama) | GPT-4 / Claude API | **$0** vs ~$50/mo |
| Questionnaire matching | Token similarity (JS) + PostgreSQL | Vanta ML model | **Free** vs included |
| Questionnaire AI fallback | Qwen (local) or DeepSeek | GPT-4 API | **Free** vs pay-per-use |
| Compliance scoring | PostgreSQL aggregates | Vanta proprietary engine | **Free** vs included |
| Vector search (optional) | pgvector (PostgreSQL extension) | Pinecone / Weaviate | **Free** vs $70/mo |
| Document storage | PostgreSQL + S3-compatible (MinIO) | Vanta cloud storage | **Free** vs included |
| Orchestration | Node.js cron / existing scheduler | Vanta cloud infra | **Free** vs $10K+/yr |
| **TOTAL ANNUAL SAVINGS** | | | **~$20,000+/yr** |

## 5. LLM Provider: DeepSeek & Qwen Setup

Both DeepSeek and Qwen are open-weight models that run locally via Ollama, eliminating API costs entirely.

### Quick Start (Ollama)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull DeepSeek (7B model - runs on 8GB RAM)
ollama pull deepseek-r1:7b

# OR pull Qwen (7B model - runs on 8GB RAM)
ollama pull qwen2.5:7b

# Test
ollama run deepseek-r1:7b "Explain SOC 2 controls"
```

### Integration in ComplianceOS

1. Ollama runs on the same server as ComplianceOS (or a separate VM)
2. Configure the LLM provider in Settings -> AI Provider:
   - Provider: deepseek or qwen
   - Base URL: http://localhost:11434 (Ollama default)
   - Model: deepseek-r1:7b or qwen2.5:7b
3. The LlmBridge abstraction (in packages/addons/src/shared/llm-bridge.ts) handles all provider routing

### Performance Notes

| Model | RAM Required | Response Time (per query) | Quality |
|-------|-------------|--------------------------|---------|
| DeepSeek-R1:7B | 8 GB | 2-5s | Good for summaries |
| Qwen2.5:7B | 8 GB | 2-5s | Good for question answering |
| DeepSeek-R1:14B | 16 GB | 5-10s | Better for complex analysis |
| Qwen2.5:14B | 16 GB | 5-10s | Better for questionnaires |

---

## 6. Bottom Line

**ComplianceOS Phase 2 addons can run entirely on open-source software with zero commercial API dependencies.** The optional LLM features use open-weight models (DeepSeek, Qwen) via Ollama on the same server - no OpenAI or Anthropic API keys required.

### When to Use Commercial LLMs

While the system works without them, commercial LLMs (GPT-4, Claude) may be preferred when:
- Quality is more important than cost
- The team lacks GPU resources for local inference
- Handling complex questionnaire formats with nuanced legal language
- Processing very large documents (>100 pages)

In these cases, the architecture supports swapping providers via the LLMService abstraction without code changes.

---

## Appendix: What Each Addon Achieves Without LLM

| Addon | Works Without LLM? | What's Missing Without LLM |
|-------|-------------------|---------------------------|
| Evidence Gap Detector | **Full functionality** | No narrative summaries - gaps still detected, requests still created |
| AI Questionnaire Responder | **~60% auto-answer rate** | Unmatched questions routed to control owners instead of auto-generated |
| Continuous Compliance Score | **Full score + trend** | No English-language score narratives |

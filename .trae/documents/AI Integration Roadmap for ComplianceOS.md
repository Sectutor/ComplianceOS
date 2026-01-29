## Current State
- Frontend: React + Vite with tRPC client (`App.tsx`, `lib/trpc.ts`) and Advisor UI (`components/advisor/*`).
- Backend: Express + tRPC (`index.ts`, `routers.ts`), Postgres via Drizzle (`schema.ts`, `db.ts`). SSE streaming endpoint exists (`index.ts:259`).
- AI: Provider abstraction and chat completions (`lib/llm/service.ts:66`), streaming (`lib/llm/service.ts:101`), RAG retrieval and embeddings (`lib/advisor/retrieval.ts:15`, `lib/advisor/embeddings.ts`), advisor orchestration (`lib/advisor/service.ts`).
- Gaps: Advisor router returns mocks (`server/routers/advisor.ts:7`), embeddings stored as JSON (no `pgvector`), weak structured outputs and citation tracking, conversations not persisted, limited UI entry points in some workflows.

## Objectives
- Reduce manual work with AI-first flows across policies, controls, evidence, risk, vendor, governance, email, and business continuity.
- Tighten AI into every activity via context-aware assistants, automation, and proactive suggestions.
- Maintain provider-agnostic design, secure operations, observability, and test coverage.

## Foundational Upgrades
1. Replace mock advisor endpoints with real RAG + LLM
- Wire `server/routers/advisor.ts` to `lib/advisor/service.ts` functions for:
  - `suggestTechnologies`, `implementationPlan`, `explainMapping`, `askQuestion`, `vendorMitigationPlan` (`lib/advisor/service.ts:52`, `133`, `198`, `258`, `292`).
- Add streaming variants returning partial chunks via SSE for chat-like UX (`index.ts:259`).

2. Adopt `pgvector` for embeddings and DB-side similarity
- Migrate `embeddings.embeddingData` from JSON to `vector` with `pgvector`, add indexes.
- Implement similarity queries in SQL; keep in-memory cosine as fallback (`lib/advisor/embeddings.ts:189`).

3. Provider-agnostic LLM enhancements
- Extend `lib/llm/service.ts` to select SDKs/base URLs per provider (Anthropic/Gemini when not OpenAI-compatible); validate models in `pages/admin/LLMSettings.tsx`.
- Enforce rate limits and per-client quotas (`index.ts:24`, `lib/limits.ts`).

4. Structured outputs and citations
- Use JSON mode and zod validation for advisor outputs; persist citations into `advisor_messages.sources` (`schema.ts:2015`).
- Add parser tests for technology suggestions, implementation plans, mitigation steps.

## AI in Core Workflows
1. Policies
- Generation & tailoring: integrate `PolicyGenerator` (`lib/policy/policy-generation.ts`) in policy creation/edit flows; expose “Generate Sections”, “Tailor to Industry” actions.
- Review & improvements: ensure `PolicyReviewDialog.tsx` flows persist results (`schema.ts:1579`) and auto-apply recommendations to create improved versions.

2. Controls & Evidence
- Evidence suggestions: already via `evidenceSuggestions` router (`routers.ts:493`). Surface in control details (`components/controls/EvidenceSuggestionsPopover.tsx`).
- AI evidence extraction: upon file upload (`index.ts:124`), run LLM to classify, summarize, and propose verification steps; store summary in `evidence.description` and embed content for RAG.
- Control technology suggestions: align UI with `suggestTechnologies` results; enable “Generate Implementation Plan” with streaming.

3. Gap Analysis & Readiness
- Email questionnaires: add AI-generated question sets based on selected controls (`components/gap-analysis/EmailQuestionsDialog.tsx`).
- Readiness wizard: add contextual “Ask AI” buttons via `QuickAsk.tsx` across steps (Scope, Stakeholders, Docs) to auto-fill draft content.

4. Risk Management
- AI control recommendations: connect `components/risk/AIControlSuggestions.tsx` to `lib/ai/controlSuggestions.ts` for structured suggestions and auto-link treatments.
- Auto-triage high risks: generate remediation tasks with owners and timelines using advisor plan outputs; sync to issue trackers when configured (`lib/modules/crm/router.ts`, `schema.ts:1503`).

5. Vendor (TPRM)
- Vendor mitigation plans: UI viewers consume `generateVendorMitigationPlan` (`lib/advisor/service.ts:292`); push steps into remediation tasks and track progress.
- Threat intel enrichment: use AI to summarize KEV/CVE impacts for vendor dashboards; suggest contract safeguards.

6. Governance Workbench
- AI-driven transitions: when workflow state changes, generate work items and escalation notes using AI (`lib/governance/workflow.ts`).
- Explain mapping coverage and generate missing tasks.

7. Email & Communication
- Compose dialog: add “AI Draft” and “Summarize thread” using `useStreamingAI` (`hooks/useStreamingAI.ts`) and advising context; auto-suggest recipients from CRM and RACI.
- Template generation: AI fill for `communicationTemplates` (`schema.ts:931`).

## UI Integration Points
- Persistent Copilot: floating button (`components/advisor/CopilotButton.tsx`) + panel (`components/advisor/CopilotPanel.tsx`) on all client pages.
- Contextual Quick Ask: embed `QuickAsk.tsx` in controls, policies, readiness, risk, vendor, BCP pages with appropriate `context` metadata.
- Streaming responses: move `AdvisorContext` to use SSE stream for chat (`index.ts:259`) instead of only tRPC mutations.

## Data & RAG Coverage
- Index all relevant sources:
  - Controls, policy templates, client policies (existing `scripts/index-embeddings.ts`).
  - Evidence summaries and vendor scans/breaches (`schema.ts:3488`, `3577`).
  - Knowledge articles (`schema.ts:1823`); add admin upload/import.
- Nightly jobs to refresh embeddings; capture token usage and costs.

## Security & Observability
- Secrets: ensure encrypted provider keys (`schema.ts:1161`, `lib/crypto.ts`); no logging keys.
- RBAC: restrict AI endpoints to authorized roles (`routers.ts:104–115`).
- Metrics: expose AI usage, latency, and token counts via Prometheus (`index.ts:682`); add per-route counters.
- Abuse controls: expand rate limiting for AI endpoints and per-user caps.

## Testing & Verification
- Vitest unit tests for advisor parsers and retrieval scoring (`vitest.config.ts`).
- E2E smoke tests for streaming endpoint, policy review/apply, and evidence extraction.
- Seed data and scripts to validate suggestions (`scripts/verify_generation.ts`, `tests/governance-workbench.test.ts`).

## Rollout Plan
1. Foundation: pgvector migration, provider SDK support, advisor router wiring, streaming.
2. Workflow integrations: UI bindings for Quick Ask, Copilot, AI Draft in email; risk/vendor governance hooks.
3. RAG expansion: evidence/vendor/knowledge ingestion; scheduled indexing.
4. Harden: metrics, rate limits, tests; refine prompts and JSON schemas.

## Deliverables
- Real advisor endpoints with streaming and structured outputs.
- pgvector-enabled retrieval with SQL similarity and indexes.
- Copilot and Quick Ask embedded across pages, email AI drafting enabled.
- Automated evidence extraction and indexing.
- Governance AI auto-triage of work items and transitions.
- Metrics and tests proving reduced manual steps and improved throughput.

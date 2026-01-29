## Vision
- Provide an AI advisor across the app to answer compliance questions, suggest technologies to implement controls, generate step‑by‑step plans, and link to policies/evidence with citations.
- Package the product with clear pricing for consultants, self‑hosted organisations, and SaaS with AI.

## Architecture
- **Advisor Service (backend)**: Orchestrates retrieval (internal DB + curated tech catalog + optional web search) and composes prompts to the configured LLM provider (`lib/llm/service.ts`).
- **Retrieval Layer (RAG)**: Embeds app content and curated catalog; ranks results and injects into prompts with citations.
- **Tech Catalog**: Vendor‑neutral + vendor mappings from controls → technologies/services → implementation steps.
- **UI Integration**: Copilot panel (global) + inline "Ask AI" on Controls, Policies, Evidence, Regulations with streaming results (uses existing SSE in `index.ts:164–202`).

## Pricing Recommendation
- **1) Consultant Single License (Self‑Hosted)**
  - Price: `USD $3,500/year` per consultant; includes up to 3 active client workspaces.
  - Add‑ons: `+$1,000/year` per additional active client; `+$1,200/year` premium support.
  - Rationale: value‑based vs SMB budget; competitive vs general GRC tools; aligns with solo/ boutique consultants.
- **2) Single Organisation License (Self‑Hosted)**
  - Price: `USD $8,500/year` per org; up to 25 users; includes policy exports and SoA.
  - Add‑ons: AI Advisor `+$2,000/year`, SSO `+$1,500/year`, priority support `+$2,500/year`.
  - Optional: perpetual license `USD $20,000` + `USD $3,000/year` maintenance.
  - Rationale: materially below enterprise SaaS (often $10k–$30k) while preserving margins.
- **3) SaaS Yearly with AI**
  - Standard: `USD $9,000/year` per org (up to 50 users), fair‑use AI included; overage metered.
  - Pro: `USD $14,000/year` adds advanced AI workflows, audit packs, SSO.
  - Enterprise: `USD $24,000/year` adds vendor integrations, priority support.
  - AI metering: include `~5M tokens/year` fair‑use; overage `USD $0.50 per 1k tokens` or `USD $99 per 50k tokens` bundles.
  - Rationale: competitive with compliance automation vendors; usage pricing protects unit economics.
- **Commercial Notes**
  - Early‑adopter promo: `20%` first year; nonprofit/edu: `30%` discount.
  - Onboarding services: `USD $2,500–$7,500` one‑time depending on tier.

## Packaging u00026 Entitlements
- Plans map to `planTier` already present on `clients`; add entitlements: `maxUsers`, `aiEnabled`, `aiTokenQuota`, `integrationsEnabled`, `supportLevel`.
- Enforce entitlements at tRPC layer; show gated UI affordances.
- Stripe integration: use existing webhook flow; add price IDs per tier; record quotas and reset windows.

## Retrieval Sources
- **Internal**: controls, client_controls, client_policies, policy_templates, regulation_mappings, evidence, audit_logs.
- **Catalog**: `data/catalog/` (YAML/JSON) describing technologies and cloud mappings with references.
- **Web (opt‑in)**: trusted sources only (NIST/ISO/vendor docs) for “What’s New”.

## Backend Services
- **Embeddings/Indexing**: pgvector if available; else file‑based store. Batch indexing for catalog + internal content.
- **Advisor Procedures (tRPC)**
  - `ai.advisor.suggestTechnologies({ clientId, controlId })`
  - `ai.advisor.implementationPlan({ clientId, controlId, vendorContext? })`
  - `ai.advisor.explainMapping({ clientId, regulationId, articleId })`
  - `ai.advisor.whatsNew({ topic|controlId })`
- **Task Integration**: “Apply” → create remediation tasks and RACI assignment.

## Prompting u00026 Citations
- Templates include client context + top‑k retrieved items; always return citations. Fallback chain on LLM failure.
- Log prompt/response with requestId; add thumbs‑up/down feedback capture.

## UI Integration
- Global Copilot chat with streaming; quick actions.
- Inline buttons on Control/Policy/Evidence pages: Suggest Tech, Implementation Plan, Explain Coverage; results as actionable cards.

## Implementation Steps
1. Create `data/catalog/` with initial control→tech mappings and references.
2. Build embeddings/indexer and storage; seed index.
3. Implement `ai.advisor.*` tRPC endpoints with retrieval + prompt composition + citations.
4. Add Copilot panel and inline Ask AI; stream responses via SSE.
5. Add “Apply” actions → remediation tasks + RACI.
6. Implement entitlements and quotas for pricing tiers; wire Stripe price IDs and webhook handling.
7. Add tests for advisor endpoints and plan enforcement.

## Success Metrics
- Higher control implementation rate; ≥90% citation trust; positive feedback on AI suggestions.

Ready to proceed with catalog scaffolding, advisor endpoints, and pricing entitlements enforcement?
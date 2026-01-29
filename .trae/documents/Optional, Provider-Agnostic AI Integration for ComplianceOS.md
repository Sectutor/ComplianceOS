## Goals
- Make AI fully optional and configurable per company/client.
- Support cloud APIs (OpenAI, Azure OpenAI, Anthropic, OpenRouter) and local LLMs (Ollama/LM Studio/vLLM) via a common interface.
- Integrate AI into policy authoring/improvement, monitoring summaries, and control→policy mapping, plus brainstorming.
- Preserve security/compliance: no plaintext secrets, strict access control, audit logging, redaction.

## High-Level Architecture
- Feature flag: org/client-level `ai.enabled` gate with safe defaults (off).
- Provider abstraction: `AIClient` interface with interchangeable providers and runtime configuration.
- tRPC router: `aiRouter` exposing typed procedures for generation, improvement, embeddings, mapping, and summaries.
- Embeddings layer: optional `pgvector` for similarity; fallback to JSON embeddings with in-app cosine similarity.
- Background jobs: queue for long tasks (batch policy improvements, large mappings) with progress and cancellation.

## Data Model Changes
- `ai_settings` (per client/org):
  - `enabled` (bool), `provider` (enum: openai, azure_openai, anthropic, openrouter, ollama, lmstudio, vllm, custom)
  - `base_url` (string for local/custom), `model` (string), `embedding_model` (string)
  - `timeout_ms` (int), `stream` (bool), `moderation_enabled` (bool), `default_system_prompt` (text)
  - `api_key_ref` (FK to `secrets` table)
- `secrets` table: encrypted `ciphertext`, `created_by`, `scope` (org/client), `kind` (ai_api_key), `last_rotated_at`.
- `ai_usage_log`: procedure name, tokens in/out, provider, model, latency, `client_id`, user, redaction status.
- Optional: `embeddings` table (`entity_type` policy/control, `entity_id`, `vector`, `provider`, `dim`, `updated_at`). Use `pgvector` if available; else `jsonb` array.

## Security & Compliance
- Secrets at rest: encrypt API keys using AES-GCM with a server-side KMS key or env-based key (`AI_SECRETS_KEY`), never log or expose plaintext.
- Transport: TLS enforced to cloud providers; allow localhost for approved local LLMs with opt-in.
- Access control: respect Supabase-auth roles; limit `ai_settings` read/write to admins of org/client.
- Redaction middleware: strip PII from inputs where possible (emails, SSNs, phone numbers) before sending to providers.
- Audit: persist `ai_usage_log`, include prompt hash, user ID, and deterministic request IDs.
- Rate limiting: per-user and per-org limits for AI endpoints; backoff on provider errors.

## Provider Abstraction
- `AIClient` interface: `chat`, `generate`, `embed`, `moderate` (optional), `healthCheck`.
- Providers:
  - OpenAI/ Azure OpenAI/ OpenRouter (OpenAI-compatible)
  - Anthropic (Claude)
  - Ollama/ LM Studio/ vLLM (OpenAI-compatible or custom REST)
  - Custom: configurable base URL + schema (OpenAI-like preferred)
- Streaming support with server-sent events over tRPC.
- Pluggable system prompts; per-procedure templates stored in `ai_settings` or defaults.

## Backend Services (Express + tRPC)
- New `aiRouter` procedures:
  - `generatePolicyDraft(policyTemplateId, clientId)`
  - `improvePolicy(policyId, clientId, goals[])`
  - `mapControlsToPolicies(clientId, strategy)` using embeddings similarity + heuristics
  - `monitoringSummary(clientId, dateRange)` summarizing `evidence`, `audit_notes`
  - `brainstorm(topic, context)` for ideation with guardrails
  - `embedEntity(entityType, entityId)` on demand or batch
- Service-layer modules:
  - `providers/*` implementations
  - `embeddings.ts` with storage + similarity
  - `promptLibrary.ts` (policy style, tone, compliance-specific system prompts)
  - `redaction.ts` and `moderation.ts`
  - `usageLog.ts` and `rateLimit.ts`
- Error handling: standardized error codes (provider_unavailable, quota_exceeded, input_too_large, moderation_blocked).

## Frontend (React + tRPC + Tailwind)
- Settings UI:
  - `AI Settings` page under client/org settings: enable toggle, provider selector, base URL, model, embedding model, timeouts, streaming, moderation.
  - Secure API key entry (write-only), status check button (`healthCheck`).
- Feature entry points:
  - Policy Editor: `Draft with AI`, `Improve with AI`, `Suggest sections` (streamed output)
  - Mappings page: `Auto-map controls to policies` with preview diff and acceptance workflow
  - Evidence/Audit pages: `Summarize period`, `Generate report highlights`
  - Global: `Brainstorm` modal with context pickers (client, control set, policy scope)
- UX gates: hide AI actions when disabled; show provider health status and token usage.

## Embeddings & Mapping Strategy
- If `pgvector` available: store vectors; use SQL cosine similarity for efficient top-K.
- Otherwise: store arrays in `jsonb`; compute cosine similarity in Node for modest datasets; batch to avoid blocking.
- Combine semantic similarity with existing heuristics (category tags, keywords) to produce strong mapping suggestions with confidence scores.

## Monitoring Integration
- Summarize `evidence` and `audit_notes` across time ranges; extract risks, anomalies, and follow-ups.
- Generate action items linked to `employee_task_assignments` with RACI roles.
- Optional moderation + redaction to avoid sensitive content leakage.

## Optionality & Governance
- Default off; per-client overrides inherit from org.
- Per-user preferences to show/hide AI UI and opt out of streaming.
- Clear disclosures: model/provider names, data handling summary.
- Soft-dependence: all AI features degrade gracefully to existing rule-based flows.

## Testing & Validation
- Provider mocks and contract tests for `AIClient`.
- Unit tests for redaction, moderation, embeddings similarity, and mapping logic.
- Integration tests for `aiRouter` streaming and error paths.
- Health checks and smoke tests on settings save.

## Rollout Plan
1. Add data models (`ai_settings`, `secrets`, optionally `embeddings`, `ai_usage_log`).
2. Implement `AIClient` and one provider (OpenAI-compatible) + mocks.
3. Build `aiRouter` endpoints with streaming and logging.
4. Ship Settings UI, enablement gate, and health checks.
5. Integrate AI into Policy Editor and Mappings page; add summaries in Evidence.
6. Add local LLM support (Ollama/LM Studio) and documentation.
7. Harden security: encryption, redaction, moderation, rate limits.
8. Measure and iterate with usage logs and user feedback.

## Notes on Current Codebase
- Express + tRPC make it straightforward to add `aiRouter` alongside existing routers.
- Drizzle-ORM tables can be extended without disrupting current flows; start with non-breaking migrations and defaults.
- No current AI code detected; all integrations can be additive with feature flags and guards.
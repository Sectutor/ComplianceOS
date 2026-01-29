## Pricing Recommendations
- **Consultant (Self‑Hosted, Single License)**: USD $2,490/year per consultant; includes updates and standard support. Optional add‑ons: $790/year for advanced integrations; $190/month for AI usage pack (+300k tokens/month).
- **Single Organization (Self‑Hosted)**: USD $9,900/year up to 250 employees; $19,900/year up to 1,000 employees. Includes all integrations, policy exports, RACI, and on‑prem AI proxy support.
- **SaaS Yearly (AI Included)**:
  - Starter: $4,800/year (≤100 employees), includes 15M tokens/year shared, core integrations.
  - Growth: $12,000/year (≤500 employees), 50M tokens/year, advanced integrations, audit packs.
  - Enterprise: custom ($30k–$75k/year+), SSO/SAML, private networking, 150M+ tokens/year, premium support.
- **Rationale**: Mid‑market compliance platforms charge $5k–$30k+ annually. These tiers position competitively while anchoring value to organization size and AI usage.

## Start Servers Locally (Windows)
- **Prerequisites**: Ensure `DATABASE_URL`, Supabase keys, Stripe webhook secret, and Forge API values are set in `.env`.
- **Backend**: Run `npm run server` to start Express (`index.ts`) on `http://localhost:3000`; verify `GET /api/healthz` and `GET /api/metrics`.
- **Frontend**: Run `npm run dev` to start Vite on `http://localhost:5173`; app will call `/api/*`.
- **Netlify Function (Optional)**: For serverless preview, use `netlify dev` to proxy `/.netlify/functions/api`.
- **Verification**: Check dashboard loads, tRPC calls succeed, exports render, and SSE AI streaming at `POST /api/ai/generate-stream` streams data.

## AI‑Integrated Advisor
- **Goal**: A context‑aware copilot that suggests technologies for controls, generates implementation plans, and explains regulation coverage with citations.
- **Retrieval Sources**: Internal DB (controls/policies/evidence/mappings) + curated tech catalog; optional web search for “what’s new”.
- **Backend (tRPC)**: Add `ai.advisor.suggestTechnologies`, `ai.advisor.implementationPlan`, `ai.advisor.explainMapping`, `ai.advisor.whatsNew` using `lib/llm/service.ts`.
- **Tech Catalog**: Create `data/catalog/` (YAML/JSON) mapping controls → vendor‑neutral and vendor‑specific tech (AWS/Azure/GCP/CIS/NIST).
- **Embeddings**: Index catalog and internal content (pgvector or file index) to drive RAG with citations.
- **UI**: Global Copilot panel with streaming; inline “Ask AI” buttons on Controls/Policies/Evidence pages; display result cards with sources and “Apply” actions.
- **Apply Flow**: Convert AI suggestions into `remediation_tasks` and assignments via existing RACI.
- **Safety**: Prompt guardrails, rate limiting, and redacted telemetry (store requestId and minimal metadata).

## Delivery Steps
1. Configure environment and start servers; confirm health and basic flows.
2. Add catalog scaffolding and embedding pipeline; seed initial control mappings.
3. Implement advisor endpoints with retrieval + prompt composition + citations.
4. Build Copilot UI and inline actions; wire streaming.
5. Add tests (Vitest) for advisor procedures; mock LLM.
6. Define Stripe products/plans for pricing tiers in SaaS; update billing UI copy.

## Decision Points
- Confirm final price points; adjust AI token bundles per tier.
- Choose embedding store (pgvector vs external) and whether to enable web search for “What’s New”.

If you approve, I will start the servers and proceed with the advisor implementation and pricing productization as outlined.
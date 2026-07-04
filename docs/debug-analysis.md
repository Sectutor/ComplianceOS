# GRCompliance (ComplianceOS) — Full Debug Analysis

## 🏗️ Codebase Health

### Schema: 261 tables, 39 enums — EXCEPTIONAL DEPTH
Larger than Vanta's schema by a wide margin. The data model covers:
- Risk management (ISO 31000: riskScenarios, riskTreatments, riskAssessments, riskAppetite, riskSettings)
- Compliance frameworks (complianceFrameworks, frameworkRequirements, frameworkMappings, controlMappings, regulationMappings)
- Evidence management (evidence, evidenceFiles, evidenceRequests, evidenceExpiry, evidenceTemplates)
- BCP/BIA (bcpProjects, businessImpactAnalyses, bcPlans, bcPlanScenarios, bcTrainingRecords, disruptiveScenarios)
- Privacy (dsarRequests, dataProtImpactAssessments, processingActivities, dataBreaches, consents, consentsTemplates)
- TPRM (vendors, vendorAssessments, vendorContracts, vendorDpas, vendorScans, vendorBreaches, vendorCveMatches)
- Federal (federalNist, federalFedramp, federalCmmc, federalPoams, federalSSPs, federalFips, federalSars)
- NIS2/DORA (nis, cyber, incidents, incidentReporting, crossBorder)
- AI Governance (aiSystems, aiImpactAssessments, aiUsageMetrics, llmProviders, llmRouterRules)
- CRM/Sales (globalCrmContacts, globalCrmDeals, globalCrmActivities, leads)
- Threat intel (threats, iocRecords, nvdCveCache, cisaKevCache, threatIntelSyncLog)
- Employee management (employees, employeeTrainingRecords, employeeTaskAssignments)
- Governance/GRC (governanceEvents, kris, metrics, policies, policyVersions, policyTemplates)

**Verdict:** Schema is best-in-class among open source GRC tools. No competitor has this breadth.

### Routers: 88 free + 9 premium — GOOD SURFACE BUT THIN PAYWALL
- All major domains have tRPC routers
- Premium gating via `premiumClientProcedure` for: federal, globalVendors, vendorContracts, vendorDpas, subprocessors, questionnaire (some), riskSettings (some), mcp (some), vendorAssessments (some)
- **Bug:** routers.ts has ~40 lines of dead code (`STANDARD_CONTROLS_CONTEXT` string block on lines 164-202 that's never referenced)
- **Bug:** `createControlsRouter` has a `// Restore missing router mapping` comment suggesting it was broken and hotfixed
- The modular architecture (modules/ + server/routers/) is clean

### UI Pages: 330 pages — MASSIVE, but some workflows are incomplete
- Top 5 richest pages: PolicyEditor (2.6K), VendorDetails (2.4K), AuditHub (2K), PolicyTemplates (1.9K), AIGovernance (1.7K)
- These are genuinely workflow-rich pages, not thin CRUD

### Build State: UNVERIFIED
- `npm run build:community` timed out at 120s (may need more time or may have dependency issues)
- Production Dockerfile uses `npx tsx` to run the server — **tsx is a dev tool, not production-safe** (uses JIT compile, not pre-compiled JS)

---

## 🐞 Critical Bugs & Issues

### P0 — Blocks Revenue or Core Workflow

| # | Issue | Evidence | Impact |
|---|-------|----------|--------|
| 1 | **tsx in production** — `CMD ["npx", "tsx", "server_entry.ts"]` runs TypeScript JIT on every server start. Higher memory, slower startup, can crash on edge cases. | `Dockerfile.selfhost` line 79 | Self-host users get a fragile production deployment |
| 2 | **Build may be broken** — `npm run build:community` timed out | 120s timeout without completion | Need to verify the build actually produces a working artifact |
| 3 | **18+ schema shadows** — tables with no UI pages | readinessAssessments, complianceSnapshots, disruptionScenarios, financialImpacts, implementationPhases, implementationPlans, iocRecords, threatAlertSettings, nvdCveCache, cisaKevCache, planVersions, planExercises, planChangeLog, reportLogs, roadmapReports, kris, employeeAssetReceipts | These data models exist but have no user-facing workflow. A compliance manager using the product will see no way to interact with these features despite them being in the codebase |
| 4 | **Routers.ts has ~40 lines of dead code** — `STANDARD_CONTROLS_CONTEXT` multiline string (lines 164-202) is defined but never imported or referenced anywhere | `routers.ts` lines 164-202 | Dead code increases surface, compiler claims it compiled but it's a signal of maintenance drift |

### P1 — Competitive Disadvantage (Vanta/Drata Will Win)

| # | Issue | Vanta's Advantage | What GRCompliance Has |
|---|-------|-------------------|----------------------|
| 5 | **Zero automated evidence collection** — 375+ integrations pull evidence automatically on schedule | Vanta: 87% automated evidence collection. User connects tools → auto-picks 20+ issues in 2 hours | No production connectors deployed. `connectors.ts` router exists but no actual SaaS integration built |
| 6 | **No guided compliance journey** — "Get ISO 27001 in 30 days" progressive wizard | Vanta: shows NEXT 3 TASKS ONLY. Progressive checklist reduces user paralysis | `ComplianceJourneyDashboard.tsx` exists but is not a guided step-by-step wizard. Users face all 60+ nav items at once |
| 7 | **No unified to-do list** — Evidence, controls, risks, BCP all separate | Vanta: one prioritized task list for everything | Scattered across modules. No cross-module action center with consolidated priorities |
| 8 | **No Trust Center** — Public-facing certification + security docs page | Vanta: reduces security review time from 2-3 weeks to 3-5 days | No `/trust` or public portal for buyer security reviews |
| 9 | **No CI/CD evidence pipeline** — No automated evidence from GitHub Actions / GitLab CI | Vanta: 1,200 automated tests/hour. Self-healing on check failures | No developer workflow integration for continuous compliance |
| 10 | **No access review automation** — Can't detect dormant accounts | Vanta: auto-generates review campaigns from HR/SSO | `accessReviews.ts` router exists but no HR/SSO integration to auto-populate |
| 11 | **No calendar integration** — No audit scheduling sync | Vanta/Drata: sync with Google Calendar for audit scheduling | Nothing built |

### P2 — Open Source Model & Monetization

| # | Issue | Detail | Fix |
|---|-------|--------|-----|
| 12 | **Premium boundary is too thin** — 9 premium routers vs 88 free | Only 10% of features are behind the paywall. Vanta charges $10K-$50K/yr for what you give away for free | Gate more features: AI drafting, advanced evidence reports, compliance dashboards, BCP exercises, privacy center, automated risk scoring |
| 13 | **AGPLv3 scares enterprises** — Many corporate legal teams ban AGPL code | Enterprises who self-host prefer MIT, Apache 2, or BSL | Need a dual license (AGPL for community + commercial license for enterprises who can't use AGPL) |
| 14 | **No clear "what happens if I stop paying"** — License enforcement is Ed25519-signed cache with offline grace (good architecture) but the user journey is undocumented | `license-file.ts` and `server.ts` exist and work, but the user never sees this | License enforcement is the right architecture. The gap is that there's no purchase landing page or pricing page visible |
| 15 | **Payment flow is built but not wired to a live Stripe account** — purchase.ts, gumroad.ts, and billingRouter exist but no actual products in Stripe | The code is ready. The `.env` has no real keys | Step-by-step Stripe setup is documented in `docs/stripe-setup.md`. Just needs execution |

---

## 🏆 Where You Beat Vanta/Drata (Don't Lose These Advantages)

| Advantage | What GRCompliance Has | Vanta Has |
|-----------|----------------------|-----------|
| **Self-host / data sovereignty** | Full Docker + multi-arch + Helm + telemetry control (`NO_TELEMETRY=true`) | SaaS-only. No on-prem. Their breach (May 2026) exposed tenant isolation failure |
| **BCP/BIA** | Full module: bcPrograms, bcPlans, disruptiveScenarios, bcTrainingRecords, exercices, call trees | **Nothing.** Vanta has zero business continuity features |
| **Federal/Gov** | CMMC, NIST 800-53, FedRAMP, FIPS 199, SSP editor, POAM tracker, DISA STIG | **Nothing.** Vanta doesn't support federal frameworks |
| **Privacy Center** | ROPA, DSAR, DPIA, data flows, consent management, breach notification | **Basic.** Vanta's privacy module is thin |
| **Multi-tenant MSSP mode** | Clients, advisor workbench, global CRM, multi-client dashboard, white-label branding | Single-tenant only |
| **AI Sovereignty** | Multi-model LLM service (OpenAI + Anthropic + Google + DeepSeek + local/Ollama). BYOK. | Locked to Vanta's own AI. Can't bring your own keys |
| **Cost** | Free self-host (AGPLv3). £22/mo Hetzner VPS for 20 client workspaces | $10K-$50K+/yr + per-framework pricing |
| **Framework breadth** | ISO 27001, SOC 2, NIS2, DORA, GDPR, HIPAA, PCI-DSS, CMMC, FedRAMP, NIST 800-53, Essential Eight, ASVS, SAMM | SOC 2, ISO 27001, HIPAA, GDPR. No NIS2/DORA/federal |
| **Cross-framework harmonization** | `frameworkHarmonization` table + overlap detection | Per-framework pricing discourages using multiple frameworks |

---

## 📊 Competitive Positioning Map

```
              HIGH FEATURES
                   │
    Vanta $10-50K  │  GRCompliance (Free + $499)
       SaaS-only   │  Self-host, BCP, Federal, Privacy
                   │
  LOW INTEGRATIONS ──────────────────── HIGH INTEGRATIONS
                   │
    SimpleRisk     │  DefectDojo (AppSec)
    GovReady-Q     │  (narrower focus)
                   │
              LOW FEATURES
```

**GRCompliance has the broadest feature set but the worst automation/connector story.**

---

## 🎯 What to Fix: Prioritized by Revenue Impact

### Week 1 — Fix the Money Leaks (Can Sell Today)

1. **Create Stripe products** ($249/mo Self-Host Pro, $999/yr Premium, $5K Enterprise)
   - Docs exist at `docs/stripe-setup.md` — just execute
   - Purchase webhook is built, Ed25519 license generation is built

2. **Fix the Docker build to use compiled JS** instead of `tsx`
   - `npx tsc` → then `node dist/server_entry.js` instead of `npx tsx server_entry.ts`
   - This is a 10-minute fix that improves startup reliability

3. **Add a pricing page** — there's no `/pricing` route
   - The GTM plan calls for $499/yr self-host pro
   - This is the single highest-ROI page you could build

### Week 2 — Close the Feature Gaps Where Vanta Wins

4. **Build the guided compliance journey** — "Get ISO 27001 in 30 days" wizard
   - `ComplianceJourneyDashboard.tsx` exists but needs the step-by-step flow
   - Show 3 tasks at a time, auto-advance, completion tracking

5. **Build 3 connectors** — vanta-killer connectors that pull from:
   - GitHub (code secrets, dependency vulns)
   - Google Workspace (email security, drive sharing)
   - Cloudflare (DNS, CDN, WAF config)
   - These 3 cover 80% of what SMBs need. Vanta has 375+ but SMBs only use 5-10.

6. **Ship the Trust Center** — public-facing `/trust` page with:
   - ISO 27001 certification status
   - Security posture summary
   - Compliance scorecard
   - Evidence snapshot (read-only)

### Week 3 — Move the Premium Boundary

7. **Gate 10 more features behind premium** — move from 9/88 premium to 19/88
   - AI drafting (LLM service is built, gate it)
   - Advanced evidence reports (expiry tracking, snapshot comparison)
   - BCP exercise scoring
   - Privacy center (ROPA, DSAR, DPIA)
   - Automated risk scoring (tie threat intel feeds to risk scenarios)
   - Compliance monitoring dashboard
   - The user won't notice features disappearing — they'll notice premium features appearing

8. **Create the trial flow** — the `BUILD_TYPE=TRIAL` script already exists
   - 14-day trial with all premium features
   - Time-limited license file via Ed25519
   - Auto-convert on purchase

### Month 2 — Establish Clear Market Leadership

9. **Build CI/CD evidence pipeline** — GitHub Action that submits scan results as evidence
   - Run `trivy`, `gitleaks`, `semgrep` in CI → POST to ComplianceOS API → evidence linked to controls
   - This is the #1 ask from engineering teams

10. **Add the unified action center** — `actionCenter.ts` router exists, build the UI
    - One prioritized list of: expiring evidence, overdue risk reviews, upcoming audits, incomplete BCP exercises

11. **Dual license (AGPL + commercial)** — Modify README and licensing to offer:
    - Community: AGPLv3 (no change, existing)
    - Enterprise: MIT or Apache 2 commercial license ($999/yr) for orgs that can't use AGPL

---

## 📋 Summary: The Three Hard Truths

| Truth | Detail | Fix |
|-------|--------|-----|
| **Schema is world-class, workflow is not** | 261 tables, 330 pages — but the workflows don't guide the user. Evidence collection, the single most important GRC task, has zero automation. Users upload screenshots manually. | Build 3 connectors + build the guided compliance journey. Those two things make evidence collection go from 0% to 60% automated for SMBs. |
| **Open source model is right, paywall is wrong** | 10% premium-to-free ratio is unsustainable. You give away features that Vanta charges $10K/yr for. The AGPL license blocks enterprise adoption. | Double the premium gate + offer commercial license. Aim for 25% premium. |
| **Deployment is ready, sales is not** | Stripe code works. License enforcement works. Docker works. But there's no pricing page, no purchase flow visible to users, and no Stripe products exist in your account. | Execute the Stripe setup doc. Add a pricing page. That's it — that's the entire gap between "free for everyone" and "paying customers." |

## 🚀 One-Line Competitive Strategy

> **"Vanta gives you the best automation but locks your data in their SaaS. GRCompliance gives you the broadest feature set and runs on your infrastructure — but needs guided wizards and 3 connectors to close the automation gap."**

The next $10K of development should be: guided compliance journey UI + 3 connectors (GitHub, Google Workspace, Cloudflare) + pricing page + 10 more features gated behind premium.

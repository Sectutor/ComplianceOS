# Changelog

All notable changes to this project are documented in this file.

## Unreleased

### Cycle 17 - NIS2 supplier security lifecycle: criticality, posture, incident SLA & monitoring SLA (NIS2 plan Phase 3 Task 3.1) (2026-08-19)
- Backend lib/nis2/supplyChain.ts: pure deterministic NIS2 supply-chain engine (zero deps, never throws, injectable clock) - classifySupplierCriticality (additive 0-100 criticality: essential services +45 / sensitive data +30 / broad network +25 / restricted +15 / subcontractor -10 / spend >= EUR 1M +10, clamped; bands critical>=70/high>=50/medium>=25; review cadence Quarterly/Semi-Annual/Annual/Biennial + nextReviewDate from injected clock; stable rationale, fallback "No criticality factors identified"), scoreSupplierSecurityPosture (8 weighted contractual controls summing to 100: security requirements 20 / incident notification 15 / vulnerability handling 15 / audit rights 12 / subcontracting 10 / termination-exit 10 / data protection 10 / business continuity 8; readiness Strong>=85/Developing>=65/At Risk below/No Data when no answers; gaps in catalog order + gap-derived recommendedActions capped at 5), trackSupplierIncident (notification SLA default 24h significant / 72h else, custom slaHours honoured; deadline = detectedAt + SLA; status precedence acknowledged > submitted > overdue > due (12h window) > pending vs injected clock; signed daysRemaining, null once reported/acknowledged; deterministic kebab incidentId slug, untitled-incident fallback), monitorSecuritySla (cadence-driven statuses: not-tested / breached >2x / at-risk >1x / compliant; daysUntilDue signed; invalid items filtered, zeroed summary on missing input). Complements (does not replace) lib/vendor/vendorRisk.ts TPRM tiers.
- Backend server/routers/supplyChain.ts: createSupplyChainRouter(t, protectedProcedure) - protected pure classifySupplier / scorePosture / trackIncident / monitorSla queries with exported zod schemas (supplyChainClassifySchema / Posture / Incident / Sla); zod BAD_REQUEST only, no DB access; wired as `supplyChain:` in routers.ts (2 lines).
- UI: pages/supplyChainApi.ts typed contract layer (UI-STANDARD sec.16 cast pattern, EMPTY_SUPPLIER_CLASSIFICATION / EMPTY_POSTURE_SCORE / EMPTY_INCIDENT_NOTIFICATION / EMPTY_SLA_MONITOR, retry:false hooks useClassifySupplier/useScorePosture/useTrackIncident/useMonitorSla, SUPPLIER_CRITICALITY_META / POSTURE_READINESS_META / INCIDENT_STATUS_META / SLA_STATUS_META + POSTURE_QUESTION_LABELS/ORDER, DEMO_SUPPLIER_SLA_ITEMS + buildDemoSlaMonitor per sec.17); pages/cyber/SupplyChainLifecyclePanels.tsx "NIS2 Supplier Security Lifecycle" section on SupplyChainRisk (criticality classifier with score bar + rationale + review date; 8-question posture scorecard with readiness badge + gap chips + recommended actions; incident notification tracker with deadline + status badge + days remaining; demo-mode SLA monitor table with amber banner + summary counts; Skeleton/EmptyState degradation, token-only, dark-mode safe); SupplyChainRisk.tsx converted to token-only colors (0 forbidden slate/sky/emerald/amber surface refs, data-viz/token exceptions kept).
- QA: +79 tests (61 engine incl. band boundaries 70/50/25, factor sums + clamp, cadence dates 3/6/12/24mo, readiness bands + No Data vs data-present, status precedence + 12h due window + custom/invalid SLA hours, daysRemaining sign, slug sanitization, invalid-item filtering, determinism + never-throws; 18 router contract incl. route shape/no-mutations, zod BAD_REQUEST per schema, degenerate-but-valid inputs, no-DB assertion, exported schemas) - suite 1023 -> 1102 (60 files), all green; tsc 2041 (0 new in touched files; only pre-existing routers.ts backlog shifted by the 2 wiring lines); smoke green; pushed to origin/dev + github/dev.

- Backend lib/cyber/incidentTimeline.ts: pure deterministic incident timeline & escalation engine (zero deps, never throws, injectable clock) - buildIncidentTimeline (4 ordered phases Detection -> Early warning -> Incident notification -> Final report with deadline anchors reused from incidentClassifier.getReportingDeadlines (24h/72h/30d) and completed/current/upcoming lifecycle + isComplete; malformed input -> EMPTY_INCIDENT_TIMELINE), computeEscalations (deterministic ordered triggers: monitor (info) below Art. 23(3) significance; sev-escalation (warning) for high/critical significant incidents before notification; ew/notif/final-due (warning) inside the 12h window; ew/notif/final-overdue (critical) with dueBy; complete (info) when all reports sent; never throws, no duplicate ids, stable order).
- Backend server/routers/incidentTimeline.ts: createIncidentTimelineRouter(t, protectedProcedure) - protected pure timeline / escalations queries sharing the exported incidentTimelineInputSchema (zod BAD_REQUEST only, no DB access); wired as `incidentTimeline:` in routers.ts (2 lines).
- UI: pages/incidentTimelineApi.ts typed contract layer (UI-STANDARD sec.16 cast pattern, EMPTY_INCIDENT_TIMELINE/EMPTY_ESCALATIONS, retry:false hooks, INCIDENT_PHASE_META / ESCALATION_LEVEL_META + getPhaseMeta/getEscalationMeta/sortEscalations/isEscalationOverdue); CyberIncidentDetail "NIS2 Incident Timeline" panel (4-step vertical timeline with status badges + current-phase highlight, color-coded escalation list with due-by dates + Overdue badges, Skeleton + EmptyState degradation, hidden without detection date); CyberIncidentReporting critical-escalation callout banner; token-only, dark-mode safe.
- QA: +39 tests (28 engine incl. phase order/labels/deadline math, status transitions, clock injection, malformed-input never-throws, determinism, due-window boundaries + overdue suppression + no-duplicate-id sweeps; 11 router contract incl. zod BAD_REQUEST + no-DB assertion) - suite 984 -> 1023 (58 files), all green; tsc 2041 (0 new in touched files; pre-existing trpc.cyber.* + routers.ts backlog unchanged); smoke green; pushed to origin/dev + github/dev.

### Cycle 15 - NIS2 Art. 23 incident classification & reporting deadlines (NIS2 plan Phase 2 Task 2.1) (2026-08-19)
- Backend lib/cyber/incidentClassifier.ts: pure deterministic NIS2 incident engine (zero deps, never throws) — classifyIncident (Art. 23(3) significance across 7 criteria with stable reasons; additive 0-100 severity score weighted public-safety/critical-infra/data-integrity/cross-border/users/duration/loss, clamped 0-100, bands critical>=80/high>=55/medium>=30; ENISA threat category from ordered cause-keyword map over lib/threat-intel/enisa-taxonomy.ts, fallback Other/TH-000; nextDeadline 24h when significant), getReportingDeadlines (24h/72h/30d milestones with pending/due/overdue status vs injectable clock, 12h due window), buildCsirtTemplate (plain-text NIS2 notification addressed to the EU competent authority from lib/nis2/competent-authorities.ts; generic fallback, never throws).
- Backend server/routers/incidentClassifier.ts: createIncidentClassifierRouter(t, protectedProcedure) — protected pure classify / deadlines / csirtTemplate queries (zod BAD_REQUEST only, no DB access); wired as `incidentClassifier:` in routers.ts.
- UI: pages/incidentClassifierApi.ts typed contract layer (UI-STANDARD sec.16 cast pattern, EMPTY shapes, retry:false hooks, getSeverityMeta/getDeadlineMeta/getNextDeadlineLabel helpers); CyberIncidentDetail "NIS2 Classification" panel (severity badge + score bar, significance verdict + reasons list, ENISA category chip, deadline tracker with status badges, CSIRT template preview with EU country select, Skeleton + EmptyState degradation); CyberIncidentReporting quick classification callout; token-only, dark-mode safe.
- QA: +92 tests (80 engine incl. threshold boundaries, malformed input, determinism, clock injection, template variants; 12 router contract incl. zod BAD_REQUEST + no-DB) — suite 892 -> 984 (56 files), all green; tsc 2041 (0 new in touched files; 3 pre-existing trpc.cyber.* errors unchanged vs HEAD); smoke green; pushed to origin/dev + github/dev.

### Cycle 14 - AI compliance copilot productized (scorecard #10 done) (2026-08-19)
- Backend lib/ai/copilot.ts: pure deterministic copilot engine (zero deps, never throws) - draftPolicyDraft (10 topic templates + generic fallback, framework-specific controls, orgName surfaced in title + scope), suggestEvidenceForControl (evidence catalog with freshness hints, stable fallback), autoMapRequirement (0-100 keyword scoring, ranked matches + bestMatch) over a built-in control KB for SOC 2 / ISO 27001 / NIS2 / GDPR / HIPAA / PCI DSS. Tiered keyword matching (verbatim phrase 1.0 > all-token 0.7 > single-token 0.35) fixes 'access control' -> remote-work template mis-selection.
- Backend server/routers/aiCopilot.ts: createAiCopilotRouter(t, protectedProcedure, publicProcedure) factory - protected draftPolicy / suggestEvidence / autoMap mutations (zod BAD_REQUEST only throw, no DB access) + public deterministic status probe; wired as `aiCopilot:` in routers.ts.
- UI: pages/aiCopilotApi.ts typed contract layer (UI-STANDARD sec.16 cast pattern, retry:false hooks, EMPTY_AI_COPILOT_STATUS); AgentPage "Compliance copilot" quick-actions (draft policy / suggest evidence / auto-map cards, token-only, Skeleton loading + EmptyState degradation when endpoint not live).
- QA: +33 tests (22 engine unit incl. framework-distinct controls, determinism, no-throw; 11 router contract incl. zod BAD_REQUEST + no-DB status) - suite 859 -> 892 (54 files), all green; tsc 0 new errors in touched files (routers.ts 55 = 55 vs HEAD); smoke green.
- Cycle-13 follow-up committed: AuditManager converted to auditApi contract layer; trustCenter registered with publicProcedure (public posture page semantics, matches createTrustCenterRouter signature).

### Cycle 13 - Trust center + audit management parity (scorecard #8/#9 done) (2026-08-19)
- Backend server/routers/trustCenter.ts: hardened all public procedures with graceful DB degradation (never throw on DB failure - neutral/empty shapes); new public `getPosture` procedure (client profile + latest complianceSnapshot score/status Strong/Developing/At Risk/No Data + implemented/total controls + trust documents; empty neutral shape on DB failure/unknown client); competitor block preserved.
- Backend lib/reporting/auditPackageGenerator.ts: extracted pure helpers (computePassRate, buildControlsCsv, buildAuditManifestJson) + structured AuditPackageError (DB_UNAVAILABLE/CLIENT_NOT_FOUND/GENERATION_FAILED); server/routers/auditPackage.ts translates to TRPCError (NOT_FOUND/INTERNAL_SERVER_ERROR).
- UI: token-only conversion of TrustCenter.tsx / AuditHub.tsx / AuditManager.tsx per UI-STANDARD sec 2 (592 -> 0 hard-coded slate/gray/white/indigo surface refs; data-viz exceptions retained with dark: variants; invalid /100/ opacity chains fixed; ring/divide slate -> tokens); TrustCenter now surfaces trustCenter.getPosture (score badge + status + implemented/total) with EmptyState/Skeleton degradation; new typed contract layers pages/trustCenterApi.ts + pages/auditApi.ts (UI-STANDARD sec 16 cast pattern, 0 new tsc errors).
- QA: +34 tests (trustCenterRouter 21 contract/degradation tests, auditPackageGenerator 10 pure-helper tests, uiTokenPurity 3 static gate tests); suite 825 -> 859 (52 files); tsc 2043 -> 2043 (0 new in touched files); smoke green.
### Cycle 12 - Questionnaires & surveys auto-scoring (scorecard #6 done) (2026-08-19)
- Backend lib/questionnaire/questionnaireScoring.ts: deterministic pure scoring engine - per-answer classification (pass/partial/fail/neutral/unanswered), focus-area aggregation with per-area 0-100 scores, completionRate, complianceScore 0-100, readiness levels (Strong/Developing/At Risk/No Data), summarizeScore (label/tone/description); zeroed "No Data" on non-array/malformed input, never throws.
- Backend lib/questionnaire/templates.ts: built-in SIG Lite (~20 questions across Governance/Access Control/Data Protection/Security Testing/Cryptography/Incident Response/Vendor Mgmt/HR) + CCM CAIQ v4 (all 15 CCM domains: AIS/BCR/CCC/CEF/DSI/DCS/GRM/HRS/IVS/LOG/MON/SEF/STA/TVM/UEM); questionCount derived, unique ids, known responseTypes only.
- Router refactored to createQuestionnaireRouter(t, clientProcedure, publicProcedure) factory (test-harness friendly); new `score` procedure (DB-backed, never throws - DB failure -> empty score readiness "No Data", unknown id -> null) and `scoreAnswers` (pure passthrough).
- UI: questionnaireApi.tsx contract layer (UI-STANDARD sec 16: useQuestionnaireScore, ScoreBadge/ScoreProgress/getReadinessMeta/getScoreToneClass/getScoreBarClass); QuestionnairesDashboard per-row Score column (badge + progress, Skeleton while loading, dash on error/empty, colSpan 8); QuestionnaireWorkspace score/readiness surfacing; token-only polish (bg-muted/border-border/bg-card/text-destructive, dark-mode status badges).
- Conductor fixed 1 new tsc error (getScoreBarClass null-acceptance). Known follow-up: neutral answers count toward `answered` (completionRate/complianceScore) - asserted as spec.
- Tests: 72 new (39 scoring incl. readiness-boundary/edge/malformed cases, 19 templates integrity + CCM domain coverage, 14 router incl. zero-rows empty score) - 753 -> 825 (49 files), all green; coverage 100% on the 5 configured targets; tsc 3614 -> 3612 (0 new in touched files).

### Cycle 11 - TPRM per-vendor risk tiering (scorecard #5 done) (2026-08-18)
- Backend lib/vendor/vendorRisk.ts: pure, deterministic per-vendor risk engine - inherent risk by data-access class (PII/ePHI/Infrastructure -> critical), residual score 0-100 (higher = safer) from SOC2 attestation / latest threat-intel scan / open high-critical assessments / contract / DPA / subprocessor signals, Tier 1 (Critical) / Tier 2 (High) / Tier 3 (Medium) mapping at <50/<75, quarterly/semi-annual/annual review cadence + next-review date (injectable clock), 3-5 recommended actions, portfolio overview (tier counts, avg residual score, due-for-review list).
- tRPC vendorRisk router (getOverview / getVendorRisk): client-scoped queries over vendors, scans, assessments, contracts, DPAs (schema-verified); latest-scan selection ignores rows without a risk score (no broken-scan shadowing); Draft contracts no longer count as active; NEVER throws on read - DB failure returns an empty overview; unknown vendor -> NOT_FOUND.
- UI: vendorRiskApi.ts contract layer (UI-STANDARD sec 16); VendorDashboard risk overview (tier stat cards, residual score bars, next-review due list); VendorList per-vendor "Risk Tier" column (tier badge + next-review date, Skeleton while loading, dash on error/empty); VendorDetails "Vendor Risk" card (residual score bar, tier badge, review frequency, next review, recommended actions, EmptyState degradation); token-only dark-mode polish across TPRM pages (VendorOverview/GlobalVendorCatalog/SecurityReviews/SubprocessorRegister/TPRMLayout/DPA empty states).
- Tests: 87 new (54 engine boundaries/signals/overview + 24 lib + 9 router contract w/ mocked db) - 666 -> 753 (46 files), all green; tsc 0 new errors in touched files (0 in all new files).

### Cycle 9 - Enterprise SSO (OIDC + reverse-proxy header auth) (scorecard #13) (2026-08-18)
- Backend lib/sso/oidc.ts: OIDC discovery, authorization-code URL builder, token exchange, RS256 ID-token verification against the IdP JWKS (issuer/audience/exp/iat/nonce checks, node crypto), claim mapping with configurable role claim, single-flight 10-minute state store. All network access injectable-fetch for tests.
- Backend lib/sso/proxy-auth.ts: reverse-proxy header SSO (Traefik/Nginx/Authentik style) - case-insensitive header lookup on configurable principal/email headers, namespaced openId (sso_proxy:<email>).
- tRPC sso router (status/start/callback) wired into routers.ts: start generates state+nonce and returns the IdP authorization URL; callback consumes state single-flight, exchanges the code, verifies the ID token, upserts the user by openId (loginMethod 'sso') and issues a localAuth session JWT. status never echoes secrets.
- authMiddleware: proxy-SSO support - when enabled and no Authorization header, resolves the principal from configured headers and upserts the user (loginMethod 'sso_proxy').
- Config: SSO_OIDC_* / SSO_PROXY_* env vars added to _core/env.ts and documented in .env.example (no secrets).
- UI: ssoApi.ts contract layer (UI-STANDARD sec 16), LoginPage "Continue with SSO" button shown only when sso.status reports OIDC mode, new /auth/sso/callback page (stores session token exactly like local auth, reloads into the app), read-only SSO status card on Security settings (token-only, dark-mode safe).
- Tests: 43 new (30 oidc incl. real RS256/JWKS mocking + negative cases, 10 proxy-auth, 3 router) - 623 -> 666 (43 files), all green; coverage 100% on the 5 configured targets; tsc 2046 -> 2046 (0 new).

### Cycle 8 - Webhook system (scorecard #15) + scorecard reconciliation (2026-08-18)
- Webhook registry hardened: bounded retries with exponential backoff (default 2; 4xx never retried; injectable fetch for tests), updateWebhookSubscription / deleteWebhookSubscription / listWebhookEventCatalog, recursive secret scrubbing on dispatched + logged payloads, and dispatch that never throws (graceful DB degradation, per-write guards).
- New lib/webhooks/webhookEvents.ts: single-source event catalog (test.ping, evidence.expired, control.autotest.failed, risk.created, policy.ack.overdue, "*") + safeDispatchWebhookEvent fire-and-forget dispatcher (setImmediate, never blocks callers).
- Router: webhooks.updateSubscription / deleteSubscription / listEventCatalog added; subscribe/update events validated against the catalog; listDeliveries limit bounded (1-200); TRPCError-wrapped.
- Real event wiring (non-blocking): evidence.expired (renewal loop x3), control.autotest.failed (auto-test engine), policy.ack.overdue (reminder sweep), risk.created (high/critical upsert).
- UI: token-only Webhooks page (/clients/:id/webhooks + /webhooks alias + nav) - stat cards, subscriptions CRUD with enable/disable switch, test-ping trigger, deliveries table, create dialog with one-time secret reveal, per-procedure EmptyState degradation; webhooksApi.ts contract layer per UI-STANDARD sec 16.
- Tests: 565 -> 623 (40 files), all green; coverage 100% on the 5 configured targets; tsc 2046 -> 2046 (0 new; 0 errors in all new files).
- Scorecard reconciliation: TPRM (#5), questionnaires (#6), trust center (#8), audit management (#9), integrations/API (#13) rows updated to reflect existing implementations (previously "None").

### Cycle 7 — GRC cross-module integration, market-readiness hardening, CI (2026-08-17)

**GRC cross-module integration (information now flows between modules):**
- New `lib/grc-integration.ts`: idempotent `findOrCreateTask` (dedupes on related entity + open status) and `notifyClientOnce` (≈daily notification dedupe) shared by all propagation flows.
- Audit findings: high/critical findings auto-create a remediation task on the client task board and notify client users (`findings.create`).
- Control auto-tests: failing scheduled runs emit one deduped summary notification per client per day (scheduler layer; engine stays pure).
- Evidence expiration: each item flipped to `expired` creates a renewal task (deduped) in addition to existing warnings.
- Incidents: high/critical incidents auto-create a draft risk-register entry; continuity-triggered incidents prompt a BC activation assessment; all incidents notify.
- Vendors: completing an assessment with high/critical residual risk updates vendor criticality and upserts a "Vendor risk: <name>" register entry.
- DSAR: new `dsarDeadlineScheduler` (daily) — 7-day warnings + overdue alerts as notifications, overdue DSARs as critical tasks; wired in `server_entry.ts`.
- Unified action center: `actions.listAll` now aggregates risk treatments, open audit findings, and ≤7-day/overdue DSARs alongside POA&Ms/roadmap/project/generic tasks; `updateStatus` supports all types with allowed-value guards; previously-ignored `type`/`assigneeId` filters now applied.

**Fixed broken integrations (schema drift / silent failures):**
- `treatmentControls.updatedAt` written though the column doesn't exist — aborted the Evidence→Control→Treatment→Risk recalculation chain (`evidence.ts`, `risks.ts`).
- Gap→risk lineage: `gapResponseId` sent by the gap UI was stripped by zod; now accepted and persisted (`risks.upsert`).
- `getRiskTreatments` never returned linked controls (write-only linkage); now returns `linkedControls` per treatment.
- Executive metrics always zero: BIA completion rate (wrong columns `criticality`/`biaStatus` → `criticalityTier` + BIA join) and critical-vendor risk (non-existent `vendors.riskScore` → trust-score based).
- Breach split-brain: metrics read the unused `dataBreaches` table while the register UI writes `BREACH:` privacy assessments; metrics now merge both stores.
- Task creation was broken app-wide: `actions.create` inserted non-existent `source_type` column; removed, and `relatedEntityType`/`relatedEntityId` inputs added for entity linking.
- Dead `kris` router mount removed (inline router was the live one; duplicate key shadowed the module).
- Deleted dead-and-broken `scalable-dashboard.ts` (unmounted, referenced non-existent columns).

**Fabricated data eliminated (trust):**
- `dashboard.complianceScores` returned a hardcoded fake improving trend (`20 + i*12 + random`); now real monthly averages from compliance snapshots with live-score fallback. Verified deterministic via API.
- `complianceMonitor.getComplianceScore` layered `Math.random()` onto the score; now deterministic healthy/total ratio.
- Autopilot `trigger` invented per-category stats (×0.3/×0.2/×0.5); now returns real engine outcomes.
- VRM trust-center analysis (deterministic demo generator) is now explicitly labeled: `simulated: true` flag, prefix in stored risk summary, and a visible UI disclaimer.

**Platform / UX:**
- New weekly compliance snapshot scheduler so trend charts populate automatically (skips <6-day-old snapshots).
- Compliance monitor cron (hourly health checks + drift events) — implemented but never scheduled since inception — now wired.
- `/api/version` endpoint (package version, node, env, build type, uptime); `/api/health` reports the real package version.
- AI first-run gating: `llm.status` procedure + `useAiConfigured` hook; Generate-with-AI disabled with a clear hint until a real provider key exists; AI errors surface actionable tRPC messages with an "AI Settings" toast action.
- LLM service: fast-fails on demo placeholder API keys with an actionable message; Anthropic client gets the same browser-detection cloak as OpenAI.
- Auto-test history rows are clickable: drill-in dialog shows per-check findings, "View control" opens the details sheet, "Add to task board" creates a linked remediation task.
- Design tokens: `--color-brand`/`--color-brand-bright` added; 764 hardcoded `#1C4D8D`/`#3ABEF9` arbitrary values swept to tokens across 91 files; shared Tabs restyled to token-based segmented control (theme-aware, dark-mode safe).
- Cookie consent now shows only on public marketing pages (was greet-blocking the app on unmatched routes).
- License cache-miss warning logs once per process instead of every request.
- Hot-path debug logging removed (db.ts, clients/controls routers, report generator, LLM client).
- Link-integrity vitest gate added: every internal link literal is checked against registered routes (caught-class: governance dashboard → nonexistent `/clients/:id/risk-register` 404, fixed with link corrections + redirect aliases for `/policies`, `/assets`, `/clients/:id/risk-register`).
- Production build fixed: three components imported non-existent `../utils/trpc` (escaped typecheck, failed vite build); build script now sets `--max-old-space-size=8192` via cross-env (default heap OOMs); `cross-env` installed as a real devDependency.
- CI pipeline: typecheck + lint (hard gate, 5 `any` warnings fixed) + 524-test suite (env-independent, verified without `.env`) + production build; 30-min timeout, Node 24, npm cache, status badge in README.
- README: correct first-boot credentials (`admin@complianceos.local` + startup-log password / `COMPLIANCE_ADMIN_PASSWORD`), dev quickstart (ports, no-hot-reload note), canonical Docker deploy path.
- Tests: 482 â†’ 524 (33 files), all green; typecheck clean.
- Access review automation (scorecard P2 #7): access_review_cycles/tasks schema + migration 0022, `accessReviews` lib (idempotent per-user Ã— role provisioning, certify/revoke with notes + reviewer, overdue sweep with injected clock, summary/history; DB fallback), 9-procedure tRPC router, 12h overdue scheduler, and a token-only AccessReviews page (stat cards, expandable cycles, certify/revoke workflow, history feed, contract layer with graceful EmptyState degradation).
- Verified final: tests 524 â†’ 565 (37 files) all green, coverage 100% on the 5 configured targets, tsc 2045 â†’ 2041 (0 new errors; 7 new errors the feature batch introduced were fixed â€” vendorAssessments duplicate import, msspGovernanceService clientSummaries typing); MsspPartnerPortal token-only pass; internal-links gate green.
- Follow-up (same cycle): global search extended to risk / vendor / task / audit_finding (new db.globalSearch sections + routers type enum + GlobalSearch icons/labels, duplicate switch cases deduped); tsc fixes â€” mui-theme Shadows tuple completed (25th entry), App.tsx unused Theme import removed, tRPC transformer log message stringified. tsc unique signatures 1619 -> 1612 (0 new vs HEAD).

### Cycle 6 - Evidence renewal + policy ack assignment/reminders + framework library (2026-08-14)
- Scorecard #14 (evidence expiration & renewal) completed: renewal loop with auto-remediation.
  - Backend: `evidenceRenewal` lib (due-for-renewal horizon via `buildDueForRenewalWhere`, `getRenewalStateSummary`, `runEvidenceRenewal` with renewed/expired/skipped/failed counts + remediation notes), tRPC router (`evidenceRenewal.getSummary`/`runNow`, zod-validated) wired into `routers.ts`, scheduler wired in `server_entry.ts` (guarded by `ENABLE_EVIDENCE_RENEWAL_SCHEDULER`).
  - UI: `EvidenceRenewalPanel` on the Evidence page - live summary when the endpoint is up, graceful fallback to `evidenceExpiry.getStats` with a "Derived from workspace data" badge (UI-STANDARD §16); token-only, dark-mode safe.
- Scorecard #4 (policy management + ack) completed: employee assignment + reminders.
  - `assignPolicy` (idempotent; explicit userIds or all client-linked users via `user_clients`), `listOverdueAcks`/`selectAcksDueForReminder`/`runPolicyAckReminders` (3-day threshold), `policyAck.assign` procedure, `policyAckReminderScheduler` (12h interval, `ENABLE_POLICY_ACK_REMINDERS`), `PolicyAcknowledgmentPanel` rewrite with assignment UI.
- Scorecard #11 (framework coverage) completed: SOC 2 / PCI DSS v4 / HIPAA / SOX control manifests (`frameworkSeed` + `applyFrameworkControls`) + presentational `FrameworkLibraryPanel` on the Frameworks Dashboard.
- Risk heat map: `normalizeSummaryStatus` unifies DB (planned/in_progress/implemented/verified) and UI (open/in-progress/mitigated/accepted) treatment status vocabularies.
- Tests: 412 -> 482 (30 files), all green; coverage 100% on the 5 configured targets; tsc 2044 -> 2041 (0 new errors, 3 fixed in touched files).

### Cycle 5 - Collector connections + credential management + UI triggers (2026-08-14)
- Scorecard #1 (automated evidence collection) completed: collector connections + credential management + UI triggers.
  - Backend: `evidenceCollectorConnections` lib (masked credentials, secrets never returned; provider manifests from the evidence registry; DB-backed with in-memory fallback; idempotent self-registration of the five built-in collectors) + `evidenceCollectors` tRPC router (`listProviders`/`list`/`save`/`remove`/`test`/`run`) wired into `routers.ts`.
  - UI: `CollectorConnectionsPanel` on the Evidence page replaces the static strip - per-provider status chips, dynamic credential form rendered from manifests (password/select/number/boolean), Test connection, Run-now trigger with live evidence summary, delete with confirm; token-only per UI-STANDARD, dark-mode safe.
  - Tests: 374 → 412 (28 files), all green. tsc: no new errors in touched files.

### Cycle 4 - Cloud evidence collectors + per-client auto-test schedules (2026-08-14)
- Shipped AWS / Azure / GCP automated evidence collectors (scorecard #1): three new manifest-driven, injectable-fetch collectors registered in the evidence registry (`aws`, `azure`, `gcp`).
  - AWS: `aws.iam-access-key-age` (90d rotation, 60d warning), `aws.s3-bucket-encryption`, `aws.ec2-public-ports`, `aws.cloudtrail-enabled`.
  - Azure: `azure.mfa-status`, `azure.defender-plan-status`, `azure.storage-encryption`, `azure.sql-auditing-enabled`.
  - GCP: `gcp.gcs-bucket-public-access`, `gcp.iam-sa-key-rotation`, `gcp.compute-disk-encryption`, `gcp.cloudsql-ssl-required`.
  - Each collector degrades gracefully (missing credentials / malformed payloads -> `error` evidence, never throws), honors injected clock / TTL / limit, and exports `create{Cloud}EvidenceCollector(fetch?)` for testability.
- Shipped per-client control auto-test schedules (scorecard #2): `client_auto_test_schedules` table + drizzle schema, `isAutoTestDue` / `getClientAutoTestSchedule` / `touchClientAutoTestRun` / `setClientAutoTestSchedule` in the auto-test engine, scheduler skips disabled/not-due clients and records last run, and `controlMonitoring.getScheduleConfig` / `updateScheduleConfig` (intervalHours 1-168, zod-validated).
- UI: Auto-test schedule panel on the Controls page (enable toggle, 1/6/12/24h interval, last-run display) + an "Automated evidence sources" strip on the Evidence page; all token-only per UI-STANDARD.md.
- Tests: 271 -> 374 across 26 files (cloud collector suites + schedule config + router validation), 100% coverage on the 5 configured targets; `npx tsc` adds zero new errors in touched files.


### Cycle 3 — Risk heat map, policy ack, real-time dashboard (2026-08-14)
- Shipped risk heat map + treatment plans (scorecard #3): 5x5 likelihood x impact matrix, per-cell drill-down via `riskHeatmap.listTreatmentPlans`, treatment summaries and forward-only status transitions, new `/clients/:id/risks/heatmap` route.
- Shipped policy acknowledgment workflow (scorecard #4): `policy_acknowledgements` table, `policyAck` router (list / listPending / acknowledge-by-id / listForPolicy / summary) and a PolicyAcknowledgmentPanel on the Client Policies page.
- Shipped real-time dashboard stats (scorecard #12): `dashboard.getStats` (posture score, framework pass rates, evidence coverage, 30-day trend) with a Vanta-style PostureSummary on the Dashboard (falls back to derived stats from `dashboard.enhanced`).
- P0 #2: added a Control Auto-Tests section to the Controls page (run-all trigger + recent run history via `controlMonitoring`).
- Backend aligned to the UI-STANDARD section-16 data contract (riskHeatmap.listTreatmentPlans, policyAck.list/acknowledge, dashboard.getStats).
- Fixed smoke test: Prowler runner gained a `mock` option; `npm run smoke` no longer fires a live Docker scan with placeholder credentials.
- Tests: 192 -> 271 across 18 files (3 new contract suites + evidence-collector regressions), 100% coverage on the 5 configured targets.

### Continuous Control Monitoring (P0)
- Wired the control auto-test engine into tRPC via a new controlMonitoring router (runControlAutoTest, runAllForClient, history) mounted on the app router.
- Added an offline guard to the control auto-test scheduler so an unreachable/non-local database logs once and skips instead of spamming TLS errors.
- Added dbUrl helper (resolveDatabaseUrl, createSafePgOptions) used by the addon init path and schedulers for safe local/remote connection handling.

### Automated Evidence Collection (P0)
- Added an evidence collection scheduler (evidenceScheduler.ts) that runs due evidence rows through the collector registry and persists collected artifacts.
- Added a generic HTTP/API evidence collector (manifest-driven, injectable fetcher, JSON payload normalization) alongside the existing GitHub collector.

### User Experience
- Added reusable PageHeader and StatCard UI components; migrated Controls, Evidence, Login, Security, Vendor List, and Client Policies pages to token-based styling with dark-mode support.
- Added primary-cta / primary-cta-hover color tokens (brand navy) for the default button variant.

### Testing
- Added unit tests: control auto-test engine (16), evidence scheduler (6), HTTP/API collector (13), plus edge cases for the cache manager and evidence collector. Suite: 192 tests across 12 files, 100% coverage on the 5 configured targets.

### Reliability
- Standardized tRPC server error logging with a correlation `errorId`, and sanitized internal error messages in production builds.
- Removed unsafe database URL logging from DB initialization while preserving useful connection lifecycle logging.
- Improved environment health-check logging to use structured server logging.

### Performance
- Fixed cache key generation for API response caching and corrected cache error-rate calculations.
- Optimized in-memory cache maintenance by adding LRU behavior and throttling expiration scans to reduce per-write overhead.
- Added runnable benchmark and load-test scripts under `scripts/performance/` to measure critical-path improvements.

### User Experience
- Improved Clients page reliability by removing noisy debug logs, adding a retryable error empty state, and validating required input before create.

### Testing
- Repaired root test imports by adding thin re-export entrypoints for `db`, `routers`, and `TrpcContext`.
- Added unit tests for business-logic utilities with edge-case coverage.
- Added coverage tooling and a `test:coverage` script, enforcing >=90% coverage for the targeted business-logic modules.


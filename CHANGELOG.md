# Changelog

All notable changes to this project are documented in this file.

## Unreleased

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


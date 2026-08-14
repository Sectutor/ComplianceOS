# Changelog

All notable changes to this project are documented in this file.

## Unreleased

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


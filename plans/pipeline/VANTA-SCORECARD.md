# VANTA-SCORECARD — ComplianceOS Parity Tracker

> Definition of done for the continuous build pipeline. Source: `docs/vanta-feature-map.md`.
> Status: ⬜ Not started | 🟨 In progress | 🟩 Done | 🔒 Blocked
> Last updated: 2026-08-14 (cycle 5 complete — commit 007a11f)

## Cycle log
- **Cycle 5** (007a11f): Collector connections + credential management + UI triggers (P0 #1 complete) — evidenceCollectorConnections lib (masked credentials, never expose secrets; DB-backed with in-memory fallback; provider manifests from the evidence registry; self-registering built-ins), evidenceCollectors tRPC router (listProviders/list/save/remove/test/run, zod-validated, TRPCError-wrapped), wired into routers.ts. UI: CollectorConnectionsPanel on Evidence page replaces the static strip — per-provider status chips, dynamic credential form from manifests (password/select/number/boolean fields), Test connection, Run-now trigger with live summary, delete with confirm, token-only per UI-STANDARD, dark-mode safe. Tests 374 → 412 (28 files), tsc: 0 new errors in touched files (Evidence/routers errors verified pre-existing).
- **Cycle 4** (b616e84): AWS/Azure/GCP evidence collectors (P0 #1) — 3 manifest-driven, injectable-fetch collectors (12 evidence types total: IAM key age / S3 encryption / EC2 public ports / CloudTrail; MFA / Defender / storage encryption / SQL auditing; bucket public access / SA key rotation / disk encryption / Cloud SQL SSL) registered in the evidence registry with graceful degradation + injected clock/TTL/limit. Per-client auto-test schedule config (P0 #2) — client_auto_test_schedules table + isAutoTestDue/getClientAutoTestSchedule/touchClientAutoTestRun/setClientAutoTestSchedule, scheduler skips disabled/not-due clients, controlMonitoring.getScheduleConfig/updateScheduleConfig (1-168h, zod). UI: Auto-test schedule panel on Controls (toggle + 1/6/12/24h + last-run) + Evidence-page "Automated evidence sources" strip, token-only per UI-STANDARD. Tests 271 → 374 (26 files), coverage 100% on 5 targets, tsc: 0 new errors in touched files (Controls/Evidence page errors verified pre-existing).
- **Cycle 3** (c3e6e68): Risk heat map + treatment plans (P1 #3) shipped - 5x5 likelihood x impact matrix, per-cell drill-down (listTreatmentPlans), treatment summaries + status transitions, RiskHeatmapPage route. Policy ack (P1 #4) - policy_acknowledgements schema + policyAck router (list/listPending/acknowledge-by-id/listForPolicy/summary) + PolicyAcknowledgmentPanel on ClientPoliciesPage. Real-time dashboard (P1 #12) - dashboardStats aggregation lib + dashboard.getStats (posture score, framework pass rates, evidence coverage, 30-day trend) + Vanta-style PostureSummary with enhanced-payload fallback. P0 #2 UI trigger - Control Auto-Tests section on Controls page (runAllForClient + history). Smoke fixed: Prowler mock option (no more live Docker scan with fake creds). Backend aligned to UI-STANDARD section 16 contract (riskHeatmap.listTreatmentPlans, policyAck.list/acknowledge, dashboard.getStats). Tests 192 -> 271 (18 files), coverage 100% on 5 targets, tsc no new errors in touched files.
- **Cycle 1** (78ee770): Local Supabase running (DB connected, health 200). AddonScheduler db.select + Date-binding bugs fixed. P0 evidence-collection integration framework skeleton + GitHub collector built (integrations/collector.ts). Vanta UI polish on Clients/Dashboard/NotFound/sidebar + UI-STANDARD.md. Tests 101 → 147 (9 files), all green.
- **Cycle 2** (c439fed): Control auto-test engine wired into tRPC (controlMonitoring router: runControlAutoTest / runAllForClient / history) + offline guard in scheduler (no more TLS spam to dead remote). Evidence collection scheduler + HTTP/API collector added (P0 #1 auto-collect). dbUrl helper (resolveDatabaseUrl/createSafePgOptions) used by addon-init + schedulers. UI token-only polish on Controls/Evidence/Login/Security/VendorList/ClientPolicies + PageHeader/StatCard components + primary-cta tokens. Tests 147 → 192 (12 files), coverage 100% on 5 targets. tsc: no new errors in touched files (2 dbUrl errors fixed).

| # | Feature | Vanta | ComplianceOS today | Priority | Status |
|---|---------|-------|--------------------|----------|--------|
| 1 | Automated evidence collection | 200+ integrations, 24h auto-collect | Framework + GitHub + HTTP/API + AWS + Azure + GCP collectors, scheduler wired (startEvidenceScheduler), per-connection credential management (masked, never exposed) + connection UI + test/run triggers (cycle 5) | P0 | 🟩 |
| 2 | Continuous control monitoring | Controls auto-tested on schedule | Engine wired via tRPC + UI trigger on Controls page + per-client schedule config (enable/interval, getScheduleConfig/updateScheduleConfig) | P0 | 🟩 |
| 3 | Risk heat map + treatment plans | Full visual matrix + workflow | 5x5 matrix + drill-down + treatment status workflow (cycle 3) | P1 | 🟩 |
| 4 | Policy management + ack | Templates, versioning, employee ack | Templates + ack workflow (list/acknowledge-by-id, panel on ClientPolicies) | P1 | 🟨 next: employee assignment + reminders |
| 5 | TPRM / vendor risk | Vendor assessments, questionnaires, monitoring | Vendor records only | P2 | ⬜ |
| 6 | Questionnaires & surveys | SOC2/ISO/CAIQ/SIG prebuilt, auto-scoring | None | P2 | ⬜ |
| 7 | Access review automation | Auto-provisioned reviews + certification | None | P2 | ⬜ |
| 8 | Trust center | Public posture page | None | P2 | ⬜ |
| 9 | Audit management | Evidence packages, auditor portal | Board report PDF only | P2 | ⬜ |
| 10 | AI-powered compliance | Auto-map, suggest evidence, draft policies | Hermes chat agent; not productized | P3 | ⬜ |
| 11 | Framework coverage | SOC2/ISO/HIPAA/PCI/GDPR/NIST/FedRAMP/SOX | NIS2, DORA, GDPR, ISO 27001:2022, NIST CSF + custom builder | P1 | 🟨 needs SOC 2, PCI DSS, HIPAA, SOX |
| 12 | Real-time dashboard | Score, pass rate, coverage, trends, drill-down | dashboard.getStats + PostureSummary (score/coverage/trend) | P1 | 🟩 |
| 13 | Integrations & API | REST API, marketplace, webhooks, SSO | REST API exists; no marketplace/webhooks | P2 | ⬜ |
| 14 | Evidence expiration & renewal | Expiry tracking + auto-remediation | evidenceExpirationScheduler exists; no auto-remediation | P1 | ⬜ |
| 15 | Webhook system | Events out | None | P2 | ⬜ |

## Health (runtime)
- [x] App boots (Vite dev server, port 5173)
- [x] Unit suite green (412 tests, 28 files)
- [x] Smoke test green (`npm run smoke`)
- [x] Local Supabase running (DB connected, health 200 on :3005, Studio on :54323)
- [x] AddonScheduler `db.select` + Date-binding bugs fixed
- [x] ControlAutoTestScheduler offline guard (no TLS spam; skips when no local DB)

## Definition of Done (per cycle)
1. `npx vitest run` green (no regressions)
2. `npx tsc -p packages/core/tsconfig.json --noEmit` clean for touched files
3. Scorecard status updated, commits on `dev`, changelog line added

# VANTA-SCORECARD — ComplianceOS Parity Tracker

> Definition of done for the continuous build pipeline. Source: `docs/vanta-feature-map.md`.
> Status: ⬜ Not started | 🟨 In progress | 🟩 Done | 🔒 Blocked
> Last updated: 2026-08-14 (cycle 1 kickoff)

| # | Feature | Vanta | ComplianceOS today | Priority | Status |
|---|---------|-------|--------------------|----------|--------|
| 1 | Automated evidence collection | 200+ integrations, 24h auto-collect | Manual + CISOvault only | P0 | 🟨 integration framework in progress |
| 2 | Continuous control monitoring | Controls auto-tested on schedule | Static, manual evidence | P0 | 🟨 control-test engine in progress |
| 3 | Risk heat map + treatment plans | Full visual matrix + workflow | Phase 2 exists, not activated | P1 | ⬜ |
| 4 | Policy management + ack | Templates, versioning, employee ack | 13 templates, CRUD, review scheduler; no ack workflow | P1 | ⬜ |
| 5 | TPRM / vendor risk | Vendor assessments, questionnaires, monitoring | Vendor records only | P2 | ⬜ |
| 6 | Questionnaires & surveys | SOC2/ISO/CAIQ/SIG prebuilt, auto-scoring | None | P2 | ⬜ |
| 7 | Access review automation | Auto-provisioned reviews + certification | None | P2 | ⬜ |
| 8 | Trust center | Public posture page | None | P2 | ⬜ |
| 9 | Audit management | Evidence packages, auditor portal | Board report PDF only | P2 | ⬜ |
| 10 | AI-powered compliance | Auto-map, suggest evidence, draft policies | Hermes chat agent; not productized | P3 | ⬜ |
| 11 | Framework coverage | SOC2/ISO/HIPAA/PCI/GDPR/NIST/FedRAMP/SOX | NIS2, DORA, GDPR, ISO 27001:2022, NIST CSF + custom builder | P1 | 🟨 needs SOC 2, PCI DSS, HIPAA, SOX |
| 12 | Real-time dashboard | Score, pass rate, coverage, trends, drill-down | Basic API summary/report | P1 | ⬜ |
| 13 | Integrations & API | REST API, marketplace, webhooks, SSO | REST API exists; no marketplace/webhooks | P2 | ⬜ |
| 14 | Evidence expiration & renewal | Expiry tracking + auto-remediation | evidenceExpirationScheduler exists; no auto-remediation | P1 | ⬜ |
| 15 | Webhook system | Events out | None | P2 | ⬜ |

## Health (runtime)
- [x] App boots (Vite dev server, port 5173)
- [x] Unit suite green (101 tests, 6 files)
- [x] Smoke test green (`npm run smoke`)
- [ ] Server DB connectivity (Supabase pooler rejects tenant `erjlkrtccmlrvsjtpppp` — needs project unpause or local Postgres)
- [ ] AddonScheduler `db.select` bug fixed

## Definition of Done (per cycle)
1. `npx vitest run` green (no regressions)
2. `npx tsc -p packages/core/tsconfig.json --noEmit` clean for touched files
3. Scorecard status updated, commits on `dev`, changelog line added

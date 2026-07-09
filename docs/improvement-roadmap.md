# GRCompliance → Vanta Improvement Roadmap

Daily incremental improvements tracked here.
Each run picks the next `pending` item and executes it.

---

## Status Key
- DONE
- IN PROGRESS
- PENDING
- BLOCKED

---

## Phase 0: Foundation (Week 1)

| # | Improvement | Type | Status | Run Date | Notes |
|---|------------|------|--------|----------|-------|
| 1 | Activate Phase 2 features — risk heat map + treatment plans + audit trail + DPIA | Server | DONE | 2026-07-09 | Phase 2 activated via phase2-activator.js |
| 2 | Seed SOC 2 framework — all Trust Service Criteria + controls | Data | DONE | 2026-07-09 | 26 controls seeded across 11 categories (Security, Availability, Confidentiality, Privacy) |
| 3 | Seed PCI DSS v4.0 framework — 12 requirements, 300+ controls | Data | PENDING | 2026-07-09 | Manual: see vanta-feature-map.md |
| 4 | Seed HIPAA Security Rule framework — admin/physical/technical safeguards | Data | PENDING | — | Via custom framework builder API |
| 5 | Add compliance score API endpoint — weighted pass rate across all frameworks | Server | PENDING | — | New /api/v1/compliance-score |
| 6 | Add evidence expiry alerting — notify owners 30/14/7 days before expiry | Server | PENDING | — | Enhance evidenceExpirationScheduler |
| 7 | Build control auto-testing engine — schedule periodic control checks | Server | PENDING | — | New scheduler + API |

## Phase 1: Automation (Week 2)

| # | Improvement | Type | Status | Run Date | Notes |
|---|------------|------|--------|----------|-------|
| 8 | Integration framework — webhook system for external triggers | Server | PENDING | — | POST /api/webhooks, event registry |
| 9 | Build automated evidence collector framework | Server | PENDING | — | API + scheduler to collect from integrations |
| 10 | Add real-time compliance dashboard endpoint | Server | PENDING | — | Aggregated view across frameworks/clients |
| 11 | Evidence coverage gap analysis — auto-detect missing controls | Server | PENDING | — | Enhance /gaps with trend data |
| 12 | Continuous control monitoring dashboard widget | UI | PENDING | — | Control pass/fail by framework |

## Phase 2: Enterprise TPRM (Week 3)

| # | Improvement | Type | Status | Run Date | Notes |
|---|------------|------|--------|----------|-------|
| 13 | Vendor risk assessment module — questionnaire + scoring | Server | PENDING | — | Full TPRM sub-module |
| 14 | Pre-built questionnaire templates (CAIQ, SIG, SOC 2) | Data | PENDING | — | Seed questionnaire library |
| 15 | Employee policy acknowledgment workflow | Server | PENDING | — | Policy read + sign-off flow |
| 16 | Access review automation — periodic review cycles | Server | PENDING | — | Review schedule + certification |

## Phase 3: Portal & Audit (Week 4)

| # | Improvement | Type | Status | Run Date | Notes |
|---|------------|------|--------|----------|-------|
| 17 | Trust center — public security posture page | Server | PENDING | — | Customer-facing status |
| 18 | Audit management workflow — evidence packages + auditor access | Server | PENDING | — | Structured audit module |
| 19 | AI compliance assistant — auto-map controls, suggest evidence | AI | PENDING | — | Enhance compliance-agent |
| 20 | Framework gap auto-detection — compare controls across frameworks | Server | PENDING | — | Cross-framework analysis |

## Phase 4: Visual & UX (Week 5-6)

| # | Improvement | Type | Status | Run Date | Notes |
|---|------------|------|--------|----------|-------|
| 21 | Compliance score dashboard widget — visual scorecard with circular progress | UI | PENDING | — | Reuse circular-progress.tsx |
| 22 | Framework readiness heat map — color-coded comparison grid | UI | PENDING | — | Grid with green/yellow/red cells |
| 23 | Risk heat map visualization — 5x5 visual risk matrix with color zones | UI | PENDING | — | Chart.js or custom grid |
| 24 | Evidence upload drag-drop UI — file upload with preview + validation | UI | PENDING | — | Enhance evidence component |
| 25 | Compliance timeline view — evidence expiry timeline with visual indicators | UI | PENDING | — | Timeline visualization component |
| 26 | Policy acknowledgment portal — employee-facing reader + sign-off UI | UI | PENDING | — | New page for employee view |
| 27 | Notification center UI — in-app notifications with bell + dropdown | UI | PENDING | — | Server-sent events + UI |
| 28 | Dark mode / theme polish — consistent dark theme across all pages | UI | PENDING | — | CSS variables audit |
| 29 | Mobile-responsive compliance views — breakpoint-optimized layouts | UI | PENDING | — | Responsive audit |
| 30 | Export polish — one-click PDF/CSV with professional formatting | UI | PENDING | — | Enhance existing export |
| 31 | Loading skeletons & empty states — improve perceived performance | UI | PENDING | — | Skeleton components |
| 32 | Accessibility audit — WCAG 2.1 AA compliance fixes | UI | PENDING | — | a11y audit + fixes |

## Phase 5: Security Hardening (Week 5-6)

| # | Improvement | Type | Status | Run Date | Notes |
|---|------------|------|--------|----------|-------|
| 33 | HTTPS enforcement — auto-redirect HTTP to HTTPS in production | Security | PENDING | — | Express redirect middleware |
| 34 | CSP hardening — strict Content Security Policy with nonce | Security | PENDING | — | Enhance helmet CSP config |
| 35 | Rate limiting expansion — per-endpoint limits with graduated backoff | Security | PENDING | — | Enhance express-rate-limit |
| 36 | API key rotation system — auto-rotate keys with grace period | Security | PENDING | — | New /api/keys/rotate endpoint |
| 37 | SQL injection audit — verify parameterized queries across all routes | Security | PENDING | — | Review all db.query() calls |
| 38 | Dependency vulnerability scanning — weekly npm audit + auto-patch | Security | PENDING | — | npm audit cron job |
| 39 | Secrets scanning — prevent hardcoded credentials in codebase | Security | PENDING | — | git-secrets or equivalent |
| 40 | Security headers audit — verify all OWASP recommended headers | Security | PENDING | — | securityheaders.com check |
| 41 | File upload validation — strict type, size, and content validation | Security | PENDING | — | Validate uploads endpoint |
| 42 | CISOvault app penetration test — automated security scan of app | Security | PENDING | — | Trigger CISOvault scan |
| 43 | Input sanitization — XSS prevention across all user inputs | Security | PENDING | — | DOMPurify / sanitize-html |
| 44 | Session security — secure cookie flags, short expiry, rotation | Security | PENDING | — | Enhance session config |

---

## Current Position

**Last improved:** 2026-07-09 — Items 1-2 automated, 3-4 pending  
**Items completed:** **2 of 44**
**Next up:** #3 -- Seed PCI DSS v4.0 framework — 12 requirements, 300+ controls

# Demo Data Engine — Gap Log

Functions/records a normal audit or certification process demands that **could not be seeded**
because the app lacks the process, table, or router. Compiled while seeding two full demo
tenants (Nordwind Logistics GmbH — ISO 27001/GDPR/NIS2; Apex Federal Solutions Inc. —
FedRAMP/NIST 800-171/CMMC) across all modules.

Each item is filed as a GitHub issue (repo: Sectutor/PolicyOS). IDs below match issue numbers.

| ID | Certification step blocked | What's missing | Workaround used in seed |
|----|---------------------------|----------------|--------------------------|
| GAP-01 | ISO 27001 cl. 9.3 management review | No `management_reviews` table/router: no meeting minutes, inputs/outputs, decisions record. Only generic work_items exist. | Seeded as generic `review` work items |
| GAP-02 | Stage-1 / Stage-2 certification audit tracking | No certification-body concept: audit dates, auditor assignment, stage outcomes. `certification_audits` table exists but has no router/UI wiring verified. | Not seeded |
| GAP-03 | Risk acceptance sign-off chain | `approval_requests` table exists, but no risk-acceptance workflow linking approver → risk → recorded decision with expiry. Acceptance is only a free-text justification on treatments. | Acceptance documented as text |
| GAP-04 | Policy version diff + approval routing | Policies have version ints and approval_status, but no version history table (diff v2→v3), no reviewer assignment/approval trail beyond a JSON column. | Version bumped without history |
| GAP-05 | Asset disposal/decommissioning records | `asset_status` enum has `disposed`, but no disposal record: date, method (wipe/certified destruction), approver — required by A.7.10 / media sanitization audits. | Status flip only |
| GAP-06 | Training completion tracking per employee | `training_assignments`/`training_modules` exist but no completion evidence chain (date, score, certificate) surfaced to ISMS evidence. Awareness training (A.6.3) can't be evidenced end-to-end. | Referenced in evidence text only |
| GAP-07 | Internal audit program (annual plan) | `audit_findings` exists but there's no internal-audit *program*: planned audits per year, scope, auditor independence, conclusion reports (cl. 9.2). | Findings seeded standalone |
| GAP-08 | SoA export as formal document with approval metadata | SoA data lives in client_controls (good), but the formal SoA document (versioned, approved, published date) required by certifiers isn't a first-class artifact. | report_type 'soa' available; not pre-generated as approved doc |
| GAP-09 | Statement of Applicability exclusions review workflow | Exclusion justifications are static text; no periodic re-validation task generation for N/A controls. | Static justification only |
| GAP-10 | Supplier contract security clause library linkage | Vendors have DPAs/assessments but no link from contract clauses (e.g., right-to-audit) → control → evidence. Required for supplier assurance audits. | Vendor assessments only |
| GAP-11 | Incident post-mortem / lessons-learned record | Incidents have lifecycle states but no structured post-mortem (timeline, root cause, actions taken → CAP linkage). Required by A.5.26 and NIS2 incident reporting follow-up. | Breach remedial_actions text only |
| GAP-12 | Continuity test results as evidence artifacts | BC plans track last_tested_date, but test execution results (objectives met, RTO achieved vs target, issues) aren't storable as structured records. | Date fields only |
| GAP-13 | Access review campaign scheduling automation | Cycles exist manually; no recurring schedule definition (e.g., quarterly auto-create cycle + populate tasks from IdP). | One manual cycle seeded |
| GAP-14 | Cryptographic key inventory | No key inventory table (key ID, owner, algorithm, rotation date, HSM location) — audited under A.8.24 use of cryptography. | Absent |
| GAP-15 | Legal/regulatory register with obligation tracking | `compliance_requirements` exists but no jurisdiction-scoped obligations register with due dates/fines exposure feeding compliance-journey automatically (GDPR/NIS2 articles as tracked obligations). | Framework controls proxy |

## Minor observations (no issue needed)
- `policy_acknowledgments` and `policy_acknowledgements` tables both exist — legacy duplication.
- `client_framework_controls` / `framework_requirements` tables empty; harmonization surface not wired to static catalogs.
- Global control library duplicates static catalogs inconsistently (ISO had 6 rows pre-seed; catalogs ship 123).

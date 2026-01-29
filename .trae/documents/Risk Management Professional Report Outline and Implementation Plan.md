# Assessment Summary

* BIAs record recovery objectives in `healing_time_objectives` (RTO/RPO/MTPD) and link to processes.

* The BCP builder aggregates selected BIAs, critical activities, strategies, and scenarios into `bc_plans.content` JSON.

* Approvals exist for BIA/plan/strategy, and stakeholders/call trees are present. Risk modules are adjacent but not yet tightly linked.

# Professional Cohesion Improvements

## Shared Taxonomy & Scales

* Standardize terms: use "Recovery Objectives" (RTO/RPO/MTPD) across UI, API, schema.

* Unify criticality scales (e.g., 1–5) and impact categories (financial, operational, legal, reputational) with clear definitions.

* Add consistent time horizons for BIA (e.g., 0–4h, 4–24h, 1–3d, 3–7d, >7d) with thresholds.

## Data Model Alignment

* Normalize `bc_plans.content`: create relational joins `bc_plan_bias`, `bc_plan_strategies`, `bc_plan_scenarios`, `bc_plan_contacts` for explicit FK linkage.

* Rename `healing_time_objectives` to `recovery_objectives` and align columns: `activity`, `criticality`, `rto`, `rpo`, `mtpd`, `dependencies`, `resources`.

* Add `plan_versions` and `plan_change_log` for versioning and audit.

* Create `plan_exercises` to log tests (tabletop/live), dates, outcomes, follow-ups.

## Governance & Lifecycle

* Canonical statuses and gates: Draft → In Review → Approved → Exercised → Maintained.

* Require approvals for BIA before plan approval; enforce dependency checks.

* Add attestation and sign-off blocks: owner, approver, date, next review.

* Integrate stakeholder distribution lists and notification preferences.

## UX & Content Professionalization

* Guided wizard: Process registry → BIA → Strategies → Scenarios → Plan compilation with readiness checks.

* Auto-populate plan sections from BIAs (critical activities, RTO/RPO/MTPD, dependencies) and strategies.

* Export polished PDF/Docx: cover page, executive summary, scope, assumptions, scenarios, strategies, procedures, contacts, distribution, testing schedule, change log.

* Inline compliance mapping: ISO 22301 and ISO 27001 A.17 references.

## Testing & Assurance

* Add exercise scheduling and tracking; require remediation tasks and re-test.

* Dashboard metrics: % BIAs complete, plans approved, last exercise date, RTO/RPO coverage.

* Readiness score computed from BIA completion, strategy coverage, scenario testing, approval freshness.

## Risk Integration

* Link key risks to scenarios and strategies; show residual risk after selected treatments.

* Pull risk scores into continuity dashboards; flag gaps where high risks lack tested scenarios.

# Technical Implementation

## Schema Changes

1. New tables: `bc_plan_bias`, `bc_plan_strategies`, `bc_plan_scenarios`, `bc_plan_contacts`, `plan_versions`, `plan_change_log`, `plan_exercises`.
2. Rename `healing_time_objectives` → `recovery_objectives` and migrate data.
3. Add FKs between `bc_plans` and new join tables; keep `content` for caching/export but make it derived.

## API & Services

* Update continuity router endpoints to CRUD new tables and expose joins.

* Provide migration scripts to move `bc_plans.content` embedded lists to normalized tables.

* Add endpoints for exercises, approvals, and readiness scoring.

## UI Enhancements

* Update Business Continuity Dashboard to a gated flow with completion bars.

* Enhance BIA editor to enforce standardized scales, horizons, and definitions.

* Extend Plan Builder tabs: References, Procedures, Testing & Assurance, Compliance Mapping, Change Log.

* Add exports with professional templates and branding.

## Reporting & KPIs

* New dashboards: Readiness score, RTO/RPO coverage, scenario-test matrix, approval freshness.

* Filters by department/process; drill-down to BIAs and plans.

## Compliance Mapping

* Embed ISO 22301 controls and ISO 27001 A.17 in UI; show coverage status and gaps.

* Generate compliance-ready evidence packs from BIAs, plans, exercises, and approvals.

# Deliverables

* Normalized schema and migrations; updated APIs.

* Refined UI workflow and professional document exports.

* Governance gates, approvals, and exercise tracking.

* Readiness dashboards and risk linkage.

# Next Step

* Proceed with schema and API changes, then implement UI gating, exports, and dashboards, followed by data migration and professional templates.


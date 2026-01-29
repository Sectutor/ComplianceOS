## Summary of Current State
- Frontend uses React + Vite with `wouter` routing, `@tanstack/react-query` for data, and tRPC for API.
- Risk domain covers assets, threats, vulnerabilities, scenarios, assessments, treatments, register, heatmaps, and charts.
- Key pages: `pages/risk/RiskDashboard.tsx` (overview), `pages/risk/RiskAssessmentsPage.tsx`, `pages/risk/RiskAssetsPage.tsx`, editors for each entity, and `pages/risk/RiskFramework.tsx` for governance.
- DB schema models: `assets`, `risk_scenarios`, `risk_assessments`, `risk_treatments`, `treatment_controls`, `threats`, `vulnerabilities`, `risk_settings`.
- Residual risk logic: `lib/riskCalculations.ts:45` computes qualitative residual risk by subtracting control effectiveness from inherent.
- Scheduling helpers: `db.ts:3168` `getOverdueItems()` and `db.ts:3283` `getUpcomingDeadlines()` assemble risk reviews and treatment due events.

## Key Friction Points
- Fragmented flow: scenario creation and assessment/treatment linking happen in multiple places; controls are linked after scenario creation (`components/risk/RiskAssessmentWizard.tsx:396-404`).
- Inconsistent scoring: qualitative residual (`Low/Medium/...`) vs numeric inherent (likelihood × impact) in wizard; assessments mix qualitative labels and numbers.
- Duplicate fields: `risk_assessments` repeats threat/vulnerability descriptions alongside IDs, risking drift and extra data entry.
- Action visibility: Overdue/upcoming items exist in DB but not surfaced consistently on dashboard or notifications.
- Heatmap drill-down: heatmaps exist but lack deep links and consistent filters to jump to actionable lists.
- AI suggestions: present but not integrated as inline, one-click “apply” to prefill controls/treatments and rationale.

## UX & Workflow Improvements
- Guided journey: unify into a single flow with steps: Framework → Identify → Analyze → Evaluate → Treat → Review. Make this the default entry in `RiskDashboard` with progress indicators.
- Inline linking: allow selecting and linking controls inside the wizard (not after), with residual risk preview. Add control effectiveness sliders and immediate impact on residual.
- Progressive disclosure: simplify forms with defaults and context-aware fields; keep advanced fields collapsed until needed.
- Heatmap interactivity: clicking matrix cells opens pre-filtered lists (scenario/assessment/register) with breadcrumbs.
- Quick actions: add “Create assessment”, “Add treatment”, “Link controls” buttons directly on cards and table rows.

## Data Model & Calculation Consistency
- Store both qualitative and numeric scores:
  - Persist `inherentScore` and `residualScore` (1–25) alongside qualitative levels; derive qualitative via `scoreToRiskLevel`.
  - Extend `lib/riskCalculations.ts:45` to support numeric pipeline while keeping existing qualitative API.
- Normalize assessment context:
  - Keep canonical `threatId` and `vulnerabilityId`; move descriptive snapshots into a single `contextSnapshot` JSON to avoid duplicates.
- Treatment–control linkage:
  - Use `treatment_controls` for many-to-many controls consistently and deprecate legacy single `controlId` in `risk_treatments`.
- Indexing & enums:
  - Add DB indexes on `clientId`, `status`, `nextReviewDate`, `dueDate` to speed dashboards.
  - Use stricter enums for `status`, `priority`, `treatmentStrategy` to reduce invalid states.

## Automation & Notifications
- Surface `getOverdueItems()` (`db.ts:3168`) and `getUpcomingDeadlines()` (`db.ts:3283`) on the Risk dashboard as “Overdue” and “Upcoming” lanes.
- Add in-app notifications and a daily email digest per client owner with links to assessments/treatments.
- Calendar integration: optional iCal feed per client to track reviews and due dates.

## Reporting & Actionability
- KRI cards: show KRIs with thresholds, trends, and current status; link KRIs to relevant risks and treatments.
- Appetite checks: pull `risk_settings` and flag assessments exceeding appetite/tolerance; prompt treatment plans or explicit acceptance with rationale.
- One-click exports: enrich SoA and compliance report with risk outcomes, treatments, and residual scores; ensure policy mappings are reflected.

## API & Performance Enhancements
- tRPC: add pagination, sorting, and filter params to `risks.get*` queries; provide server-side validation (zod) and business rules.
- Caching: standardize react-query keys and cache times for client-scoped resources; prefetch dashboard data.
- Lists: virtualize large tables and heatmap data; use infinite scroll for assessments and vulnerabilities.

## Security & Governance
- RBAC: enforce roles for viewing/editing risk data across routes and procedures.
- Audit trail: record key actions (assessment approvals, treatment updates, control links) for compliance.
- Data privacy: ensure PII in descriptions is masked or avoided; leverage snapshots without duplication.

## Implementation Plan
1. UX unification
   - Create “Guided Risk” layout and route; embed wizard and register.
   - Enhance `RiskAssessmentWizard` to include control linking and residual preview.
2. Scoring consistency
   - Extend `lib/riskCalculations.ts:45` to compute numeric residual alongside qualitative; update consumers to store both.
3. Data model cleanup
   - Migrate `risk_assessments` to use `contextSnapshot` and drop duplicated text fields; reinforce many-to-many controls.
4. Dashboard action lanes
   - Integrate overdue/upcoming events and deep links; add KRI cards.
5. Notifications
   - Add in-app toasts/badges and daily digest email per client.
6. API pagination & filters
   - Update tRPC procedures to support query params and validation; adjust frontend hooks.
7. Heatmap drill-down
   - Add click-to-filter behavior and navigation breadcrumbs.
8. Exports & SoA
   - Include residual scores and treatments; sync policy mappings.
9. Performance & RBAC
   - Virtualize lists and enforce role checks across routes and procedures.

## Expected Outcomes
- Faster end-to-end risk assessment with fewer clicks and clearer guidance.
- Consistent, defensible scoring and better reporting.
- Action-oriented dashboard with deadlines and KRIs.
- Reduced data duplication and improved performance.

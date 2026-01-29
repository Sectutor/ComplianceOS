## Current Architecture
- Controls API: `server/routers/clientControls.ts` (list: 53–57, create: 130–141, update with audit/alerts: 142–221, bulkAssign: 228–235)
- Policies API: `server/routers/clientPolicies.ts` (list: 14–18, create with generation/limits: 26–90, publish/versioning: 148–197, restore: 214–257)
- Readiness API: `server/routers/readiness.ts` (getState via raw SQL: 8–85, createOrUpdate via raw SQL: 87–201)
- Reports: `complianceReport.ts` (aggregates score and coverage: 54–125)
- Exports: `index.ts` SoA endpoint: 186–230; policy export endpoints: 307–447
- UI: Dashboard `pages/ClientCompliancePage.tsx` (stats/cards: 68–139, checklist widget: 143–151), Controls `pages/ClientControlsPage.tsx` (assign/bulk/export/table SoA: 202–211), Policies `pages/ClientPoliciesPage.tsx` (AI-assisted create, list/actions: 171–195, 406–519), Readiness Wizard `pages/readiness/ReadinessWizardPage.tsx` (steps/save: 60–81)

## Key Frictions
- Dashboard shows limited metrics (controls-only %), missing consolidated score from DB `db.ts:getClientComplianceScore` at 1972.
- "Mappings" and "Evidence Coverage" cards are placeholders (`pages/ClientCompliancePage.tsx:117`, 226–233) with no live data.
- Readiness relies on raw SQL, virtual IDs, and lacks navigation completion (`server/routers/readiness.ts:16–22`, `pages/readiness/ReadinessWizardPage.tsx:77–80`).
- Controls table lacks inline evidence linkage and required justification enforcement for `not_applicable` (`pages/ClientControlsPage.tsx:502–533`).
- Notifications only on control downgrade; no alerts for evidence expiry, policy review due, missing justifications (`server/routers/clientControls.ts:186–215`).
- Bulk assign is framework-by-framework, causing multiple calls (`pages/ClientControlsPage.tsx:103–111`).

## Target Workflow (Seamless)
1. Setup: Select frameworks → bulk assign base controls → auto-map policy templates.
2. Statement of Applicability: Table-first edit of applicability/justification with validations.
3. Policy authoring: Generate/tailor content; publish/version; link controls and risks.
4. Evidence collection: Create requests, attach files, mark verified; show coverage.
5. Readiness assessment: Guided wizard → dashboard with progress and CTA.
6. Reporting/Exports: Consolidated score, gap analysis, SoA/PDF/DOCX with branding.
7. Notifications: Proactive alerts for downgrades, expiring evidence, review deadlines.

## UI Changes
- Dashboard
  - Replace controls-only % with consolidated compliance score and key metrics using `db.ts:getClientComplianceScore` (1972) and `getPolicyCoverageAnalysis` (2146).
  - Populate mappings and evidence cards; add quick links to controls/policies/evidence.
- Controls
  - Enforce justification on `not_applicable`; inline evidence attach and owner/date fields.
  - Single bulk assign dialog to assign multiple frameworks at once.
- Policies
  - Show linked controls and risk mappings; surface version history and publish/restore actions in-line.
- Readiness
  - Add completion CTA to dashboard; display server-synced progress in `ChecklistProgressWidget`.

## Backend/API Changes
- Controls
  - Validation: require `justification` when `applicability = 'not_applicable'` in update (`server/routers/clientControls.ts:142–155`).
  - Add evidence linkage endpoints and owner/due-date fields to clientControls.
  - Bulk assign: accept multiple frameworks in one request (extend `.input` at 228–235).
- Policies
  - Ensure publish creates `policyVersions` and add history query (already present at 199–212); add endpoints to fetch linked controls and risks (extensions around 298–359).
- Readiness
  - Replace raw SQL with typed schema operations; persist real IDs; add `status`/`currentStep` transitions.
- Reporting
  - Expand `complianceReport.ts` to include roadmap recommendations from `getPolicyGapAnalysis` (2833).

## Data & Validation
- Define required fields: justification for `not_applicable`, evidence required to mark `implemented`.
- Normalize statuses across controls/policies/evidence; compute composite score server-side.
- Add referential links: `controlMappings`, `policyVersions`, evidence attachments.

## Notifications & Automation
- Triggers
  - Evidence `expired` → alert owner; policy `review` threshold → reminder; missing justification → warning.
  - Weekly digest per client; activity log enrichment.

## Reporting & Exports
- Dashboard tiles show: score, mappings coverage, evidence coverage, policy status.
- SoA export includes applicability/justification and owner.
- Gap Analysis page links each gap to tasks.

## Integration Points
- Cross-navigation: From policy to linked controls; from control to related policies/evidence.
- Single TRPC context for permissions (`index.ts:107–121`), reuse guards consistently.

## Rollout & Migration
- Schema migrations for new fields (owner, dueDate, evidence links).
- Backfill `applicability` and `justification` defaults; add warnings for missing data.
- Feature flags to enable new dashboard metrics progressively.

## Validation
- Unit tests for status transitions and score computation.
- E2E test flows: assign controls → edit SoA → author policy → attach evidence → run report.
- Metrics/health check remain under admin guard (`index.ts:240–252`).
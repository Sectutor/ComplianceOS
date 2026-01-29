## Program Goals
- Deliver SOC 2/ISO 27001 readiness foundations and hands-on execution.
- Guide teams through policies, controls, risk, evidence, BCP/IR, vendor management.
- Produce an executive-ready readiness report and auditable artifacts by Week 5.

## Cohort Structure
- Format: Weekly live session + hands-on assignments with office hours.
- Artifacts: Policies, control mappings, risk register, vendor reviews, BCP/IR plans, evidence repository.
- Roles: `Participant`, `Mentor/CISO`, `Admin` with gated access and cohort-only views.

## Week-by-Week Curriculum & Deliverables
- Week 1 — Foundations & Baseline
  - Objectives: Scope, framework selection (SOC 2/ISO), client baseline, gaps.
  - Deliverables: Framework selection, baseline checklist completion, initial roadmap.
  - Modules: Readiness (`server/routers/readiness.ts`), Roadmap (`server/routers/roadmap.ts`), Checklist (`server/routers/checklist.ts`).
- Week 2 — Policies & Controls
  - Objectives: Draft core policy suite and align controls.
  - Deliverables: Policy drafts (Access, Change, Vendor, IR), control coverage map.
  - Modules: Client Policies (`server/routers/clientPolicies.ts`), Client Controls (`server/routers/clientControls.ts`), Policy export.
- Week 3 — Risk & Vendor Management
  - Objectives: Build risk register, perform vendor due diligence.
  - Deliverables: Risk assessment, treatment plan, vendor reviews with evidence.
  - Modules: Risks (`server/routers/risks.ts`), Vendors (via CRM module), Evidence capture.
- Week 4 — Evidence, BCP/DR & IR Readiness
  - Objectives: Collect and map evidence, finalize BCP/DR and IR.
  - Deliverables: Evidence repository, tested BCP/DR plans, IR playbooks.
  - Modules: Evidence upload (`/api/upload-evidence-file`), BCP (`server/routers/businessContinuity.ts`), Governance.
- Week 5 — Readiness Verification & Executive Report
  - Objectives: Final control coverage, audit readiness review, exec briefing.
  - Deliverables: Compliance readiness report, action backlog, audit kickoff plan.
  - Modules: Reporting (`lib/reporting.ts`, `complianceReport.ts`), Advisor insights.

## Technical Implementation
### Data Model (Drizzle ORM)
- Add Cohort entities in `schema.ts`:
  - `cohorts`: name, start/end, framework, status.
  - `cohortMembers`: cohortId, userId, role.
  - `cohortSessions`: cohortId, week, title, agenda, startsAt.
  - `cohortAssignments`: cohortId, week, title, description, dueAt.
  - `cohortArtifacts`: cohortId, type, linkId/ref, createdBy.
  - `cohortProgress`: cohortId, userId, metricKey, value, updatedAt.
- Extend `db.ts` with CRUD methods: create/list cohorts, enroll members, schedule sessions, submit assignments, link artifacts, compute progress.

### API Layer (tRPC)
- New router `server/routers/cohort.ts` with procedures:
  - `createCohort`, `listCohorts`, `getCohort`, `enrollMembers`.
  - `scheduleWeek`, `getWeekPlan`, `submitAssignment`, `linkArtifact`.
  - `progressMetrics`, `exportCohortReport`, `sendReminders`.
- Integrate role checks via existing middleware (`routers.ts` `isAuthed`, `isAdmin`).

### Frontend UI (React + Vite)
- Pages:
  - `pages/cohort/Cohorts.tsx` — list & create.
  - `pages/cohort/[cohortId]/Overview.tsx` — timeline, participants, metrics.
  - `pages/cohort/[cohortId]/Week.tsx` — sessions, assignments, artifacts, progress.
- Components under `components/cohort/*`:
  - Timeline, SessionCard, AssignmentForm, ProgressBar, ArtifactLinker.
- Hooks/contexts:
  - `useCohort`, `useCohortProgress`, integrate `@trpc/react-query` for data.

### Content & Templates
- Repository content under `content/cohort/`:
  - Week agendas, assignment briefs, rubrics, policy templates (DOCX/Markdown).
  - ICS calendar templates for sessions.
- Leverage existing policy export utilities for cohort-tailored packs.

### Automation & Communications
- Email: use `lib/email/*` to send weekly agendas, reminders, deadlines.
- Calendar: generate ICS files, attach in emails; optional Slack bridge if available.
- Advisor: surface cohort guidance via `server/routers/advisor.ts` and `lib/llm/service.ts`.

### Metrics & Reporting
- Metrics: control coverage, checklist completion, policy draft status, risk assessment completion, evidence items, BCP/IR readiness.
- Prometheus: expose cohort metrics via `/api/metrics` with labels per cohort.
- Reports: extend `complianceReport.ts` to include cohort summary and next steps.

### Permissions & Security
- Role-based procedures: restrict cohort admin actions to `Admin/Mentor`.
- Data isolation: cohort-scoped queries in all procedures.
- PII handling: reuse storage and auth patterns; no secrets in client.

## Operations & Runbook
- Cohort creation wizard: name, dates, framework, initial members.
- Week scheduler: add sessions, auto-generate invites, publish agendas.
- Assignment workflow: status, submissions, evidence linking, review notes.
- Office hours slots: optional booking via simple availability model.

## Success Criteria
- 90%+ assignment completion; full policy suite drafts; risk + vendor reviews done.
- Evidence mapped to controls; BCP/IR published; readiness report generated.

## Integration Notes (Existing Code)
- Server entry `index.ts` mounts tRPC and endpoints; new router plugs into `routers.ts`.
- Use Checklist, Policies, Controls, Risks routers to avoid duplication.
- Drizzle-backed tables in `schema.ts`/`db.ts` ensure consistent persistence.
- Frontend follows current Vite/React/Tailwind patterns with `@trpc/react-query`.

## Next Steps
- Approve scope and framework focus (SOC 2, ISO 27001, or both).
- I’ll implement schema, router, and three UI pages, seed demo content, and wire emails.
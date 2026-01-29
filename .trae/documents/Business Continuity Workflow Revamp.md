## Objectives
- Reduce friction across Business Continuity by guiding users end-to-end
- Produce more actionable outputs (tasks, approvals, test schedules, exportable plans)
- Deepen integration with Risk, People, Vendors, Notifications

## Current Flow (Verified)
- UI stages live in `pages/business-continuity/BusinessContinuityDashboard.tsx:65–123` (5-step path)
- CRUD and workflows in `server/routers/businessContinuity.ts`:
  - BIA list/get/create/update at `listBIA:10–17`, `getBIA:19–40`, `bia.*:406–490`
  - Strategies at `strategies.*:549–580` and `listStrategies:163–169`, `saveStrategy:171–202`
  - Plans at `plans.*:582–614` and `listPlans:212–218`, `savePlan:229–259`
  - Scenarios at `scenarios.*:519–547` and `listScenarios:262–268`, `saveScenario:270–299`
  - Call tree at `callTree.list:616–639`
  - Collaboration (comments, tasks, approvals) at `collaboration.*:643–794`
- Menu is surfaced under `components/DashboardLayout.tsx:340–350`
- Data models in `schema.ts`: BIAs `3733–3759`, questionnaires `3769–3787`, HTO `3799–3821`, strategies `3835–3855`, plans `3867–3891`, scenarios `3903–3921`, tasks `3941–3969`, approvals `3979–3999`, vendor contacts `3191`

## Key Frictions
- Fragmented navigation between Process → BIA → Strategies → Plan; progress is not tracked
- Heat map uses placeholder scores (`BusinessContinuityDashboard.tsx:29–31`) instead of Risk data
- Tasks/Approvals not auto-generated from state transitions (manual workload)
- Assignee names on task list inferred client-side (`components/BCTaskBoard.tsx:240–251`) instead of server-joined
- Call Tree lacks escalation sequences and contact channels; internal phone not available
- Plan testing lifecycle not represented despite `bc_plans.nextTestDate`/`lastTestedDate`
- Limited export (no PDF/DOCX) and no plan version diffing

## Recommendations
1. Guided Project Workflow
- Expand `BCPProjectWizard.tsx` to orchestrate the full cycle (scope → stakeholders → processes → BIA → strategies → scenarios → plan → approvals/test)
- Persist step completion state per project; show progress on dashboard

2. Dashboard “Next Best Action” and Progress
- Compute stage completion: processes count, BIAs with status, strategies/scenarios presence, approvals pending, tests scheduled
- Replace placeholder risk scores by joining Risk assessments; show real heat map

3. Deep Risk Integration
- Map business processes to Risk assets and assessments
- Pull top risk scenarios into BC scenarios as candidates
- Show control gaps from Risk on BIA/Plan pages

4. Automation: Tasks & Approvals
- Auto-create tasks on events (new BIA → assign conductor; plan draft → assign reviewers; rejected approval → remediation task)
- Auto-request approvals when plan moves to “ready_for_review”
- Email/notification hooks for task assignment and approval requests

5. Call Tree Enhancements
- Add escalation flows, multi-channel (email/SMS/voice) preferences
- Internal user phone fields and vendor SLA/criticality

6. Plan Lifecycle & Testing
- Endpoints to schedule tests and record outcomes; roll up to `lastTestedDate`/`nextTestDate`
- Plan versioning with changelog and diff view
- Export plan to PDF/DOCX with structured sections

7. UX Streamlining
- Breadcrumbs, stage progress bars, required-field checks, skeletons
- CTA buttons at the end of each stage to go to the next
- Inline save for editors, consistent toast/error handling

## Implementation Outline
1. Routers/API
- Add `tasks` auto-generation and `approvals` triggers inside `server/routers/businessContinuity.ts` mutations
- Add `plans.scheduleTest`, `plans.recordTest`, `plans.export` endpoints
- Update `collaboration.listTasks` to join assignee names (server-side)
- Add `risk` joins for heat map via `routers.ts` and dedicated BC endpoints

2. Data Model (Drizzle)
- Extend users with optional phone; vendor contacts with SLA/criticality
- Add `bc_plan_tests` table for test sessions and outcomes
- Add `bcp_project_progress` for stage completion per project

3. UI/UX
- Replace dashboard KPI cards with progress and “Next best action”
- Expand `BCPProjectWizard.tsx` to drive end-to-end and write progress
- Connect heat map to Risk data
- Add plan export and test scheduling UI under Plans
- Improve Call Tree manager with escalation chains and channel prefs

4. Notifications
- Use existing `routers.ts` email utilities to notify on task/approval/test events

5. Reporting
- Generate plan PDFs and test reports; add version diff

## Expected Outcomes
- Measurably fewer clicks and transitions; clear guidance with progress state
- Action triggers turn analysis into tasks/approvals automatically
- Plans become living documents with test cycles and exportable artifacts
- Risk-informed continuity with consistent data across modules

## Verification
- Unit test new endpoints; manual flow-through from project initiation to approved plan
- Validate heat map real scores and task/approval automation
- Run a sample test cycle and confirm reporting and next dates update

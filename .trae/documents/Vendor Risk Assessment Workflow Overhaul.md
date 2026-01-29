## Goal
Create a frictionless, end‑to‑end Vendor Risk Assessment workflow that guides users from discovery → profiling → due diligence → findings → remediation → continuous monitoring, with actionable outputs and tight integration across risk, controls, governance, evidence, notifications, and dashboards.

## Current State (Summary)
- UI
  - `VendorList` lists, adds, discovers vendors (`pages/tprm/VendorList.tsx:42–81, 126–137`).
  - `SecurityReviews` provides a Kanban board with statuses Planned/Sent/In Progress/In Review/Completed and quick status updates (`pages/tprm/SecurityReviews.tsx:15–18, 55–60, 210–229`).
  - `VendorDetails` has tabs for Assessments, Risk Scan, Contacts, Contracts; scheduling assessments, manual conduct with inherent/residual selections and optional score (`pages/tprm/VendorDetails.tsx:430–487, 1010–1157, 1161–1187`).
- API & Data
  - tRPC routers inline for vendors, assessments, contacts, contracts, scans (`routers.ts:1379–1601, 1604–1682, 1684–1790`).
  - `vendor_assessments` schema supports status, due dates, manual fields for inherent/residual risk and score (`schema.ts:3204–3268`).
  - Risk scan integrates NVD CVEs and mock breaches to compute `riskScore` (`routers.ts:1497–1576`), surfaced in `VendorDetails`.
  - Governance workflow engine has patterns for policies/controls but no vendor integration in status writer (`lib/governance/workflow.ts:10, 441–456`).
- Integrations
  - Basic analytics for overdue and in‑progress assessments (`routers.ts:1792–1819`).
  - Communication templates exist but not wired into vendor assessment lifecycle (`routers.ts:1822–1999`).

## Pain Points
- Manual scoring and risk mapping; limited automation and no linkage to control effectiveness.
- No guided questionnaire/template execution; SIG/CAIQ referenced but not modeled/responses tracked.
- Vendor lifecycle not handled by the workflow engine; no work items/tasks for assessment stages.
- Findings are free‑text; remediation tasks and control mappings are not generated.
- Limited cross‑module integration (risk register, evidence, controls, governance, notifications).
- Kanban lacks drag‑and‑drop, assignments, and due date SLA cues.

## Recommendations
- Guided flow with clear stages and one‑click actions:
  - Discover → Profile → Due Diligence (send questionnaire or review artifact) → Findings → Remediation → Monitor.
- Questionnaire templates and response tracking:
  - Add template library (SIG Lite, CAIQ, SOC2 checklist) and per‑assessment `templateId`, `completionPercent`, `responseCount`, attachment links.
- Automated scoring:
  - Compute inherent/residual risk via `lib/riskCalculations.ts` and control effectiveness; fold in `riskScan.riskScore` for residual adjustment.
- Workflow engine integration for vendors:
  - Add vendor transitions and side‑effects that create work items, send communications, and escalate overdue items.
- Actionable outputs:
  - Convert findings to remediation tasks, map to controls and policies, and push into risk register.
- Tighter app integration:
  - Notifications for upcoming/overdue assessments; dashboard tiles and metrics; evidence repository hooks; advisor mitigation plan auto‑generation.
- UX improvements:
  - Kanban drag‑and‑drop, assignees, SLA badges; inline quick actions: “Send to Vendor”, “Start Review”, “Create Tasks”.

## Implementation Plan
### 1) Data Model Enhancements
- Extend `vendor_assessments` with:
  - `templateId` (string), `assignedToUserId` (int), `completionPercent` (int), `responseCount` (int), `controlEffectiveness` (string), `artifactIds` (json), `tags` (string[]), `severity` (enum).
- Optional linking tables:
  - `vendorAssessmentResponses` (assessmentId, questionId, response, evidenceUrl).
  - `vendorAssessmentFindings` (assessmentId, title, severity, mappedControlId?, remediationTaskId?).

### 2) API/Routers
- `vendorAssessments` router additions (`routers.ts`):
  - `start` (sets status, assigns user, creates work item).
  - `sendToVendor` (status → Sent, triggers communication email with secure link).
  - `recordResponse` (persist responses, update completion%); `complete` (status → Completed, set `completedDate`).
  - `createFindings` (derive findings and open remediation tasks, map to controls).
  - `listWithStats` (joins vendor and aggregates completion, overdue, assignee).
- `vendors` router additions:
  - `updateLifecycle` (Onboarding/Active/Offboarding; hooks into workflow engine and work items).
  - `scheduleScan` and `setScanPolicy` (frequency, thresholds) for continuous monitoring.

### 3) Workflow Engine Integration
- Update `WorkflowEngine.updateEntityStatus` to support `vendor` (`lib/governance/workflow.ts:441–456`).
- Add `vendorTransitions` with guards and side‑effects:
  - `onboarding → active` requires primary contact, category, dataAccess.
  - `active → review` creates `workItems` for questionnaire and sets due date.
  - `review → active/monitoring` after completion; overdue guard escalates.
- Side‑effects:
  - Create assessment work items, send communications, auto‑create remediation tasks for high‑severity findings.

### 4) Risk & Scoring Automation
- In `VendorDetails` conduct flow, derive `inherentRiskLevel` and `residualRiskLevel` using `getMatrixScoreLevel` and `calculateResidualRisk` (`lib/riskCalculations.ts`).
- Combine `riskScan.riskScore` with questionnaire score to compute final residual score; persist.
- Map findings to `controls` and `clientPolicies`, populate risk register entries via `risks` router.

### 5) UX & Workflow Improvements
- `SecurityReviews`:
  - Enable drag‑and‑drop between status columns; bulk actions; assignee and due date chips; SLA badge for overdue (`pages/tprm/SecurityReviews.tsx`).
  - Quick actions menu items: Send to Vendor, Start Review, Create Tasks; inline progress bar.
- `VendorDetails`:
  - Wizard for onboarding; assessment “Run” panel with template selection and email send; auto‑computed risk panels.
  - Findings table with “Create Remediation Task”, “Map to Control”, evidence links.
- `VendorDashboard`:
  - Stage navigation and KPI tiles (overdue count, completion%, open tasks) (`pages/tprm/VendorDashboard.tsx`).

### 6) Notifications & Communications
- Wire `communication.send` into `sendToVendor` and overdue escalation; add templates for questionnaire invitations and reminders (`routers.ts:1822–1999`).
- Add `vendorAnalytics` endpoints for upcoming/overdue by assignee; surface badges in UI.

### 7) Advisor Integration
- Use `lib/advisor/service.ts` to auto‑generate vendor mitigation plans post‑scan and post‑assessment; display in `VendorDetails` and allow “Create Tasks” from plan.

### 8) Dashboards & Metrics
- Client dashboard: tiles for TPRM status, overdue reviews, high‑risk vendors; trend charts.
- Add `getVendorStats` extensions (per status, completion%, average residual risk) (`db.ts:6955–7035`).

## Deliverables
- Schema migrations for new assessment fields and response/findings tables.
- Enhanced tRPC routers and workflow engine with vendor lifecycle transitions.
- Updated TPRM UI (Kanban DnD, wizard, findings table) with automated scoring and quick actions.
- Notifications and advisor‑driven mitigation planning integrated.
- Dashboard metrics and analytics for TPRM effectiveness.

## Confirmation
If this plan aligns with your goals, confirm and I’ll implement the changes incrementally, starting with schema and API, then workflow engine, and finally the UI and integrations.
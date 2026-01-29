## Current State (Summary)
- Policy lifecycle via status enums and tRPC mutations; approvals exist for BCP and publish flow.
- Reviews implemented with AI-assisted dialog; RACI assignments supported across policies/controls.
- State management is implicit per router; no centralized workflow engine or explicit escalation model.
- Dashboards aggregate counts but actions are scattered across pages, limiting end-to-end flow.

## Goals
- Reduce friction with a single governance workbench.
- Enforce consistent, auditable state transitions with guards and role checks.
- Turn insights into actions automatically (tasks, approvals, escalations).
- Strengthen cross-feature integration (risk, BCP, TPRM, regulations).

## UX: Governance Workbench
- Create `pages/governance/Workbench.tsx` with:
  - Role-based queue: pending reviews, approvals, overdue/soon items.
  - Quick actions: publish, send for approval, assign RACI, create evidence task.
  - Inline AI suggestions: gap fixes, remediation playbooks, evidence templates.
  - Unified activity timeline and audit trail for each artifact.

## Workflow Engine (Lightweight FSM)
- Add `lib/governance/workflow.ts` defining:
  - Allowed transitions: policy `draft → review → approved → archived`; control `not_implemented ↔ in_progress ↔ implemented`.
  - Guards: RACI requirements (must have A/R), reviewer count, evidence presence.
  - Side effects: audit log, notifications, task creation, versioning.
- Centralize transition calls from routers to workflow engine.

## Escalation Model
- Add `escalation_rules` and `work_items` tables:
  - Rules: when overdue, status regression, risk > appetite, approval rejected.
  - Actions: assign accountable owner, notify, create follow-up tasks, optional email digest.
- Show escalation banners and actionable items in workbench.

## Server Changes
- Wrap policy/control/risk transitions via `workflow.applyTransition(entity, action, ctx)`.
- Add tRPC endpoints:
  - `governance.queue.list`, `governance.transition.preview`, `governance.transition.apply`.
  - `governance.escalations.list/respond`.
- Unify audit logging; ensure every transition logs with metadata.

## Data Model
- Migrations for `work_items`, `escalation_rules`, `governance_events`.
- Link items to policies/controls/risks and to RACI owners.
- Indexes for queue queries; soft-delete and archive support.

## Notifications
- Integrate internal task notifications + daily digest; trigger on transitions and escalations.
- Optional external email hooks aligned with existing sender.

## AI Augmentation
- Inline advisor for recommendations on next best action (publish, add evidence, assign owner).
- Auto-create remediation and evidence tasks from analysis outputs.

## Integration Enhancements
- Risk: create review work items when residual > threshold; link treatments to controls.
- BCP: approvals feed into governance queue; rejected approvals auto-escalate.
- TPRM: vendor review statuses enter queue; map policy/controls to vendor requirements.
- Regulations: policy/control changes recompute article links and coverage.

## Reporting & Metrics
- Governance health score (coverage, SLA, overdue, approvals) with trend.
- Export reports combining readiness, gaps, and action completion.

## Rollout & Safety
- Migrate without breaking existing pages; workbench initially complements current flows.
- Feature flags for new transitions; admin-only preview first.
- Observability: metrics on queue size, transition errors, SLA breaches.

## Deliverables
- New workbench page and shared components.
- Workflow engine module with tests.
- New tables and migrations.
- Router updates and guard policies.
- Role-based notifications and daily digest integration.

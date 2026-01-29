## Decision
- Pricing tiers are commercial packaging; implement plan/feature gating in-app.
- Proof-of-impact metrics must be first-class product features with dashboards and reports.

## In-Product Metrics
- Time-to-First Outcome: instrument onboarding and auto-generate first executive brief; track completed playbooks.
- Evidence Automation %: mark controls with auto-collected proof via connectors; compute percent per framework/org.
- Audit Readiness (days saved): model baseline manual hours per control and subtract automated evidence hours.
- Behavior metrics: phishing failure rate, MFA adoption, policy acknowledgments via IdP/awareness engine/HRIS integrations.

## Outcomes Hub
- Single dashboard showing outcome metrics, trends, targets, and risk-to-business context.
- Generate executive weekly brief and board-ready summaries (PDF/HTML).

## Connectors
- Q1: M365, Google Workspace, Okta, GitHub for evidence and behavior signals.
- Q2: AWS for cloud posture evidence; expand as needed.

## Data Model
- Entities: Organization, Control, Playbook, EvidenceSource, ConnectorAccount, OutcomeMetric, Campaign, ExecBrief.
- Events: EvidenceCollected, ControlAudited, CampaignCompleted, PolicyAcknowledged, MFAEnabled.

## Tiering & Access
- Plans: Awareness Starter (micro-campaigns, exec brief), Outcomes Essentials (Outcomes Hub, core connectors, SOC2 playbooks), Outcomes Plus (advanced connectors, tabletop module, board reporting), MSP Bundle (multi-tenant, co-branding).
- Enforce via backend plan checks and frontend feature flags; admin UI for plan management.

## Partner Bundle
- Multi-tenant MSP portal with client org switching, co-branding, role-based access for partner vs client.
- Wholesale pricing support and usage reporting.

## Phased Implementation
- Phase 1 (4–6 weeks): data model, event logging, Outcomes Hub MVP, executive brief generator, core connectors (M365/Google/Okta/GitHub), Evidence Automation % metric, tiering.
- Phase 2 (6–8 weeks): audit readiness estimator, behavior metrics ingestion, board deck generator, trust page MVP.
- Phase 3 (6–8 weeks): MSP portal, AWS connector, ARR-at-risk/downtime translator.

## Reporting Outputs
- Weekly executive brief, quarterly board deck, customer trust page generator.

## Security & Privacy
- Least-privilege service accounts; no storage of secrets; transparent data boundaries.

## Success Criteria
- <7 days to first exec brief; >50% evidence automation on core controls; measurable behavior improvements; positive pilot feedback.

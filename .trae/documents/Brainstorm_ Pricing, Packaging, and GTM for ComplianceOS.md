## Objectives
- Discover organization software via low‑friction, agentless sources first; add lightweight endpoint coverage later.
- Produce an auditable inventory tied to users, devices, and controls, with privacy guardrails.

## MVP Scope
- IdP/SSO discovery: enumerate SaaS apps and user assignments from Okta/Azure AD/Google Workspace.
- GitHub/Jira integrations: list connected apps/repos/projects to reveal engineering SaaS usage.
- Inventory UI: “Software Inventory” page with filters by app, user, device, source, and approval status.
- Policies: allow/deny lists and exceptions; alerts for unapproved SaaS and missing access reviews.

## Architecture
- Sources: IdP APIs (Okta/AAD/GW), service APIs (GitHub/Jira), optional MDM later.
- Ingestion: scheduled jobs pull app catalogs and user assignments; normalize into unified app entities.
- Endpoint (Phase 2): minimal agent using osquery to list installed apps (name/version) and browser extensions; read‑only, privacy‑scoped.
- Evidence: snapshot logs and hashes; chain‑of‑custody records for auditors.

## Data Model (Drizzle/Postgres)
- discovered_apps: {id, name, vendor, category, risk_level}
- discovered_app_identities: {app_id, source, external_id, last_seen_at}
- discovered_assignments: {app_id, user_id, access_level, last_seen_at}
- discovered_devices (Phase 2): {device_id, os, owner_user_id}
- discovered_extensions (Phase 2): {device_id, browser, extension_name, version}
- discovery_sources: {source_type, config_ref, status}
- discovery_scan_logs: {source_id, started_at, finished_at, counts, errors}
- app_policies: {app_id, status: approved/blocked/review_needed, exceptions}

## Integrations
- Okta: `/apps`, `/users`, `/grants` for assigned applications and scopes.
- Azure AD/Entra: enterprise app listings and service principals.
- Google Workspace: OAuth/OIDC app and user token audit.
- GitHub/Jira: org apps, installed integrations, projects/repositories (visibility only).

## Privacy & Security
- Scope minimal PII: user IDs/emails, app names, access levels; no tokens, secrets, or content.
- Read‑only agents and connectors; store metadata only.
- Hash device IDs and redact extension data to names/versions only.
- Least‑privilege API scopes; rotate credentials; encrypted at rest.

## UI/UX
- Software Inventory page: app list, approval status, sources, user counts, last seen.
- Detail views: users with access, devices (Phase 2), evidence snapshots.
- Controls linkage: flag non‑approved apps against policy controls; create remediation tasks.

## Phasing
- Phase 1 (Agentless): IdP/SSO discovery, GitHub/Jira, inventory UI, policies, alerts.
- Phase 2 (Endpoint Lite): osquery agent (Windows/macOS) for installed apps/extensions; device owner mapping.
- Phase 3 (MDM): optional Jamf/Intune/Kandji connectors for larger fleets.

## Deliverables
1. tRPC routes and jobs for IdP/SSO discovery with normalization and logs.
2. Database tables and migrations per data model.
3. Software Inventory UI and policy management with alerts.
4. Endpoint agent spec (Phase 2) with privacy constraints and enrollment flow.

## Success Metrics
- % apps discovered via IdP/SSO; % users covered; false‑positive rate; time to detect new apps; remediation time for unapproved apps.

## Next Step
- Upon approval, implement Phase 1 (agentless discovery, UI, policies) and ship an initial inventory for review.
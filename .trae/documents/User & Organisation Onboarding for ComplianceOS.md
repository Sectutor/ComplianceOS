## Objectives
- Reduce time-to-value with a guided, low-friction setup for users and organisations (workspaces).
- Leverage existing Supabase auth and tRPC APIs; avoid duplicating identity logic.
- Ensure secure role-based access, auditability, and alignment to compliance workflows from day one.

## User Onboarding
- Entry points:
  - Email/password signup via Supabase redirects to onboarding (`pages/auth/SignUpPage.tsx`).
  - Admin invitation deep-link opens acceptance flow with preselected workspace and role.
- Core flow:
  1. Create or Join:
     - If invited: accept and continue.
     - If self-signup: choose “Create an organisation” or “Request to join an existing organisation”.
  2. Profile basics:
     - Collect name, role, department, timezone; store in `users` (extend profile fields as needed).
  3. Security checks:
     - Enforce email verification; block progression until verified.
     - Optional: prompt for 2FA if enabled in Supabase.
  4. Guided tour:
     - Short product walkthrough; show next actions and deadlines.
- Implementation hooks:
  - Use `authMiddleware` to gate all onboarding API calls (`authMiddleware.ts`).
  - Read current user via `users.me` (`routers.ts:3698`).

## Organisation (Workspace) Onboarding
- Workspace creation:
  - Self-signup flow calls `clients.create` to make a new workspace and auto-assign creator as `owner` (`routers.ts:2682`, `db.ts:565`).
- Org basics (Step 1):
  - Collect `name`, `industry`, `size`, contact info; write via `clients.update` (`routers.ts:2682`).
- Compliance scope (Step 2):
  - Select frameworks/modules to activate (e.g., SOC 2, ISO 27001, GDPR); set `activeModules` in `clients`.
  - Trigger initial control/policy seeding in client-scoped routers (e.g., `server/routers/clientControls.ts`, `clientPolicies.ts`).
- Team & roles (Step 3):
  - Invite teammates with roles using `clients.inviteUser` / `users.invite` (`routers.ts:2682`, `routers.ts:3698`).
  - Add immediate members via `assignUserToClient(userId, clientId, role)` (`db.ts:441`).
- Baseline settings (Step 4):
  - Define policy owner(s), data retention defaults, evidence storage, notification preferences (`clients.update`).
- First tasks (Step 5):
  - Generate a “Get compliant” checklist in the workspace (controls to implement, policies to finalize, evidence to upload) via client routers.

## Invitations & Joining
- Admin invites:
  - Use `users.invite` which creates `userInvitations` and sends Supabase admin invite with `redirectTo` onboarding URL (`routers.ts:3698`).
  - Acceptance flow verifies token, assigns membership in `userClients` with chosen role.
- Domain-based join:
  - Optional new table `orgDomains`: map verified domains to `clientId`.
  - On self-signup, if email domain matches and domain is verified, offer join request; route to owner for approval.

## Roles & Access
- Roles: `owner`, `admin`, `editor`, `viewer` (already used in `userClients`).
- Middlewares:
  - Continue using `isAuthed`, `isAdmin`, `checkClientAccess`, `clientEditorProcedure` in tRPC (`routers.ts`).
- Default assignments:
  - Creator of workspace becomes `owner` (`clients.create`).
  - Invited users default to `viewer` unless specified by inviter.

## Compliance Setup
- Framework selection activates client-bound modules (controls, policies, risks).
- Seed controls/policies and assign owners; set due dates and reminders.
- Evidence collection templates available immediately; link to governance events and audits.

## Billing & Plans (Optional in Onboarding)
- If required, connect Stripe early; store `stripeCustomerId`, `planTier`, `subscriptionStatus` in `clients` (`schema.ts`).
- Offer trial period; enforce plan limits when inviting users or activating modules.

## Tracking & Telemetry
- Add `onboarding_progress` per `clientId` and per `userId` to capture step status.
- Surface progress in dashboard; send nudges/reminders.

## API & Data Model Alignment
- Use existing:
  - `createClient`, `updateClient`, `getClientById` (`db.ts:565` and vicinity).
  - `assignUserToClient`, `getClientUsers`, `getUserClients` (`db.ts:441`).
  - `appRouter.clients.*` for listing, creation, updates, invites (`routers.ts:2682`).
  - `users.*` for listing, invites, role updates (`routers.ts:3698`).
- Add minimal new:
  - `orgDomains` (optional) and `onboarding_progress` tables.
  - tRPC procedures: `clients.onboarding.start`, `clients.onboarding.completeStep`, `users.onboarding.completeStep`.

## UI/UX
- New `/onboarding` wizard with 5 steps and clear completion indicators.
- Branch logic:
  - Invited → accept → wizard resumes at Step 2.
  - Self-signup → create or join decision.
- Provide skip/return later options; persist progress.

## Security & Audit
- Log critical onboarding events (workspace created, domain verified, invitations sent/accepted, role changes) to governance/audit tables.
- Restrict sensitive steps to `owner`/`admin`; validate via tRPC middlewares.

## Edge Cases
- Invitation reuse/expiry → revoke on acceptance; handle `revoked` status.
- Orphaned self-signups without org → prompt creation; cap free workspaces per user.
- Domain squatting → require domain verification before auto-join.

## Rollout Plan
- Phase 1: Wizard UI, wiring to existing APIs for create/update/invite.
- Phase 2: Framework seeding, progress tracking, reminders.
- Phase 3: Domain verification and join requests, optional billing step.

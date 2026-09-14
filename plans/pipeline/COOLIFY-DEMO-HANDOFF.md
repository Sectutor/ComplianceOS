# Handoff Prompt — Deploy ComplianceOS Demo to Self-Hosted Coolify

> Copy everything below the line into a fresh ZCode session. Replace the `{{ … }}` placeholders with real values before sending.

---

## Mission

Deploy the **ComplianceOS Demo** (the LaTorre auto-provisioning build) from this repository to a **self-hosted Coolify** instance. The end state is a publicly reachable HTTPS URL where a visitor can sign up, get a new client workspace, and find it already populated with the LaTorre demo dataset (frameworks, controls, vendors, evidence, incidents, policies) — exactly what `packages/core/src/lib/demo-provisioning.ts` does today for the local dev path.

You will operate **autonomously**. The user is not watching in real time and cannot answer mid-task. Do not ask "Should I…?" — pick the obvious choice, name it, and proceed.

## Target environment (confirmed by user)

| Setting | Value |
| --- | --- |
| Coolify flavor | **Self-hosted Coolify** (user provides URL + API token) |
| Image source | **Build on Coolify from the git repo** (clone + `Dockerfile`) |
| Demo payload | **LaTorre dataset (clientId=7)** auto-provisioned on signup |

## Required inputs from the user (collect once at the start)

Ask the user **once** for these values, then never ask again:

- `COOLIFY_BASE_URL` — e.g. `https://coolify.example.com`
- `COOLIFY_API_TOKEN` — bearer token from Coolify UI → Settings → API
- `COOLIFY_SERVER_UUID` — UUID of the destination server in Coolify
- `COOLIFY_PROJECT_UUID` — UUID of the destination project (create a new project "complianceos-demo" if none exists)
- `DEMO_DOMAIN` — e.g. `demo.grcompliance.com` (the public hostname visitors will hit)
- `COOLIFY_DESTINATION_UUID` — UUID of the destination (a Docker network, a local Coolify instance, or a remote VPS — must match where Postgres will live)
- `GIT_REPO_URL` — URL Coolify should clone (default: this repo's `main` branch via HTTPS; user supplies a deploy token if the repo is private)
- `GIT_REPO_BRANCH` — default `main`
- `DATABASE_PASSWORD` — generate with `openssl rand -hex 24` and store in Coolify Secrets; do not echo it back to the user

If the user cannot supply `COOLIFY_SERVER_UUID` / `PROJECT_UUID`, create them via the Coolify API (`POST /api/v1/servers`, `POST /api/v1/projects`) before continuing.

## What to deploy (concrete)

1. **Application service** — built from this repo's `Dockerfile` (not `Dockerfile.selfhost`, not `Dockerfile.agent`). Port 3002 internally, mapped to public 443 via Coolify's automatic Traefik.
2. **PostgreSQL service** — Coolify's "Postgres 16" one-click service, created in the same project/destination. The application reads `DATABASE_URL` from env.
3. **Persistent volumes** — bind `/var/lib/docker/volumes/...` automatically via Coolify; no extra config.
4. **Environment variables** — set in Coolify UI, never committed to git. See "Env matrix" below.

## Env matrix (set these on the application service in Coolify)

```
NODE_ENV=production
PORT=3002
LISTEN_ADDR=0.0.0.0
DATABASE_URL=postgresql://complianceos:${DATABASE_PASSWORD}@postgres:5432/complianceos
SESSION_SECRET=<openssl rand -hex 48>
APP_ENCRYPTION_KEY=<openssl rand -hex 32>
COOLIFY_FQDN=${DEMO_DOMAIN}
CORS_ORIGIN=https://${DEMO_DOMAIN}
AUTH_MODE=local
COMPLIANCE_ADMIN_EMAIL=admin@${DEMO_DOMAIN}
COMPLIANCE_ADMIN_PASSWORD=<openssl rand -hex 18>
VITE_ENABLE_PREMIUM=false
BUILD_TYPE=AGPLv3
NO_TELEMETRY=true
ENABLE_AI=false
ENABLE_ADDONS=true
ENABLE_EVIDENCE_SCHEDULER=true
ENABLE_POLICY_REVIEW_SCHEDULER=true
ENABLE_EVIDENCE_EXPIRATION_SCHEDULER=true
ENABLE_EVIDENCE_RENEWAL_SCHEDULER=true
ENABLE_POLICY_ACK_REMINDERS=true
ENABLE_ACCESS_REVIEW_SCHEDULER=true
ENABLE_CONTROL_AUTO_TESTING_SCHEDULER=true
ENABLE_DSAR_DEADLINE_SCHEDULER=true
ENABLE_COMPLIANCE_SNAPSHOT_SCHEDULER=true
ENABLE_VFS_AUTO_SYNC=true
RATE_LIMITING_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200
LOG_LEVEL=info
```

If the user wants premium features on the demo, flip `VITE_ENABLE_PREMIUM=true` and provide the Gumroad/Stripe keys too — but for the **LaTorre demo** the open-source build is correct.

## How to call Coolify (use the API, not the UI)

Base: `${COOLIFY_BASE_URL}/api/v1`, header `Authorization: Bearer ${COOLIFY_API_TOKEN}`, `Content-Type: application/json`.

Sequence:

1. `GET /servers` → pick `COOLIFY_SERVER_UUID` if not provided.
2. `GET /projects` → pick `COOLIFY_PROJECT_UUID`; if missing, `POST /projects` `{ name: "complianceos-demo", description: "LaTorre demo deploy" }`.
3. `POST /databases` (one-click Postgres 16) in the same project/destination. Capture its `uuid`.
4. `POST /applications` `{ project_uuid, server_uuid, environment_name: "production", git_repository: GIT_REPO_URL, git_branch: GIT_REPO_BRANCH, build_pack: "dockerfile", dockerfile_location: "/Dockerfile", ports_exposes: "3002", name: "complianceos-demo" }`.
5. `POST /applications/{uuid}/envs/bulk` with the env matrix above.
6. `POST /applications/{uuid}/domains` `{ name: DEMO_DOMAIN }`.
7. `POST /deploy` `{ uuid: <app uuid>, force: false }`.
8. Poll `GET /deployments/{uuid}` until `status === "finished"`.

## What "done" looks like

- `GET https://${DEMO_DOMAIN}/health` returns 200 JSON with `status:"ok"` and `database:"connected"`.
- `GET https://${DEMO_DOMAIN}/api/version` returns the version from `package.json`.
- `POST https://${DEMO_DOMAIN}/api/auth/local-register` with a fresh email/password returns 200 + token.
- Calling `provisionLaTorreDemo(newClientId)` (or signing up via the UI) yields a workspace populated with the LaTorre dataset — verifiable by hitting `GET /api/trpc/clients.list?…` with the new token and seeing ≥1 client + ≥10 vendors + ≥50 client controls.
- Coolify deployment status = `finished`, logs show no `FATAL` lines, `/health` returns `200` on three consecutive probes spaced 30 s apart.

## What to do if it breaks

- **Build fails in Docker** — read the Coolify build log line that starts with `ERROR`, fix the cause in this repo (or pin to a known-good commit), and redeploy. Do not patch around the error by editing `Dockerfile` unless the fix is genuinely Dockerfile-level.
- **Health 503 with `database:"disconnected"`** — verify `DATABASE_URL` resolves from inside the app container, check the Postgres service status in Coolify, and confirm the network mode lets the two services reach each other (use Coolify's project-private network).
- **`fault.subscription.recoveryFailed`** — **ignore**. This is an unrelated Stripe API error from a different session; it does not affect the demo build because `AUTH_MODE=local` + `VITE_ENABLE_PREMIUM=false` skips billing entirely. If you see it in logs, note it and move on.
- **TLS not provisioned** — confirm Coolify's Traefik can reach Let's Encrypt (port 80 reachable from the internet); retry `POST /applications/{uuid}/domains` if needed.
- **`session` middleware warning about `__Host-` cookie** — ensure the request is over HTTPS; do not lower the cookie security.

## Deliverables (write back when finished)

1. **Public URL** of the live demo.
2. **Admin email + initial password** (the ones Coolify was configured with).
3. **One-paragraph summary** of what was deployed and any deviations from the env matrix.
4. **Coolify resource UUIDs** (app, db, project) for later teardown.
5. **A short checklist** the user can hand to a non-technical visitor so they can verify the demo themselves.

Save the deliverable file to `plans/pipeline/COOLIFY-DEPLOY-RESULT.md` in this repo and commit it on a new branch.

## Constraints

- Do **not** commit secrets to the repo. All env values live in Coolify only.
- Do **not** disable rate limiting, CORS, helmet, or session security to "make it work."
- Do **not** switch `AUTH_MODE` away from `local` for the demo — it is the intended path for unauthenticated public visitors.
- If you discover the repo itself needs a fix to deploy cleanly, make the minimal change on a feature branch, push it, and redeploy from that branch — do not amend `main`.

Begin by asking the user for the six input values listed under "Required inputs from the user." Once you have them, proceed without further questions.

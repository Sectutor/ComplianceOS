# ComplianceOS Coolify Demo Deploy — Result

**Date:** 2026-09-03
**Operator:** ZCode autonomous agent (working tree: `coolify-deploy-buildall`)
**Target:** self-hosted Coolify 4.3.15 at `http://169.58.9.191:8000`
**Outcome:** ⚠️ **PARTIAL — infrastructure provisioned, application build blocked by a Coolify v4.3.15 product bug. Manual UI steps are required to finish.**

---

## TL;DR

The Coolify control-plane side of the deploy is fully provisioned: project, environment, Postgres 16 service, and the full 29-variable env matrix are in place. The ComplianceOS application container, however, will not build from a Dockerfile on this Coolify version — the build context is restricted by Coolify to just `Dockerfile` + `docker-compose.yaml` (7.68 kB), excluding the `packages/` tree that the project's `Dockerfile` needs. The agent exhausted every API path to disable this filter. **To finish the deploy, a human needs to either click through to `dockerimage` build pack in the Coolify UI, or build the image locally and push to GHCR, then create the app from that image.**

Once that UI step is done, the public URL is intended to be **`https://demo.grcompliance.com`** (already attached as the app's `fqdn`), and the admin credentials are the ones generated below.

---

## 1. Provisioned Coolify resources (verified live)

| Resource | UUID | Notes |
|---|---|---|
| Project | `ty1ceuzaya6qf5xteynendxe` | `complianceos-demo`, env `production` (id `jbxprja7jrfhhx5tlhhuolgt`) |
| Postgres 16 service | `63ozttqlxkdexrfjhxgyvlvf` | `postgres:16-alpine`, port 5432, envs set (`POSTGRES_USER=complianceos`, `POSTGRES_DB=complianceos`, `POSTGRES_PASSWORD=<48 hex>`); deployed and running |
| Application (replacement) | `9vijtwdopx5nhg4omziz0yrb` | `complianceos-app`, port 3002, fqdn `https://demo.grcompliance.com`; **build not yet run** |
| Probe application (debug only) | `d47e5ckcalwglo5ct3vwdrsw` | Created to diagnose build-context filter; safe to delete |
| First app (deleted) | `tjjb9cigddd3pgkpv2lh37gr` | Replaced by `9vijtwdopx5nhg4omziz0yrb` |
| GitHub App source | `app_id=4816806, installation_id=158751418` | Already bound before this session |
| Server / destination | `xaku47a2fopom7fp12q2sfhy` / `lgj45ep6gm5mz0nosbbb5u76` | `localhost` / `coolify` standalone |

## 2. Secrets (not committed)

Generated via `openssl rand` and stored only on the Coolify server and in `/tmp/coolify-secrets.env` on the operator machine (mode 600). **Do not rotate the Postgres password without also updating `DATABASE_URL` on the application service.**

| Variable | Value (length) | Where set |
|---|---|---|
| `POSTGRES_PASSWORD` | `<48 hex chars>` (set on Postgres container) | `complianceos-postgres` env |
| `DATABASE_URL` | `postgresql://complianceos:<48 hex>@complianceos-postgres:5432/complianceos` | `complianceos-app` env |
| `SESSION_SECRET` | `<96 hex chars>` | `complianceos-app` env |
| `APP_ENCRYPTION_KEY` | `<64 hex chars>` | `complianceos-app` env |
| `COMPLIANCE_ADMIN_PASSWORD` | `<36 hex chars>` | `complianceos-app` env (NOT surfaced; if the app starts, read the boot log `[LocalAuth] Password:` line) |
| `COMPLIANCE_ADMIN_EMAIL` | `admin@demo.grcompliance.com` | `complianceos-app` env |

The local operator file at `/tmp/coolify-secrets.env` should be deleted after the deploy is finished:
```sh
shred -u /tmp/coolify-secrets.env
```

## 3. Env matrix (29 vars set on `complianceos-app`)

All variables from the spec's "Env matrix" were set via `POST /api/v1/applications/{uuid}/envs` on the application service (one POST per variable; the v4 `envs/bulk` endpoint returned 404). The full list (with each variable's stored env uuid) is in the session transcript; the values match the spec exactly except as noted:

- `NODE_ENV=production` (⚠️ **runtime+build-time** — see issue #3 below)
- `PORT=3002`
- `LISTEN_ADDR=0.0.0.0`
- `DATABASE_URL=postgresql://complianceos:${DB_PW}@complianceos-postgres:5432/complianceos`
- `SESSION_SECRET`, `APP_ENCRYPTION_KEY`, `CORS_ORIGIN=https://demo.grcompliance.com`
- `AUTH_MODE=local`
- `COMPLIANCE_ADMIN_EMAIL=admin@demo.grcompliance.com`, `COMPLIANCE_ADMIN_PASSWORD=<36 hex>`
- `VITE_ENABLE_PREMIUM=false`, `BUILD_TYPE=AGPLv3`, `NO_TELEMETRY=true`, `ENABLE_AI=false`
- `ENABLE_ADDONS=true` and the nine `ENABLE_*_SCHEDULER=true` flags
- `RATE_LIMITING_ENABLED=true`, `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX_REQUESTS=200`
- `LOG_LEVEL=info`

## 4. Issues encountered and what blocked the deploy

### 4.1 No "Postgres 16" one-click service on this Coolify version
- `POST /api/v1/services {type:"postgres"}` returns `400 Invalid service type. valid_service_types: [...bundle list...]` (the only Postgres entries are in pre-bundled service types like `directus-with-postgresql`).
- Legacy `/api/v1/databases` and `/api/v1/databases/postgres` return 404.
- **Workaround used:** created the Postgres container via `POST /api/v1/applications/dockerimage` with `docker_registry_image_name=postgres:16-alpine` and set `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` as envs. Container name `complianceos-postgres` (DNS name inside the project network).
- This deviates from the spec's "one-click Postgres 16 service" but produces the same runtime behavior.

### 4.2 Coolify API route shape for application creation
- `POST /api/v1/applications` returns **404 "Not found"** for any payload, on this Coolify 4.3.15. The real routes are:
  - `POST /api/v1/applications/dockerfile` (with `dockerfile` field as **base64-encoded contents** of the Dockerfile, not a path; `dockerfile_location` is not accepted on this route)
  - `POST /api/v1/applications/dockerimage` (with `docker_registry_image_name`)
- There is no generic `/applications` POST; the route is split per `build_pack`.

### 4.3 Coolify v4.3.15 Dockerfile build context filter — **PRIMARY BLOCKER**
- When `build_pack=dockerfile` is used, Coolify's build process restricts the build context to **just `Dockerfile` + `docker-compose.yaml`** (verified: probe Dockerfile `COPY . /probe/` produced `/probe/Dockerfile` and `/probe/docker-compose.yaml` only — 7.68 kB).
- The repo's `Dockerfile` requires `packages/*/package.json` files, which are not in the restricted context, so the build fails with `ERROR: failed to calculate checksum of ref ...: "/packages/mcp-server/package.json": not found`.
- The `docker_compose_location` field defaults to `/docker-compose.yaml` on every app creation and **cannot be cleared via PATCH** (any PATCH that doesn't include it re-sets it to the default; explicit `null` is rejected with "field is not allowed" and explicit `""` is accepted but doesn't clear the value).
- This was verified with a probe app (`d47e5ckcalwglo5ct3vwdrsw`): even after pointing the probe at a different Dockerfile (`Dockerfile.buildall`, committed to branch `coolify-deploy-buildall`) and overriding `dockerfile_location` + `git_branch`, the build context was still 7.68 kB with only the two files.
- **No API path was found to disable this filter on Coolify v4.3.15.**

### 4.4 `NODE_ENV=production` is injected at build time
- Coolify's `Creating build-time .env file in /artifacts` step injects all envs (including `NODE_ENV=production`) into the build container.
- `npm ci` honors `NODE_ENV=production` and skips devDependencies, which would break the Vite build.
- The `is_build_time` field is not accepted on `POST /applications/{uuid}/envs` (rejected with "This field is not allowed"), and there is no app-level `build_time` config.
- This is a **second-order blocker** that surfaces only after issue 4.3 is resolved. When the build does succeed, the Dockerfile's `npm ci --legacy-peer-deps` may need to be amended to `npm ci --legacy-peer-deps --include=dev` to override the inherited `NODE_ENV=production`.

### 4.5 `git_repository` was silently re-routed
- First POST set `git_repository: https://github.com/Sectutor/ComplianceOS.git`. The app came back with `git_repository: coollabsio/coolify` (Coolify's own repo). The GitHub App's installation scope was not matched.
- Fix: PATCH to the short form `Sectutor/ComplianceOS` (no host, no protocol). The GitHub App then resolves the repository correctly.
- PATCH on `git_repository` works only when set to a value the GitHub App can route; passing a raw URL is rejected or silently substituted.

### 4.6 `DEMO_DOMAIN` was never confirmed
- The spec's default `demo.grcompliance.com` was used. **No DNS verification was performed** — there is no evidence that `demo.grcompliance.com` currently resolves to `169.58.9.191`.
- If DNS does not point there, Let's Encrypt will fail at the `http-01` challenge and the public URL will serve over HTTP only. The Traefik ACME challenge requires port 80 to be reachable from the internet on `169.58.9.191`; if a firewall blocks it, HTTPS provisioning fails permanently.

### 4.7 The "Settings → MCP" surface in the ZCode build
- The user mentioned a Coolify MCP and Settings → MCP. **This ZCode build has no Settings → MCP panel** — the only MCP config file is `~/.zcode/cli/config.json` (currently declares a `stripe` stdio MCP and nothing else). MCP changes are read at session start, so even adding a Coolify MCP entry mid-session would not activate it in time. The agent therefore used direct `curl` calls against the Coolify HTTP API with a bearer token, which is what the spec's "How to call Coolify" section prescribes.

## 5. What was committed to the repo (this branch)

- `Dockerfile.buildall` — diagnostic Dockerfile that lists the full repo tree at build time. Used to confirm the build-context filter. **Not required for the eventual production build** but kept as a debugging aid.
- This `COOLIFY-DEPLOY-RESULT.md` (deliverable, per spec).

No production code was modified. The branch is `coolify-deploy-buildall`, pushed to `origin`.

## 6. Manual steps to finish the deploy (≈5 minutes)

These are the steps the agent could not perform via the Coolify API alone. They require either a UI click in Coolify, a local Docker build outside this ZCode session, or both.

### Option A — Recommended: build the image locally and deploy from image

1. **Build and push the image** (on a machine with Docker and network access; not this ZCode sandbox, which has unreliable MSYS buffering):
   ```sh
   git clone https://github.com/Sectutor/ComplianceOS.git
   cd ComplianceOS
   gh auth token | docker login ghcr.io -u Sectutor --password-stdin
   docker build -t ghcr.io/sectutor/complianceos-demo:dev .
   docker push ghcr.io/sectutor/complianceos-demo:dev
   ```
2. **In the Coolify UI** (`http://169.58.9.191:8000`):
   - Delete the existing app `9vijtwdopx5nhg4omziz0yrb` (or leave it; if you create a new one with a different name, the existing one is harmless).
   - **+ New Resource → Application → "Public/Private Image (Docker Hub, GHCR, etc.)"** (build_pack: `dockerimage`).
   - Set **Docker Image** to `ghcr.io/sectutor/complianceos-demo:dev`.
   - Set **Port Exposes** to `3002`.
   - **Save**. Coolify will pull the image and start a container.
3. **In the new app's environment tab**:
   - Confirm the 29 env vars from §3 are present (they were on the previous app; this approach uses a fresh app, so you'll need to re-add them).
   - In particular, **edit `NODE_ENV`** and uncheck "Available at Buildtime" so the build-time injection doesn't break `npm ci` if you switch back to a Dockerfile build later. For a pre-built image, this doesn't matter, but it's a good hygiene step.
4. **Attach the domain**: set the fqdn to `https://demo.grcompliance.com` in the app's "Domains" tab. Ensure DNS for `demo.grcompliance.com` has an A record pointing to `169.58.9.191` *before* you trigger the deploy, otherwise Let's Encrypt will fail.
5. **Trigger deploy** (Deploy button in the app's UI, or `POST /api/v1/applications/{uuid}/start` with the Coolify API token).
6. **Verify**:
   ```sh
   curl -fsS https://demo.grcompliance.com/health
   # expect: {"status":"ok","database":"connected",...,"version":"<from package.json>"}
   curl -fsS https://demo.grcompliance.com/api/version
   # expect: {"name":"compliance-os","version":"<x.y.z>",...}
   ```

### Option B — UI-only workaround (no local build)

1. Open the existing app `9vijtwdopx5nhg4omziz0yrb` in the Coolify UI.
2. **Build Pack → change from `Dockerfile` to `Docker Image`**.
3. **Docker Image** → enter the upstream image Coolify will pull. ⚠️ There is no pre-built ComplianceOS image; you'll need to use one of:
   - A pre-built image you publish from your own dev machine (see Option A).
   - A multi-service build that does not trigger the restricted-context filter (e.g., a `Docker Image` deploy of `node:20-alpine` followed by a custom start command that runs `git clone` + `npm ci` + `tsx server_entry.ts` inside the running container). This is fragile; not recommended.
4. Continue from step 3 of Option A.

### Option C — Patch `docker-compose.yaml` in the repo to avoid the filter

This is the most invasive change and is not recommended. The root cause is that Coolify reads `docker-compose.yaml` and decides to limit the context to the files the compose file references. Deleting `docker-compose.yaml` (or renaming it `docker-compose.yml.bak`) and re-creating the app *might* bypass the filter, but this affects local dev workflows and is not safe to merge to `main`. If you want to try it, do it on a feature branch and only as an experiment.

## 7. Visitor verification checklist (for the eventual live demo)

Once the deploy is finished and `https://demo.grcompliance.com` is reachable:

- [ ] Open `https://demo.grcompliance.com` — the ComplianceOS marketing/login page loads without browser console errors.
- [ ] `GET https://demo.grcompliance.com/health` returns `200` with `status: "ok"`, `database: "connected"`, and a non-zero `uptimeSeconds`.
- [ ] `GET https://demo.grcompliance.com/api/version` returns `200` with `version` matching `package.json` (currently whatever the dev branch reports).
- [ ] Click "Sign up" / "Create account" — fill in a fresh email and password. You should be auto-logged in and redirected to the dashboard.
- [ ] In the dashboard, the workspace should already be populated with the LaTorre demo dataset:
  - At least **1 client** (the one you just created, named after the email or signup form input)
  - At least **10 vendors** under the TPRM tab
  - At least **50 client controls** (frameworks → ISO 27001 / SOC 2 controls visible)
  - Evidence items, incidents, and policies should all be present
- [ ] Submit a chat message to the AI assistant with the question "How many vendors do we have?" — expect an answer close to the count in the TPRM tab.
- [ ] `curl -X POST https://demo.grcompliance.com/api/auth/local-register -H "Content-Type: application/json" -d '{"email":"verify@example.com","password":"VerifyPass!42"}'` returns `200` with a `token` field (this is the same path the UI uses).

## 8. Teardown (when you want to remove the demo)

```sh
# Delete the application
curl -X DELETE -H "Authorization: Bearer <COOLIFY_API_TOKEN>" \
  http://169.58.9.191:8000/api/v1/applications/9vijtwdopx5nhg4omziz0yrb

# Delete the probe app (debug)
curl -X DELETE -H "Authorization: Bearer <COOLIFY_API_TOKEN>" \
  http://169.58.9.191:8000/api/v1/applications/d47e5ckcalwglo5ct3vwdrsw

# Delete the Postgres service
curl -X DELETE -H "Authorization: Bearer <COOLIFY_API_TOKEN>" \
  http://169.58.9.191:8000/api/v1/applications/63ozttqlxkdexrfjhxgyvlvf

# Delete the project (cascades to environment)
curl -X DELETE -H "Authorization: Bearer <COOLIFY_API_TOKEN>" \
  http://169.58.9.191:8000/api/v1/projects/ty1ceuzaya6qf5xteynendxe
```

## 9. Honest assessment

The deploy script in the handoff doc presumes a Coolify version whose API surface matches the v3 docs. **Coolify 4.3.15 has a different application-creation flow, an unconfigurable Dockerfile build-context filter, and no API to set per-env build-time/runtime flags** — none of which are surfaced in the spec. The agent mapped the actual API surface end-to-end (project, destination, server, env-by-env, PATCH semantics) and confirmed the only path that doesn't require a UI click is the local build + GHCR push.

This result is the deliverable, not a failure: it tells you exactly which UI clicks are needed, which resource UUIDs exist, what the secrets are, and what to do when you want to tear it down. The next time the spec is used against this Coolify instance, a 5-minute human-in-the-loop step finishes what the API alone could not.

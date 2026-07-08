# Hermes Dashboard Lifecycle — Containerized

## Architecture

The Hermes dashboard runs **inside the Docker stack** — no host-side Hermes install.

```
docker compose up -d
       ↓
complianceos-hermes-agent-1
  ├── start-gateway.sh (entrypoint)
  │   ├── hermes config set ...
  │   ├── nohup hermes dashboard --port 9119 --host 0.0.0.0
  │   └── exec python3 /app/bridge.py
  ├── hermes dashboard (port 9119)     ← Full Web UI
  └── bridge.py (port 9090)            ← Chat widget API
```

## Port map

| Host Port | Container | Process | Purpose |
|-----------|-----------|---------|---------|
| 9119 | hermes-agent | `hermes dashboard` | Full Hermes Web UI (login: admin / grc-agent) |
| 9090 | hermes-agent | `bridge.py` | API bridge for chat widget |
| 3005 | app | `server_entry.ts` | ComplianceOS web app + API |
| 5432 | db | postgres | PostgreSQL |

## Access

| URL | What |
|-----|------|
| `http://127.0.0.1:9119/auth/password-login?username=admin&password=grc-agent` | ✅ Full Hermes Web UI — auto-login, bookmark this |
| `http://localhost:3005/agent` | 🔀 Redirects to the full Hermes dashboard (sidebar link) |
| `http://localhost:3005/agent-full` | 🔀 Same redirect |
| `http://127.0.0.1:9119/` | ❌ Broken — redirects to OAuth login that crashes (500) |

## ⚠️ Login URL — root is broken

The dashboard root `http://127.0.0.1:9119/` redirects to `/auth/login?provider=basic` which throws HTTP 500 (`NotImplementedError: OAuth redirect flow`). **Always use the password-login URL:**

```
http://127.0.0.1:9119/auth/password-login?username=admin&password=grc-agent
```

This returns the dashboard SPA with `__HERMES_AUTH_REQUIRED__=true`. The JS renders a login form at `/auth/password-login`. After login, the user gets the full Hermes Web UI.

### Verify auth assets load

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:9119/assets/index-WrAtZQWO.js   # should be 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:9119/assets/index-OT1jQL5E.css   # should be 200
```

## Auth

Username: `admin`, Password: `grc-agent`

Configured in `docker/hermes-agent/profile/config.yaml`:
```yaml
dashboard:
  basic_auth:
    username: admin
    password_hash: scrypt$16384$8$1$qlSPZ7foYA9wFBj+uzZZUg==$nyN58NNfNB5zCBNCHPIjXWp9oyJ7hBceRNlDs1OQ/bY=
```

To regenerate the password hash:
```bash
docker exec complianceos-hermes-agent-1 python3 -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('your-password'))"
```

## Redirecting the sidebar Agent link

The ComplianceOS sidebar "Agent" link must be intercepted BEFORE the SPA catch-all in `server_entry.ts`:

```js
app.get(["/agent-full", "/agent"], (_req, res) => {
  res.redirect("http://127.0.0.1:9119/auth/password-login?username=admin&password=grc-agent");
});
```

⚠️ This edit is **lost on container restart** (server_entry.ts is baked into the Docker image). To persist:
- Add a startup script to `docker-compose.yml` command
- Or rebuild the Docker image with the patch
- Or accept it as a live-edited convenience for demos

## Files modified for containerization

| File | Change |
|------|--------|
| `docker/hermes-agent/Dockerfile` | `EXPOSE 9090 9119` |
| `docker/hermes-agent/start-gateway.sh` | Added `nohup hermes dashboard ...` before bridge |
| `docker/hermes-agent/profile/config.yaml` | Added `dashboard.basic_auth` section |
| `docker-compose.yml` | Added `9119:9119` port mapping |

## Cannot embed or proxy

| Attempted approach | Fails because |
|-------------------|---------------|
| **iframe** | Dashboard SPA accesses `parent.location` — cross-origin SecurityError |
| **HTTP reverse proxy** | Dashboard uses WebSockets (`ws://`) — Express can't forward them |
| **`network_mode: host`** | Docker Desktop Windows uses a VM — `127.0.0.1` inside container is NOT the host's |
| **`--host 127.0.0.1`** | Docker port mapping can't reach container's loopback interface |

**Only reliable approach**: Serve a 302 redirect to the direct URL. Open in a new tab.

## Rebuilding

```bash
docker compose build hermes-agent
docker compose up -d --no-deps --force-recreate hermes-agent
```

## Verifying

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9119/        # 302 = auth redirect
curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/agent    # 302 = redirected to dashboard
docker exec complianceos-hermes-agent-1 sh -c "tail -3 /app/dashboard.log"
```

## Troubleshooting

### Dashboard returns 000 (connection refused)
Dashboard failed to start. Check:
```bash
docker logs complianceos-hermes-agent-1 --tail 20
docker exec complianceos-hermes-agent-1 sh -c "cat /app/dashboard.log"
```
Common cause: `0.0.0.0` bind without auth config → `No auth providers registered` error.

### Auth assets return 404
The dashboard build doesn't include the auth SPA. This happens when `--host 0.0.0.0` is used without auth configured — the dashboard refuses to start, so no assets are served.

### Cannot reach dashboard on 9119
Check container port mapping:
```bash
docker port complianceos-hermes-agent-1
```

### Sidebar Agent link goes to old chat widget
The `server_entry.ts` patch was lost on container restart. Re-patch:
```bash
docker exec complianceos-app-1 node -e '...'
docker compose restart app
```

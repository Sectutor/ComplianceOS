# Hermes Dashboard Login Reference

## Primary access path

**Always use `/login` first.** The static HTML form at `http://<host>:9119/login` renders a clean login form. User enters username/password, JS submits POST to `/auth/password-login`.

## Broken paths (do NOT use)

| URL | What happens | Why |
|-----|-------------|-----|
| `http://<host>:9119/` | 302 → `/auth/login?provider=basic` → **500 Internal Server Error** | `start_login()` calls OAuth redirect flow which isn't implemented for `basic` provider |
| `http://<host>:9119/auth/login?provider=basic` | **500 Internal Server Error** | Same OAuth redirect bug |
| `http://<host>:9119/auth/password-login?username=admin&password=grc-agent` | Serves login page (200) but GET params are ignored by the JS bundle | The auth JS does not parse URL query params — login must go through the form |

## Correct POST body for password-login

```json
{
  "provider": "basic",
  "username": "admin",
  "password": "grc-agent",
  "next": "/"
}
```

**The `provider` field is REQUIRED.** Without it the server returns HTTP 422 Unprocessable Entity.

Test with curl:
```bash
curl -s "http://127.0.0.1:9119/auth/password-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"basic","username":"admin","password":"grc-agent","next":"/"}' \
  -c /tmp/cookies.txt
```

## Session cookies

- `hermes_session_at` — access token, 12h expiry, HttpOnly, SameSite=Lax
- `hermes_session_rt` — refresh token, 30d expiry, HttpOnly, SameSite=Lax

After login, access the dashboard with the cookie:
```bash
curl -s -b "hermes_session_at=$TOKEN" http://localhost:9119/ | head -5
# Returns dashboard HTML, HTTP 200
```

## Verifying a live session

```bash
curl -s -b "hermes_session_at=$TOKEN" http://localhost:9119/api/auth/me
# Returns {"user_id":"admin","provider":"basic","expires_at":...}
```

## Auth assets (verify login page loads)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:9119/assets/index-WrAtZQWO.js
curl -s -o /dev/null -w "%{http_code}" http://localhost:9119/assets/index-OT1jQL5E.css
```
Both should return 200.

## Password hash generation

The password hash must be generated INSIDE the same container where the auth plugin runs (same Python environment, same salt). Cross-container hashes will NOT match.

```bash
# Generate inside the running container
HASH=$(docker exec complianceos-hermes-agent-1 python3 -c "
from plugins.dashboard_auth.basic import hash_password
print(hash_password('grc-agent'))
")
docker exec complianceos-hermes-agent-1 sh -c "hermes config set dashboard.basic_auth.password_hash '$HASH'"
```

## Known limitations

| Limitation | Detail |
|-----------|--------|
| `network_mode: host` | Does NOT work on Docker Desktop for Windows — maps to Docker VM, not Windows host. Ports become unreachable from host browser. |
| `--insecure` flag | No-op since June 2026 hardening. Does NOT disable auth on `0.0.0.0` binds. |
| iframe embed | Dashboard JS reads `parent.location` — throws SecurityError in cross-origin iframes. |
| HTTP reverse proxy | Dashboard uses WebSockets for streaming. Express can't proxy `ws://` without `ws` npm package. |

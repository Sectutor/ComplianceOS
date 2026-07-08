# api-v1.ts Router Structure

**File location**: `/app/packages/core/src/server/routers/api-v1.ts`
**Registration**: `server_entry.ts` line 231 — `app.use('/api/v1', apiV1Router)`

## Service access

The app container runs Express via `npx tsx server_entry.ts` on port 3001 (internally), mapped to `localhost:3005` on the host.

```bash
# Native desktop Hermes — direct to host port
curl -s http://localhost:3005/api/v1/health

# Inside Docker container — use Docker service name
curl -s http://app:3001/api/v1/health
```

## Existing endpoints (native, ship with code)

| Method | Path | Purpose |
|--------|------|---------|
| GET | /health | DB connection + uptime check |
| GET | /controls?framework= | List controls, optional filter |
| GET | /controls/:id | Single control with evidence count |
| GET | /risks | All risk scenarios |
| GET | /risks/:id | Single risk scenario |
| GET | /evidence?control_id=&expiring_within= | Evidence with optional filters |
| GET | /frameworks | Frameworks with pass rates |
| GET | /gaps?framework= | Controls with zero evidence |
| GET | /report?framework= | Full readiness report |
| POST | /risks | Create risk scenario |
| POST | /evidence | Create evidence record |
| POST | /treatments | Create risk treatment |

## Missing endpoints (must be added)

These do NOT ship in the native api-v1.ts and must be injected:

- **PATCH /risks/:id** — update status, owner, likelihood, impact, inherentScore, etc.
- **GET /clients** — client list
- **GET /assets** — asset list
- **GET /vendors** — vendor list
- **GET /policies** — policy list
- **GET /treatments?riskScenarioId=** — treatments for a risk

## Schema imports available

All from `../../schema`:
- `riskScenarios` — for POST/GET/PATCH risks
- `riskTreatments` — for POST/GET treatments
- `controls` — controls table
- `evidence` — evidence records
- `clients` — client list
- `assets` — asset inventory
- `vendors` — vendor list
- `clientPolicies` — policy records
- `clientControls` — control implementation status join table

## Common pitfalls

1. **Imports must use `../../schema`**, NOT `../../db` (which doesn't re-export table objects).
2. **`const db = await getDb()`** must be called inside every route handler — it's an async factory.
3. **`eq()`** is imported from `drizzle-orm` — used for `where(eq(table.field, value))`.
4. **After inserting a route**, kill tsx to reload: `docker exec complianceos-app-1 sh -c "kill \$(pgrep -f tsx)"`. Docker auto-restarts the container.
5. **Wait** ~4-6 seconds after kill for tsx to restart, then verify with `curl -s -o /dev/null -w "%{http_code}" localhost:3005/api/v1/health`.
6. **Use `docker exec -i` with heredoc** for multi-line scripts — avoid inline `-e` which breaks on Windows shell quoting.

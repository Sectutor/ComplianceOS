# GAP-LOG — Nordwind/ComplianceOS Demo

Missing functions found while building/verifying the demo. Append-only; resolve by adding ✅ FIXED with date.

## GAP-16 — No incident/exercise data seeded for Nordwind (2026-08-24)
The demo-seed pipeline never populates `incidents` or `plan_exercises` for tenant nordwind
(client 788). ISO 27001 / NIS2 both demand *demonstrated* incident capability, so the IR
module showed an empty state during prospect demos.
**Interim fix:** 3 realistic closed incidents (phishing/Rotterdam, CargoTrack API outage,
ransomware precursor/Hamburg WMS) + 1 completed tabletop exercise inserted directly via SQL.
**Proper fix:** extend `packages/core/scripts/demo-seed/` so `--tenant nordwind` seeds
incidents + exercises natively (tenant-scoped reset must wipe them too).

## GAP-17 — `plan_exercises.outcome` is varchar(50) (2026-08-24)
Exercise outcomes can't hold meaningful text ("passed-with-findings" barely fits). Detail had
to be pushed into `notes`. Consider widening to varchar(255)/text.

## GAP-18 — No REST endpoint exposes incidents under /api/v1 (2026-08-24)
`GET /api/v1/incidents` (and variants tried: incident, cyber/incidents, findings) all return
"Procedure or API endpoint not found". Incident data is DB-only. The evidence-auto-collector
and external bridges cannot read incidents via API. Add an incidents route to api-v1.
**→ FIXED 2026-08-24 (cycle 39, commit 1f510b6):** `GET /api/v1/incidents` + `/incidents/:id`
landed in packages/core/src/server/routers/api-v1.ts (api-key gated; filters clientId/status/
severity enum-validated -> 400 BAD_REQUEST; limit default 100 cap 200 + offset pagination;
{data,total}; detail route 400/404). QA reconciliation note for the parallel-session harness
(apiV1Incidents.test.ts): implemented limit cap is 200 (not the max-500 sketched in its header);
its remaining 4 failures are internal fake-drizzle walker fidelity, not route defects.

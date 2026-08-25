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
**FIXED (2026-08-25, cycle 40, commit 9ff67ac):** seed-ir-nordwind.mjs seeds 3 closed incidents
(phishing/Rotterdam, CargoTrack API outage, ransomware precursor/Hamburg WMS) + a completed
tabletop anchored to an upserted bc_plans row; wired into index.mjs for --tenant nordwind;
idempotent (skips when incidents exist) and reset-safe (all three tables carry client_id).

## GAP-17 — `plan_exercises.outcome` is varchar(50) (2026-08-24)
Exercise outcomes can't hold meaningful text ("passed-with-findings" barely fits). Detail had
to be pushed into `notes`. Consider widening to varchar(255)/text.
**FIXED (2026-08-25):** migration packages/core/drizzle/0024_widen_plan_exercise_outcome.sql
widens outcome to text; schema.ts planExercises.outcome now text.

## GAP-18 — No REST endpoint exposes incidents under /api/v1 (2026-08-24)
`GET /api/v1/incidents` (and variants tried: incident, cyber/incidents, findings) all return
"Procedure or API endpoint not found". Incident data is DB-only. The evidence-auto-collector
and external bridges cannot read incidents via API. Add an incidents route to api-v1.
**FIXED (2026-08-24, cycle 39, commit 1f510b6):** GET /api/v1/incidents + /incidents/:id on
the api-v1 router (api-key gated, enum-validated filters, pagination).

---

# Federal Workflow Implementation (2026-08-24)

## Implemented — `federal-workflows.ts` router (mounted as `federalWorkflows`)
All verified typecheck-clean (`tsc --noEmit`: zero errors in the new file; routers.ts
errors at lines 274/621/1116+ are pre-existing on HEAD, unrelated).

- **syncSarToPoam** — SAR findings (not "satisfied"/"N/A") → POA&M items with risk-mapped
  due dates (high 90d / moderate 180d / low 365d), deduped by `SAR-{id}-{control}` key
- **getSprsBreakdown** — live SPRS score from open POA&M items using DoD Assessment
  Methodology family-weighted deductions from 110; persists a "computed" snapshot
- **exportSspOscal / exportPoamOscal** — OSCAL 1.1.2-shaped JSON exports
- **getCmmcReadiness** — per-control rollup with evidence-backed penalty, SS/PB 1–5 proxy band
- **getReportingClocks** — DFARS 7012/CIRCIA 72h clocks + 90-day evidence retention dates
- **getConMonDashboard** — control posture, POA&M aging (days overdue), RMF step state,
  3-year ATO cycle tracking
- **exportPoamEmassCsv** — eMASS-template-column CSV export

## Seeded — Apex Federal tenant (789) now has real data
`phase-federal-apex.mjs` (idempotent): 21 SSP controls (~81% implemented), 7 POA&M items
under the 6 existing POA&Ms, 1 final SAR with 4 findings, 1 SPRS assessment (score 88),
10 control inheritances from an AWS GovCloud FedRAMP Moderate package, FISMA report,
RMF workflow at Step 6. `phase-federal-889.mjs`: Section 889 columns added additively to
federal_contracts + 2 seeded contracts with DFARS clause flags.

## Remaining gaps
- **GAP-19**: OSCAL is export-only; import/validation of external OSCAL files not yet built.
- **GAP-20**: CMMC readiness uses SSP controls as proxy for 800-171 practices; a proper
  practice-level register (110 rows with objectives per CMMC assessment guide) is future work.
- **GAP-21**: SPRS deduction model is family-weighted approximation, not per-practice DoD
  point values; replace when full 800-171 register exists (see GAP-20).
- **GAP-22**: No UI pages consume the new `federalWorkflows` procedures yet — backend only.
- **GAP-23**: `federal_contracts` schema.ts Drizzle definitions lack the new section_889_*
  columns (added via SQL migration in phase-federal-889.mjs); sync schema.ts before
  writing typed code against them.
**→ FIXED 2026-08-24 (cycle 39, commit 1f510b6):** `GET /api/v1/incidents` + `/incidents/:id`
landed in packages/core/src/server/routers/api-v1.ts (api-key gated; filters clientId/status/
severity enum-validated -> 400 BAD_REQUEST; limit default 100 cap 200 + offset pagination;
{data,total}; detail route 400/404). QA reconciliation note for the parallel-session harness
(apiV1Incidents.test.ts): implemented limit cap is 200 (not the max-500 sketched in its header);
its remaining 4 failures are internal fake-drizzle walker fidelity, not route defects.

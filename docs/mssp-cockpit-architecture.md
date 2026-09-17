# MSSP Cockpit Architecture

## Overview

The **MSSP Cockpit** is ComplianceOS's flagship multi-tenant differentiator. Unlike Vanta and Drata — which are designed for single-organization compliance — ComplianceOS targets **Managed Security Service Providers (MSSPs)** who manage 10–100+ client organizations from a single ComplianceOS instance.

The MSSP Cockpit provides the "look across" view: an admin-only dashboard that aggregates compliance health, risk signals, and action items across **all clients** in one interface.

## Architecture Principles

### 1. Admin-Only Feature
The MSSP Cockpit is accessible exclusively by users with `admin`, `owner`, or `super_admin` roles. Regular users see only their assigned client's data via existing `client_id` scoping.

### 2. Client Isolation (Existing)
Each client's data is already isolated by `client_id` in every core table:
- `client_controls.client_id`
- `evidence.client_id`
- `compliance_snapshots.client_id`
- `client_frameworks.client_id`
- `autopilot_runs.client_id`
- `autopilot_actions.client_id`

The MSSP Cockpit **removes** the client_id filter to aggregate across all rows, then groups results by client. No changes to the data model are required.

### 3. Leverages All Phase 1+2+3 Features Per-Client
Each client row in the cockpit grid is built from the same engines that power single-client views:

| Metric | Source |
|---|---|
| Compliance Score | Latest `compliance_snapshots` or control implementation ratio |
| Debt Score | `computeComplianceDebt()` — overdue controls, missing/expired evidence, overdue tasks, policy exceptions |
| Control Count | `client_controls` for this client |
| Implemented % | Ratio of `status = 'implemented'` controls |
| Evidence Health | Expiration date analysis on `evidence` table |
| Overdue Actions | Pending `autopilot_actions` |
| Last Autopilot Run | Most recent completed `autopilot_runs` |
| Framework Count | Distinct `client_frameworks` rows |

### 4. Common Gaps Analysis
Across all clients, the cockpit identifies which controls are most frequently **not implemented**. This is the engine's most valuable feature for an MSSP:

- Iterates every client's `client_controls` where `status = 'not_implemented'`
- Groups by control ID / control code
- Ranks by the number of clients affected
- Returns the top N most common gaps with percentage affected

**MSSP value**: If 80% of clients fail control X, the MSSP can create a shared policy template, remediation plan, or automation playbook — once — that fixes that gap for all clients simultaneously.

### 5. Revenue-at-Risk Calculation (Planned)
A future enhancement will compute **revenue at risk** for each client:

```
revenue_at_risk = client_monthly_fee × (1 - complianceScore / 100)
```

This gives MSSP leadership a direct financial view of compliance health. The `clients` table already supports a `monthlyFee` or `plan` column that can be extended.

## Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│                      MSSPCockpit Class                         │
│  packages/core/src/lib/mssp-cockpit.ts                         │
│                                                                │
│  getSummary()            → MSSPSummary                         │
│  getAllClientHealths()   → ClientHealthSummary[]                │
│  getClientHealth(id)     → ClientHealthSummary                  │
│  getCommonGaps(limit)    → CommonGap[]                         │
└──────────┬──────────────────────────────────────────┬──────────┘
           │                                          │
           ▼                                          ▼
┌─────────────────────┐              ┌──────────────────────────┐
│  tRPC Router         │              │  Hourly Cron Job         │
│  msspCockpit.ts      │              │  mssp-refresh-cron.ts    │
│                      │              │                          │
│  4 admin endpoints   │              │  Pre-warms cache by      │
│  (adminProcedure)    │              │  calling getSummary()    │
└─────────────────────┘              │  + getCommonGaps()       │
                                     └──────────────────────────┘
```

## File Map

| File | Purpose |
|---|---|
| `packages/core/src/lib/mssp-cockpit.ts` | Core aggregation engine — all logic lives here |
| `packages/core/src/server/routers/msspCockpit.ts` | tRPC router exposing 4 admin-only endpoints |
| `packages/core/src/server/cron/mssp-refresh-cron.ts` | Hourly cron to warm cache and catch issues early |

## Performance Considerations

- `getAllClientHealths()` iterates all clients and calls `getClientHealth()` per client — **O(n)** database queries. For 100 clients this is ~100 queries, which is acceptable for an admin dashboard.
- `getCommonGaps()` loads all `not_implemented` client controls in memory across all clients. For large datasets consider pagination or materialized views.
- **Redis caching** is recommended for `getSummary()` and `getCommonGaps()` results, refreshed by the hourly cron.

## Extending the Cockpit

To add a new metric to the client health row:

1. Add the field to `ClientHealthSummary` interface
2. Compute it in `getClientHealth()` method
3. Aggregate it in `getSummary()` (optional)
4. Expose via the tRPC router if needed as a separate endpoint

## Dependencies

- `compliance-debt.ts` — provides `computeComplianceDebt()`
- `schema.ts` — clients, clientControls, evidence, complianceSnapshots, clientFrameworks
- `schema_autopilot.ts` — autopilotRuns, autopilotActions
- `getDb()` from `db.ts` — database connection

# Agent Runtime — Concrete Build Plan
## "From passive bots to active sentinels" — ComplianceOS

Grounded in the existing schema (verified live):
- `autopilot_configs` (client_id, enabled, schedule: hourly|daily|weekly|manual, modules jsonb, approval_mode, last_run_at)
- `autopilot_runs` (client_id, started_at, completed_at, status, modules_executed, results jsonb, error_message, duration)
- `autopilot_actions` (run_id, client_id, type, title, description, priority, status, target_entity jsonb, ai_rationale, reviewed_by, reviewed_at) ← **the propose/act mechanism already exists**
- `notification_settings` (email_enabled, daily_digest_enabled, overdue_enabled, notify_* flags per client)
- `notification_log` + `governance_events` (delivery + audit trail already work)

---

## PHASE 1 — Heartbeat + 2 Bots  (~1 week)

### 1.1 Runtime service `src/server/runtime/agentRuntime.ts`

```ts
// Core loop (in-process, matches single-instance self-host model)
startAgentRuntime(): void          // called from server_entry.ts at boot
stopAgentRuntime(): void           // graceful shutdown

// Internal:
tick()                             // every 60s: find due configs, dispatch
runConfigForClient(config)         // executes enabled modules sequentially
catchUpMissedRuns()                // on boot: run any config where last_run_at older than schedule
```

**Scheduling semantics** (drives off `autopilot_configs.last_run_at`):
- `hourly` → due when now − last_run_at ≥ 1h
- `daily` → ≥ 24h · `weekly` → ≥ 7d · `manual` → never auto-runs

**Concurrency:** max 2 clients in parallel; per-client mutex (skip if previous run still active).
**Catch-up:** on boot, if a config missed its window while the server was down, run once immediately (prevents silent gaps).

### 1.2 Bot contract `src/server/runtime/bots/types.ts`

```ts
interface SentinelBot {
  id: string;                          // "compliance-sentinel"
  name: string;
  moduleKey: string;                   // maps to autopilot_configs.modules flag
  defaultSchedule: 'hourly'|'daily'|'weekly';

  observe(ctx: BotContext): Promise<Observation[]>;
}

interface Observation {
  severity: 'info' | 'warning' | 'critical';
  title: string;                       // human-readable headline
  rationale: string;                   // WHY the bot flagged this (mandatory, auditable)
  entityType: string;                  // 'evidence' | 'risk_treatment' | ...
  entityId?: number;
  proposedAction: {
    kind: 'create_task' | 'notify_only' | 'escalate';
    taskType?: WorkItemType;           // valid work_items.type
    priority?: 'low'|'medium'|'high'|'critical';
    dueInDays?: number;
  };
  dedupeKey: string;                   // e.g. "evidence-expiry:EV-0122" — suppresses re-alerts
}
```

### 1.3 Bot 1: Compliance Sentinel `bots/complianceSentinel.ts`
Observations (all queryable from seeded data today):
- Evidence with `expiration_date` within 30 days → warning, propose `evidence_collection` task
- Evidence expired → critical
- Control regressed implemented → in_progress/not_implemented since last run → critical (compare vs `results` of previous autopilot_run)
- Client compliance score dropped ≥5 points vs previous run → warning (score source: existing compliance summary logic)

### 1.4 Bot 2: SLA Hound `bots/slaHound.ts`
- Questionnaires overdue (`due_date < now`, status not completed) → warning→critical after +7d
- Vendor assessment requests overdue → warning
- DSAR requests within 5 days of 30-day deadline → critical (GDPR)
- Contracts entering notice period / expired (status='expired' or end_date < now+30d with auto_renew=false) → warning
- Policies past `next_review_date` → warning

### 1.5 Action pipeline `src/server/runtime/actionPipeline.ts`

For each observation:
1. **Dedupe**: skip if an `autopilot_actions` row with same dedupeKey (metadata) is open < 7 days old
2. **approval_mode routing** (field already exists!):
   - `manual` → create `autopilot_actions` row status='pending_review', notify owner
   - `auto` → execute immediately (create work_item via existing governance queue insert + notification_log entry), record action as 'executed'
3. **Notify**: respect `notification_settings` flags; write notification_log row (channel='in_app', link= deep URL to the entity)
4. **Audit**: append governance_events row (actor_name = bot name, event_type = action taken)

### 1.6 API surface (extend `routers.ts`)
```
autopilot.getConfig / updateConfig      (exist — verify they write last_run_at)
autopilot.runNow(clientId)              // manual trigger for demo button
autopilot.listActions(clientId, status) // pending review queue UI
autopilot.reviewAction(actionId, approve|reject)  // HITL approval
autopilot.runHistory(clientId)
```

### 1.7 UI
- Settings → new "Automation" tab: enable toggle, schedule select, module checkboxes, approval_mode radio, last-run status + "Run now" button
- Action inbox: reuse governance Workbench patterns — pending actions list with Approve/Reject + rationale display

### 1.8 Tests (verify-first)
- Unit: each bot's observe() against seeded fixtures (overdue Seeburger questionnaire, expiring evidence, Fortinet expired contract)
- Integration: tick() with config enabled → assert autopilot_runs row + expected autopilot_actions rows + no duplicates on second tick (dedupeKey works)
- Manual demo script documented

---

## PHASE 2 — Manager Digest + Escalation Ladder (~3 days)

### 2.1 Digest job (daily, 08:00 client-local)
Aggregate last 24h observations/actions into one email via existing email transport:
"Overnight: 3 notable events · score 72→68 · 2 treatments overdue · Seeburger questionnaire 12 days late"
Respects `daily_digest_enabled`.

### 2.2 Escalation ladder table `escalation_policy` (new, small)
```
id, client_id, bot_id, severity_threshold, ack_after_hours, escalate_to_user_id, enabled
```
Runtime check each tick: pending action unacknowledged > ack_after_hours → notify escalate_to_user_id, mark escalated.

---

## PHASE 3 — Full Roster (~1 week)

Bots 3–7 following the same contract:
| Bot | Sources |
|---|---|
| Risk Watchdog | risk_treatments due dates, residual vs risk_appetite, aging unassigned risks |
| Vulnerability Sentinel | vulnerabilities ages vs SLA, cisaKev feed router exists |
| Policy Steward | next_review_date, acknowledgment completion %, stuck-in-review |
| BC Guardian | bc_plans next_test_date, training expiry, call tree staleness |
| Anomaly Spotter (stretch) | audit_logs volume/pattern deltas |

Each gets unit tests + a fixture in the seed data.

---

## PHASE 4 — Closed-loop remediation (~later)
- Safe auto-remediations whitelist (re-run scan, refresh report, re-send questionnaire reminder)
- Full audit trail per action; undo where possible
- Confidence-gated: only auto-execute when bot confidence ≥ threshold

---

## Schema changes needed (minimal!)
- None mandatory for Phase 1 — existing tables suffice
- Add index: `autopilot_actions(metadata->>'dedupeKey')` or a dedicated `dedupe_key varchar` column + unique-ish lookup
- Phase 2 adds `escalation_policy` table only

## Risks / open decisions
1. **Multi-instance deployments**: in-process cron double-fires if you ever scale horizontally → mitigate with a simple `pg_advisory_lock` per tick
2. **Timezones** for digest delivery: store per-client IANA tz in client settings (column may need adding)
3. **Notification fatigue**: start conservative (warning threshold high, digest on) and tune

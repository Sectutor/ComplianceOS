/**
 * Sentinel Bot contract + shared types.
 * Every bot implements observe(): scan client data, return notable observations.
 * The runtime handles dedupe, approval routing, notification and audit.
 */

export type Severity = "info" | "warning" | "critical";

export type ProposedActionKind = "create_task" | "notify_only" | "escalate";

export interface ProposedAction {
  kind: ProposedActionKind;
  /** Valid work_items.type when kind === create_task */
  taskType?: string;
  priority?: "low" | "medium" | "high" | "critical";
  dueInDays?: number;
}

export interface Observation {
  severity: Severity;
  /** Human-readable headline */
  title: string;
  /** WHY the bot flagged this — mandatory, written to audit trail */
  rationale: string;
  entityType: string;
  entityId?: number;
  proposedAction: ProposedAction;
  /** Suppresses re-alerts for the same finding, e.g. "evidence-expiry:EV-0122" */
  dedupeKey: string;
  /** Safe auto-remediation identifier (Phase 4); null = none */
  autoRemediationId?: string | null;
  /** Bot confidence 0-100 in this observation (Phase 4 gating) */
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface BotContext {
  clientId: number;
  now: Date;
}

export interface SentinelBot {
  id: string;
  name: string;
  /** Key inside autopilot_configs.modules jsonb that enables this bot */
  moduleKey: string;
  defaultSchedule: "hourly" | "daily" | "weekly";
  description: string;
  observe(ctx: BotContext): Promise<Observation[]>;
  /** Optional extra check invoked by the runtime when prior-run score data is available */
  detectScoreDrop?(previousScore: number | null, currentScore: number | null): Observation | null;
}

export const SCHEDULE_MIN_HOURS: Record<string, number> = {
  hourly: 1,
  daily: 24,
  weekly: 24 * 7,
};

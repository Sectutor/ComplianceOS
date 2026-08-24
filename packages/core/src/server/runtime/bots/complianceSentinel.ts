/**
 * Bot 1: Compliance Sentinel
 * Watches evidence expiry, control regressions and compliance score drops.
 */
import { eq, and, lte, desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { evidence, clientControls, controls } from "../../../schema";
import type { SentinelBot, Observation, BotContext } from "./types";

const EXPIRY_WARNING_DAYS = 30;

export const complianceSentinel: SentinelBot = {
  id: "compliance-sentinel",
  name: "Compliance Sentinel",
  moduleKey: "complianceSentinel",
  defaultSchedule: "daily",
  description: "Watches evidence expiry, control status regressions and compliance score movement.",

  async observe(ctx: BotContext): Promise<Observation[]> {
    const db = await getDb();
    if (!db) return [];
    const out: Observation[] = [];

    // 1. Evidence expiring within 30 days / already expired
    const rows = await db
      .select({
        id: evidence.id,
        evidenceId: evidence.evidenceId,
        description: evidence.description,
        expirationDate: evidence.expirationDate,
        owner: evidence.owner,
      })
      .from(evidence)
      .where(and(eq(evidence.clientId, ctx.clientId), eq(evidence.status, "verified")));

    for (const e of rows) {
      if (!e.expirationDate) continue;
      const daysLeft = Math.floor((e.expirationDate.getTime() - ctx.now.getTime()) / 86400000);
      if (daysLeft > EXPIRY_WARNING_DAYS) continue;

      const expired = daysLeft < 0;
      out.push({
        severity: expired ? "critical" : "warning",
        title: expired
          ? `Evidence ${e.evidenceId} has EXPIRED`
          : `Evidence ${e.evidenceId} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        rationale: `Evidence "${(e.description || "").slice(0, 120)}" (owned by ${e.owner || "unassigned"}) has an expiration date of ${e.expirationDate.toISOString().slice(0, 10)} — ${expired ? `expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days remaining`}. Verified evidence past expiry invalidates the controls it supports.`,
        entityType: "evidence",
        entityId: e.id,
        proposedAction: {
          kind: expired ? "escalate" : "create_task",
          taskType: "evidence_collection",
          priority: expired ? "critical" : "high",
          dueInDays: expired ? 3 : Math.max(1, daysLeft),
        },
        dedupeKey: `evidence-expiry:${e.evidenceId}`,
        autoRemediationId: null,
        confidence: 95,
        metadata: { daysLeft, evidenceRef: e.evidenceId },
      });
    }

    // 2. Controls regressed from implemented (compare vs last run snapshot handled by runtime;
    //    here we catch the current-state anomaly: due dates passed on in-progress controls)
    const inProgress = await db
      .select({
        ccId: clientControls.id,
        controlId: controls.controlId,
        name: controls.name,
        framework: controls.framework,
        dueDate: clientControls.dueDate,
      })
      .from(clientControls)
      .innerJoin(controls, eq(controls.id, clientControls.controlId))
      .where(and(eq(clientControls.clientId, ctx.clientId), eq(clientControls.status, "in_progress")));

    for (const c of inProgress) {
      if (!c.dueDate) continue;
      const daysOverdue = Math.floor((ctx.now.getTime() - c.dueDate.getTime()) / 86400000);
      if (daysOverdue <= 0) continue;
      out.push({
        severity: daysOverdue > 30 ? "critical" : "warning",
        title: `Control ${c.controlId} implementation overdue by ${daysOverdue} days`,
        rationale: `"${c.name}" (${c.framework}) is still in_progress but its implementation due date was ${c.dueDate.toISOString().slice(0, 10)} — ${daysOverdue} days overdue. Overdue control implementations directly reduce framework readiness scores.`,
        entityType: "control",
        entityId: c.ccId,
        proposedAction: {
          kind: "create_task",
          taskType: "control_implementation",
          priority: daysOverdue > 30 ? "high" : "medium",
          dueInDays: 7,
        },
        dedupeKey: `control-overdue:${c.controlId}`,
        confidence: 90,
        metadata: { daysOverdue, framework: c.framework },
      });
    }

    return out;
  },

  /**
   * Score-drop detection needs the previous run's score. Implemented as a
   * helper invoked by the runtime with prior results injected.
   */
  detectScoreDrop(previousScore: number | null, currentScore: number | null): Observation | null {
    if (previousScore == null || currentScore == null) return null;
    const drop = previousScore - currentScore;
    if (drop < 5) return null;
    return {
      severity: drop >= 15 ? "critical" : "warning",
      title: `Compliance score dropped ${drop} points (${previousScore} → ${currentScore})`,
      rationale: `The overall compliance score decreased by ${drop} points since the last automated run (${previousScore} → ${currentScore}). Sudden drops usually indicate a regression, expired evidence being discounted, or a new gap detected.`,
      entityType: "compliance_score",
      proposedAction: { kind: "notify_only" },
      dedupeKey: `score-drop:${new Date().toISOString().slice(0, 10)}`,
      confidence: 85,
      metadata: { previousScore, currentScore, drop },
    };
  },
};

// re-export for typing convenience elsewhere
export type { SentinelBot, Observation };

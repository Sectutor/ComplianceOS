/**
 * Action pipeline — dedupe, approval routing, notification, audit, escalation.
 */
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { autopilotActions, autopilotRuns } from "../../schema_autopilot";
import { notificationLog, governanceEvents } from "../../schema";

export interface ActionResult {
  actionId: number | null;
  outcome: "executed" | "pending_review" | "deduped" | "failed";
  detail?: string;
}

/** Insert a governance_events audit row attributed to a bot. */
export async function auditEvent(
  clientId: number,
  botName: string,
  entityType: string,
  entityId: number | null,
  entityName: string,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(governanceEvents).values({
      clientId,
      entityType: mapEntityType(entityType),
      entityId: entityId ?? 0,
      entityName: entityName.slice(0, 200),
      eventType: "bot_observation",
      fromState: null,
      toState: null,
      action,
      actorUser: null,
      actorName: botName,
      metadata: JSON.stringify(metadata),
    } as any);
  } catch {
    // audit trail is best-effort; never block the pipeline
  }
}

function mapEntityType(t: string): string {
  const m: Record<string, string> = {
    evidence: "evidence", control: "control", risk_scenario: "risk",
    risk_treatment: "risk", policy: "policy", questionnaire: "vendor",
    vendor_contract: "vendor", vendor_assessment_request: "vendor",
    dsar_request: "task", vulnerability: "evidence", bc_plan: "bcp_plan",
    bc_training_record: "task", audit_log: "task", compliance_score: "task",
  };
  return m[t] || "task";
}

/** Write an in-app notification for the client owner. */
export async function notifyOwner(
  clientId: number,
  title: string,
  message: string,
  severity: string,
  link: string | null
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const [owner] = await db.execute(sql`
      SELECT user_id FROM user_clients WHERE client_id = ${clientId} LIMIT 1`).then((r: any) => r.rows ?? r);
    if (!owner?.user_id) return;
    await db.insert(notificationLog).values({
      userId: owner.user_id,
      type: severity === "critical" ? "alert" : "info",
      title: title.slice(0, 200),
      message: message.slice(0, 1000),
      sentAt: new Date(),
      channel: "in_app",
      status: "sent",
      relatedEntityType: null,
      relatedEntityId: null,
      link,
      metadata: JSON.stringify({ source: "agent-runtime", severity }),
    } as any);
  } catch {
    // best-effort
  }
}

/**
 * Process one observation through the pipeline.
 * Returns the outcome so the runtime can aggregate run results.
 */
export async function processObservation(
  clientId: number,
  runId: number,
  botId: string,
  botName: string,
  obs: import("./bots/types").Observation,
  approvalMode: string
): Promise<ActionResult> {
  const db = await getDb();
  if (!db) return { actionId: null, outcome: "failed", detail: "no db" };

  // 1. Dedupe: skip if same dedupeKey seen in an open/recent action within 7 days
  try {
    const dupes = await db.execute(sql`
      SELECT id FROM autopilot_actions
      WHERE client_id = ${clientId}
        AND metadata->>'dedupeKey' = ${obs.dedupeKey}
        AND created_at > now() - interval '7 days'
      LIMIT 1`).then((r: any) => r.rows ?? r);
    if (dupes.length > 0) {
      return { actionId: dupes[0].id, outcome: "deduped" };
    }
  } catch { /* dedupe is an optimization, not a gate */ }

  const executeDirectly = approvalMode === "auto" && obs.severity !== "critical"
    ? true
    : approvalMode === "auto" && obs.proposedAction.kind !== "escalate";

  // 2. Create the action record
  const [action] = await db.insert(autopilotActions).values({
    runId,
    clientId,
    type: `${botId}:${obs.proposedAction.kind}`,
    title: obs.title.slice(0, 250),
    description: obs.rationale.slice(0, 4000),
    priority: obs.proposedAction.priority ?? (obs.severity === "critical" ? "critical" : obs.severity === "warning" ? "high" : "medium"),
    status: executeDirectly ? "executed" : "pending_review",
    targetEntity: JSON.stringify({ entityType: obs.entityType, entityId: obs.entityId ?? null }),
    aiRationale: obs.rationale.slice(0, 4000),
    metadata: JSON.stringify({
      botId,
      dedupeKey: obs.dedupeKey,
      severity: obs.severity,
      proposedAction: obs.proposedAction,
      confidence: obs.confidence ?? 80,
      autoRemediationId: obs.autoRemediationId ?? null,
    }),
  }).returning();

  // 3. Execute or hold for review
  if (executeDirectly) {
    await executeProposedAction(clientId, obs);
  }

  // 4. Notify on warning/critical
  if (obs.severity === "warning" || obs.severity === "critical") {
    await notifyOwner(
      clientId,
      `[${obs.severity.toUpperCase()}] ${obs.title}`,
      obs.rationale,
      obs.severity,
      deepLink(obs.entityType, obs.entityId)
    );
  }

  // 5. Audit
  await auditEvent(clientId, botName, obs.entityType, obs.entityId ?? null, obs.title, executeDirectly ? "auto_executed" : "proposed", {
    severity: obs.severity,
    dedupeKey: obs.dedupeKey,
  });

  return {
    actionId: action.id,
    outcome: executeDirectly ? "executed" : "pending_review",
  };
}

/** Create a work item in the governance queue for the proposed task. */
async function executeProposedAction(
  clientId: number,
  obs: import("./bots/types").Observation
): Promise<boolean> {
  if (obs.proposedAction.kind !== "create_task") return false;
  const db = await getDb();
  if (!db) return false;

  const validTypes = new Set([
    "review", "approval", "evidence_collection", "raci_assignment", "risk_treatment",
    "vendor_assessment", "bcp_approval", "policy_review", "control_implementation",
    "risk_review", "control_assessment",
  ]);
  const taskType = validTypes.has(obs.proposedAction.taskType || "") ? obs.proposedAction.taskType! : "review";

  try {
    const dueDate = new Date(Date.now() + (obs.proposedAction.dueInDays ?? 14) * 86400000);
    await db.execute(sql`
      INSERT INTO work_items
        (client_id, type, status, priority, title, description, entity_type, due_date, is_escalated, created_at, updated_at)
      VALUES (
        ${clientId}, ${taskType}::work_item_type, 'pending'::work_item_status,
        ${(obs.proposedAction.priority || "medium")}::work_item_priority,
        ${("[Bot] " + obs.title).slice(0, 240)},
        ${("Auto-generated by sentinel bot.\n\nRATIONALE:\n" + obs.rationale).slice(0, 3900)},
        ${(mapEntityType(obs.entityType))}::governance_entity_type,
        ${dueDate}, false, now(), now()
      )`);
    return true;
  } catch (e: any) {
    console.warn(`[agent-runtime] failed to create work item: ${e.message}`);
    return false;
  }
}

function deepLink(entityType: string, entityId?: number): string | null {
  const base = "/clients"; // persistentClientId resolution happens client-side
  switch (entityType) {
    case "evidence": return `${base}/evidence`;
    case "risk_treatment":
    case "risk_scenario": return `/clients/all/risks/register`;
    case "questionnaire":
    case "vendor_contract":
    case "vendor_assessment_request": return "/clients/all/vendors/overview";
    case "dsar_request": return "/clients/all/privacy/dsar";
    case "policy": return "/clients/all/client-policies";
    case "bc_plan": return "/clients/all/business-continuity/plans";
    default: return null;
  }
}

// ------------------------------------------------------------------
// Escalation ladder (Phase 2)
// ------------------------------------------------------------------

/**
 * Escalate pending_review actions older than ackAfterHours:
 * - mark metadata.escalated = true
 * - notify owner with escalation framing
 */
export async function runEscalationSweep(clientId: number, ackAfterHours = 48): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  let escalated = 0;
  try {
    const stale = await db.execute(sql`
      SELECT id, title, ai_rationale, priority FROM autopilot_actions
      WHERE client_id = ${clientId}
        AND status = 'pending_review'
        AND coalesce(metadata->>'escalated','false') <> 'true'
        AND created_at < now() - (${ackAfterHours} || ' hours')::interval
      LIMIT 20`).then((r: any) => r.rows ?? r);

    for (const row of stale) {
      await db.execute(sql`
        UPDATE autopilot_actions
        SET metadata = jsonb_set(coalesce(metadata,'{}'::jsonb), '{escalated}', 'true')
        WHERE id = ${row.id}`);
      await notifyOwner(
        clientId,
        `[ESCALATION] Unreviewed bot action: ${row.title}`,
        `A ${row.priority}-priority finding has been awaiting human review for over ${ackAfterHours} hours without acknowledgment. Per the escalation policy this is now raised to you directly.\n\n${(row.ai_rationale || "").slice(0, 500)}`,
        "critical",
        null
      );
      escalated++;
    }
  } catch (e: any) {
    console.warn(`[agent-runtime] escalation sweep failed: ${e.message}`);
  }
  return escalated;
}

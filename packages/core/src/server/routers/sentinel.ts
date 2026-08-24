/**
 * Sentinel runtime API — extends the existing autopilot router with the
 * active-sentinel surface: sentinel run-now, action inbox, escalation status,
 * digest trigger, and runtime lifecycle.
 */
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";

const log = (...a: any[]) => console.log("[sentinel-api]", ...a);

export function createSentinelRouter(t: any, clientProcedure: any, adminProcedure: any) {
  return t.router({
    /** Run all enabled sentinel bots for a client immediately (manual/demo trigger). */
    runNow: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }: { input: { clientId: number } }) => {
        const db = await getDb();
        if (!db) throw new Error("no database");
        // ensure config row exists (default enabled/daily)
        await db.execute(sql`
          INSERT INTO autopilot_configs (client_id, enabled, schedule, modules, approval_mode)
          VALUES (${input.clientId}, true, 'daily',
            ${JSON.stringify({
              complianceSentinel: true, slaHound: true, riskWatchdog: true,
              vulnerabilitySentinel: true, policySteward: true,
              bcGuardian: true, anomalySpotter: false,
            })}::jsonb, 'manual')
          ON CONFLICT DO NOTHING`).catch(() => {});

        const { runConfigForClient } = await import("../runtime/agentRuntime");
        const cfgRows = await db.execute(sql`
          SELECT id, client_id, enabled, schedule, modules, approval_mode, last_run_at
          FROM autopilot_configs WHERE client_id = ${input.clientId} LIMIT 1`).then((r: any) => r.rows ?? r);
        if (!cfgRows.length) return { success: false, findings: 0 };

        const raw = cfgRows[0];
        const result = await runConfigForClient({
          id: raw.id,
          clientId: raw.client_id,
          enabled: true,
          schedule: raw.schedule,
          modules: typeof raw.modules === "string" ? JSON.parse(raw.modules || "{}") : (raw.modules || {}),
          approvalMode: raw.approval_mode || "manual",
          lastRunAt: null, // force full run on manual trigger
        });
        return { success: true, ...result };
      }),

    /** Action inbox: list bot actions (optionally filter by status). */
    listActions: clientProcedure
      .input(z.object({
        clientId: z.number(),
        status: z.enum(["pending", "pending_review", "executed", "rejected", "all"]).default("all"),
        limit: z.number().default(50),
      }))
      .query(async ({ input }: { input: any }) => {
        const db = await getDb();
        if (!db) return [];
        const statusVal = input.status === "pending_review" ? "pending" : input.status;
        const statusFilter = input.status === "all" ? sql`TRUE` : sql`status = ${statusVal}`;
        const rows = await db.execute(sql`
          SELECT id, type, title, description, priority, status, ai_rationale AS "aiRationale",
                 metadata, created_at AS "createdAt"
          FROM autopilot_actions
          WHERE client_id = ${input.clientId} AND ${statusFilter}
          ORDER BY created_at DESC
          LIMIT ${input.limit}`).then((r: any) => r.rows ?? r);
        return rows;
      }),

    /** Approve/reject a pending bot action. Approval executes the proposal with optional delegation. */
    reviewSentinelAction: clientProcedure
      .input(z.object({
        clientId: z.number().optional(),
        actionId: z.coerce.number(),
        decision: z.enum(["approved", "rejected"]),
        assigneeType: z.enum(["user", "employee", "agent", "unassigned"]).optional(),
        assigneeId: z.number().optional(),
        assignedAgent: z.string().optional(),
        dueInDays: z.number().optional(),
        customNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const reviewerId = ctx.user?.id ? Number(ctx.user.id) : null;

        if (input.decision === "rejected") {
          await db.execute(sql`
            UPDATE autopilot_actions SET status = 'rejected', reviewed_by = ${reviewerId}, reviewed_at = now()
            WHERE id = ${input.actionId}`);
          return { success: true, executed: false };
        }
        // approved → execute the proposed task creation with delegation
        const rows = await db.execute(sql`
          SELECT metadata, title, ai_rationale, priority FROM autopilot_actions WHERE id = ${input.actionId} LIMIT 1`).then((r: any) => r.rows ?? r);
        const actionRow = rows[0] || {};
        const meta = actionRow?.metadata ? (typeof actionRow.metadata === "string" ? JSON.parse(actionRow.metadata) : actionRow.metadata) : {};
        const pa = meta.proposedAction || {};

        const validTypes = new Set([
          "review", "approval", "evidence_collection", "raci_assignment", "risk_treatment",
          "vendor_assessment", "bcp_approval", "policy_review", "control_implementation",
          "risk_review", "control_assessment",
        ]);
        const taskType = validTypes.has(pa.taskType) ? pa.taskType : "review";
        const days = Number(input.dueInDays ?? pa.dueInDays ?? 14) || 14;
        const dueDate = new Date(Date.now() + days * 86400000);
        const dueDateIso = dueDate.toISOString();
        const title = actionRow?.title || "Bot finding";
        const rationale = actionRow?.ai_rationale || "";
        const targetClientId = Number(meta.clientId ?? input.clientId ?? 0) || 0;

        let delegationNote = "";
        if (input.assigneeType === "agent" && input.assignedAgent) {
          delegationNote = `\n\n🤖 Delegated to Autonomous Agent: ${String(input.assignedAgent).toUpperCase()}`;
        }
        if (input.customNotes) {
          delegationNote += `\n\nReviewer Instructions:\n${String(input.customNotes)}`;
        }

        const assignedUserId = input.assigneeType === "user" && input.assigneeId ? Number(input.assigneeId) : null;
        const assignedEmployeeId = input.assigneeType === "employee" && input.assigneeId ? Number(input.assigneeId) : null;

        await db.execute(sql`
          INSERT INTO work_items
            (client_id, type, status, priority, title, description, entity_type, due_date, assigned_to_user_id, assigned_to_employee_id, is_escalated, created_at, updated_at)
          VALUES (
            ${targetClientId}, ${taskType}::work_item_type, 'pending'::work_item_status,
            ${(pa.priority || actionRow.priority || "medium")}::work_item_priority,
            ${("[Bot] " + title).slice(0, 240)},
            ${("Approved by human reviewer.\n\nRATIONALE:\n" + rationale + delegationNote).slice(0, 3900)},
            'task'::governance_entity_type,
            ${dueDateIso}::timestamptz, ${assignedUserId}, ${assignedEmployeeId}, false, now(), now())`);

        await db.execute(sql`
          UPDATE autopilot_actions SET status = 'executed', reviewed_by = ${reviewerId}, reviewed_at = now()
          WHERE id = ${input.actionId}`);
        return { success: true, executed: true };
      }),

    /** Escalation sweep — manually trigger or check counts. */
    escalationSweep: clientProcedure
      .input(z.object({ clientId: z.number(), ackAfterHours: z.number().default(48) }))
      .mutation(async ({ input }: { input: any }) => {
        const { runEscalationSweep } = await import("../runtime/actionPipeline");
        const escalated = await runEscalationSweep(input.clientId, input.ackAfterHours);
        return { success: true, escalated };
      }),

    /** Send the daily digest now (demo/testing). */
    sendDigestNow: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }: { input: any }) => {
        const { maybeSendDailyDigest } = await import("../runtime/agentRuntime");
        await maybeSendDailyDigest([input.clientId], true);
        return { success: true };
      }),

    /** Runtime lifecycle (admin). */
    startRuntime: adminProcedure.mutation(async () => {
      const { startAgentRuntime } = await import("../runtime/agentRuntime");
      startAgentRuntime();
      return { started: true };
    }),
    stopRuntime: adminProcedure.mutation(async () => {
      const { stopAgentRuntime } = await import("../runtime/agentRuntime");
      stopAgentRuntime();
      return { started: false };
    }),
    runtimeStatus: adminProcedure.query(async () => {
      const { isRuntimeRunning } = await import("../runtime/agentRuntime");
      return { running: isRuntimeRunning() };
    }),
  });
}

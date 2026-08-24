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
        status: z.enum(["pending_review", "executed", "rejected", "all"]).default("all"),
        limit: z.number().default(50),
      }))
      .query(async ({ input }: { input: any }) => {
        const db = await getDb();
        if (!db) return [];
        const statusFilter = input.status === "all" ? sql`TRUE` : sql`status = ${input.status}`;
        const rows = await db.execute(sql`
          SELECT id, type, title, description, priority, status, ai_rationale AS "aiRationale",
                 metadata, created_at AS "createdAt"
          FROM autopilot_actions
          WHERE client_id = ${input.clientId} AND ${statusFilter}
          ORDER BY created_at DESC
          LIMIT ${input.limit}`).then((r: any) => r.rows ?? r);
        return rows;
      }),

    /** Approve/reject a pending bot action. Approval executes the proposal. */
    reviewSentinelAction: clientProcedure
      .input(z.object({
        clientId: z.number().optional(),
        actionId: z.coerce.number(),
        decision: z.enum(["approved", "rejected"]),
      }))
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const db = await getDb();
        if (!db) return { success: false };
        if (input.decision === "rejected") {
          await db.execute(sql`
            UPDATE autopilot_actions SET status = 'rejected', reviewed_by = ${ctx.user?.id ?? 0}, reviewed_at = now()
            WHERE id = ${input.actionId}`);
          return { success: true, executed: false };
        }
        // approved → execute the proposed task creation
        const rows = await db.execute(sql`
          SELECT metadata FROM autopilot_actions WHERE id = ${input.actionId} LIMIT 1`).then((r: any) => r.rows ?? r);
        const meta = rows[0]?.metadata ? (typeof rows[0].metadata === "string" ? JSON.parse(rows[0].metadata) : rows[0].metadata) : {};
        const pa = meta.proposedAction || {};

        if (pa.kind === "create_task") {
          const validTypes = new Set([
            "review", "approval", "evidence_collection", "raci_assignment", "risk_treatment",
            "vendor_assessment", "bcp_approval", "policy_review", "control_implementation",
            "risk_review", "control_assessment",
          ]);
          const taskType = validTypes.has(pa.taskType) ? pa.taskType : "review";
          const dueDate = new Date(Date.now() + (pa.dueInDays ?? 14) * 86400000);
          const titleRow = await db.execute(sql`
            SELECT title, ai_rationale FROM autopilot_actions WHERE id = ${input.actionId} LIMIT 1`).then((r: any) => r.rows ?? r);
          const title = titleRow[0]?.title || "Bot finding";
          const rationale = titleRow[0]?.ai_rationale || "";
          await db.execute(sql`
            INSERT INTO work_items
              (client_id, type, status, priority, title, description, entity_type, due_date, is_escalated, created_at, updated_at)
            VALUES (
              ${meta.clientId ?? input.clientId ?? 0}, ${taskType}::work_item_type, 'pending'::work_item_status,
              ${(pa.priority || "medium")}::work_item_priority,
              ${("[Bot] " + title).slice(0, 240)},
              ${("Approved by human reviewer.\n\nRATIONALE:\n" + rationale).slice(0, 3900)},
              'task'::governance_entity_type,
              ${dueDate}, false, now(), now())`);
        }

        await db.execute(sql`
          UPDATE autopilot_actions SET status = 'executed', reviewed_by = ${ctx.user?.id ?? 0}, reviewed_at = now()
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

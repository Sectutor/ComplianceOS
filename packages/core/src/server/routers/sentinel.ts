/**
 * Sentinel runtime API — extends the existing autopilot router with the
 * active-sentinel surface: sentinel run-now, action inbox, escalation status,
 * digest trigger, and runtime lifecycle.
 */
import { z } from "zod";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
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
                 metadata, target_entity AS "targetEntity", created_at AS "createdAt"
          FROM autopilot_actions
          WHERE client_id = ${input.clientId} AND ${statusFilter}
          ORDER BY created_at DESC
          LIMIT ${input.limit}`).then((r: any) => r.rows ?? r);
        return rows;
      }),

    /** Get enriched detail for a specific action item, including full underlying plan/policy/risk document */
    getActionDetail: clientProcedure
      .input(z.object({
        clientId: z.number(),
        actionId: z.coerce.number(),
      }))
      .query(async ({ input }: { input: { clientId: number; actionId: number } }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const rows = await db.execute(sql`
          SELECT id, type, title, description, priority, status, ai_rationale AS "aiRationale",
                 metadata, target_entity AS "targetEntity", created_at AS "createdAt"
          FROM autopilot_actions
          WHERE id = ${input.actionId} AND client_id = ${input.clientId}
          LIMIT 1`).then((r: any) => r.rows ?? r);

        if (!rows.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });
        }

        const action = rows[0];
        let meta = action.metadata;
        if (typeof meta === "string") {
          try {
            meta = JSON.parse(meta);
            if (typeof meta === "string") meta = JSON.parse(meta);
          } catch { meta = {}; }
        } else if (!meta) {
          meta = {};
        }

        let target = action.targetEntity;
        if (typeof target === "string") {
          try {
            target = JSON.parse(target);
            if (typeof target === "string") target = JSON.parse(target);
          } catch { target = null; }
        }

        // Entity type & ID resolution
        let entityType = target?.entityType;
        let entityId = target?.entityId;

        // Fallback to parsing dedupeKey or type if targetEntity wasn't populated
        if (!entityType || !entityId) {
          const dedupeKey = meta.dedupeKey || "";
          if (dedupeKey.startsWith("bc-test-overdue:") || action.type?.includes("bc-guardian")) {
            entityType = "bc_plan";
            const match = dedupeKey.match(/bc-test-overdue:(\d+)/);
            if (match) entityId = Number(match[1]);
          } else if (dedupeKey.startsWith("policy-") || action.type?.includes("policy-steward")) {
            entityType = "policy";
            const match = dedupeKey.match(/policy-[^:]+:(\d+)/);
            if (match) entityId = Number(match[1]);
          } else if (dedupeKey.startsWith("treatment-overdue:")) {
            entityType = "risk_treatment";
            const match = dedupeKey.match(/treatment-overdue:(\d+)/);
            if (match) entityId = Number(match[1]);
          } else if (dedupeKey.startsWith("appetite-breach:")) {
            entityType = "risk_scenario";
            const match = dedupeKey.match(/appetite-breach:(\d+)/);
            if (match) entityId = Number(match[1]);
          } else if (dedupeKey.startsWith("vuln-sla:")) {
            entityType = "vulnerability";
            const match = dedupeKey.match(/vuln-sla:([^:]+)/);
            if (match && !isNaN(Number(match[1]))) entityId = Number(match[1]);
          }
        }

        let entityDetails: any = null;

        if (entityType === "bc_plan" && entityId) {
          const planRows = await db.execute(sql`
            SELECT id, client_id, title, version, status, owner_id, last_tested_date, next_test_date, content, created_at, updated_at
            FROM bc_plans
            WHERE id = ${entityId}
            LIMIT 1`).then((r: any) => r.rows ?? r);

          if (planRows.length > 0) {
            const plan = planRows[0];
            const strategies = await db.execute(sql`
              SELECT id, strategy_type, description, priority, rto_target, rpo_target
              FROM bc_plan_strategies
              WHERE plan_id = ${entityId}`).then((r: any) => r.rows ?? r).catch(() => []);

            const scenarios = await db.execute(sql`
              SELECT id, scenario_type, description, likelihood, impact
              FROM bc_plan_scenarios
              WHERE plan_id = ${entityId}`).then((r: any) => r.rows ?? r).catch(() => []);

            entityDetails = {
              type: "bc_plan",
              id: plan.id,
              title: plan.title,
              version: plan.version || "1.0",
              status: plan.status || "draft",
              content: plan.content || "Standard operating procedures for disaster recovery.",
              lastTestedDate: plan.last_tested_date,
              nextTestDate: plan.next_test_date,
              strategies,
              scenarios,
              deepLink: `/clients/${input.clientId}/business-continuity/plans/${plan.id}`,
            };
          }
        } else if (entityType === "policy" && entityId) {
          const polRows = await db.execute(sql`
            SELECT id, client_id, name, content, version, status, next_review_date, updated_at
            FROM client_policies
            WHERE id = ${entityId}
            LIMIT 1`).then((r: any) => r.rows ?? r);

          if (polRows.length > 0) {
            const pol = polRows[0];
            entityDetails = {
              type: "policy",
              id: pol.id,
              title: pol.name,
              version: pol.version || "1.0",
              status: pol.status || "draft",
              content: pol.content || "No policy content recorded.",
              nextReviewDate: pol.next_review_date,
              updatedAt: pol.updated_at,
              deepLink: `/clients/${input.clientId}/policies/${pol.id}`,
            };
          }
        } else if ((entityType === "risk_scenario" || entityType === "risk_assessment") && entityId) {
          const riskRows = await db.execute(sql`
            SELECT id, title, description, residual_score, residual_risk, owner
            FROM risk_scenarios
            WHERE id = ${entityId}
            LIMIT 1`).then((r: any) => r.rows ?? r);

          if (riskRows.length > 0) {
            const r = riskRows[0];
            entityDetails = {
              type: "risk_scenario",
              id: r.id,
              title: r.title,
              description: r.description || "No description provided.",
              residualScore: r.residual_score,
              residualRisk: r.residual_risk,
              owner: r.owner,
              deepLink: `/clients/${input.clientId}/risk-assessment`,
            };
          }
        } else if (entityType === "vulnerability" && entityId) {
          const vulnRows = await db.execute(sql`
            SELECT id, vulnerability_id, cve_id, name, description, severity, status, cvss_score, discovery_date
            FROM vulnerabilities
            WHERE id = ${entityId}
            LIMIT 1`).then((r: any) => r.rows ?? r);

          if (vulnRows.length > 0) {
            const v = vulnRows[0];
            entityDetails = {
              type: "vulnerability",
              id: v.id,
              title: `${v.cve_id || v.vulnerability_id || "Vulnerability"}: ${v.name || "Identified Issue"}`,
              description: v.description || "No CVE description recorded.",
              severity: v.severity,
              cvssScore: v.cvss_score ? (v.cvss_score / 10).toFixed(1) : "N/A",
              status: v.status,
              discoveryDate: v.discovery_date,
              deepLink: `/clients/${input.clientId}/vulnerabilities`,
            };
          }
        }

        return {
          action: {
            ...action,
            metadata: meta,
            targetEntity: target,
          },
          entity: entityDetails,
        };
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

        // Fetch the action row FIRST for both decisions: unknown ids must fail loudly
        // instead of fabricating an empty row and marking a ghost action executed.
        const rows = await db.execute(sql`
          SELECT metadata, title, ai_rationale, priority FROM autopilot_actions WHERE id = ${input.actionId} LIMIT 1`).then((r: any) => r.rows ?? r);
        if (!rows.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sentinel action not found" });
        }
        const actionRow = rows[0];

        if (input.decision === "rejected") {
          await db.execute(sql`
            UPDATE autopilot_actions SET status = 'rejected', reviewed_by = ${reviewerId}, reviewed_at = now()
            WHERE id = ${input.actionId}`);
          return { success: true, executed: false };
        }
        // approved → execute the proposed task creation with delegation
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
        const targetClientId = Number(meta.clientId ?? input.clientId);
        if (!Number.isInteger(targetClientId) || targetClientId <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot execute sentinel action ${input.actionId}: no resolvable clientId. A valid clientId (from action metadata or the request) is required to execute this action.`,
          });
        }

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

    /** Get proactive summary stats for top-bar badge and Action Center overview */
    getStats: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: { input: { clientId: number } }) => {
        const db = await getDb();
        if (!db) return { totalPending: 0, criticalCount: 0, warningCount: 0, executedCount: 0, rejectedCount: 0, cadence: "daily", lastRunAt: null };

        const [counts] = await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') AS "totalPending",
            COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'critical') AS "criticalCount",
            COUNT(*) FILTER (WHERE status = 'pending' AND (priority = 'high' OR priority = 'medium')) AS "warningCount",
            COUNT(*) FILTER (WHERE status = 'executed') AS "executedCount",
            COUNT(*) FILTER (WHERE status = 'rejected') AS "rejectedCount"
          FROM autopilot_actions
          WHERE client_id = ${input.clientId}`).then((r: any) => r.rows ?? r);

        const [cfg] = await db.execute(sql`
          SELECT schedule, last_run_at AS "lastRunAt"
          FROM autopilot_configs
          WHERE client_id = ${input.clientId} LIMIT 1`).then((r: any) => r.rows ?? r);

        return {
          totalPending: parseInt(counts?.totalPending || "0", 10),
          criticalCount: parseInt(counts?.criticalCount || "0", 10),
          warningCount: parseInt(counts?.warningCount || "0", 10),
          executedCount: parseInt(counts?.executedCount || "0", 10),
          rejectedCount: parseInt(counts?.rejectedCount || "0", 10),
          cadence: cfg?.schedule || "daily",
          lastRunAt: cfg?.lastRunAt || null,
        };
      }),

    /** Update sentinel scan cadence for a client */
    updateCadence: clientProcedure
      .input(z.object({
        clientId: z.number(),
        schedule: z.string(),
      }))
      .mutation(async ({ input }: { input: { clientId: number; schedule: string } }) => {
        const db = await getDb();
        if (!db) throw new Error("no database");

        await db.execute(sql`
          INSERT INTO autopilot_configs (client_id, enabled, schedule, modules, approval_mode)
          VALUES (${input.clientId}, true, ${input.schedule},
            ${JSON.stringify({
              complianceSentinel: true, slaHound: true, riskWatchdog: true,
              vulnerabilitySentinel: true, policySteward: true,
              bcGuardian: true, anomalySpotter: false,
            })}::jsonb, 'manual')
          ON CONFLICT (client_id) DO UPDATE
          SET schedule = ${input.schedule}, updated_at = now()`);

        return { success: true, schedule: input.schedule };
      }),

    /** Batch approve or reject actions */
    batchReviewActions: clientProcedure
      .input(z.object({
        clientId: z.number(),
        actionIds: z.array(z.number()),
        decision: z.enum(["approved", "rejected"]),
      }))
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const db = await getDb();
        if (!db) return { success: false, processed: 0 };
        const reviewerId = ctx.user?.id ? Number(ctx.user.id) : null;

        if (input.actionIds.length === 0) return { success: true, processed: 0 };

        const status = input.decision === "approved" ? "executed" : "rejected";
        await db.execute(sql`
          UPDATE autopilot_actions 
          SET status = ${status}, reviewed_by = ${reviewerId}, reviewed_at = now()
          WHERE client_id = ${input.clientId} AND id = ANY(${input.actionIds})`);

        return { success: true, processed: input.actionIds.length };
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

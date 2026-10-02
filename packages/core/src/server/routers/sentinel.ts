/**
 * Sentinel runtime API — extends the existing autopilot router with the
 * active-sentinel surface: sentinel run-now, action inbox, escalation status,
 * digest trigger, and runtime lifecycle.
 */
import { z } from "zod";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { applyApprovedFix, getProposedFix } from "../../lib/action-center-agent";

const log = (...a: any[]) => console.log("[sentinel-api]", ...a);

async function logActionHistory(db: any, params: {
  actionId: number;
  clientId: number;
  actorType: 'user' | 'agent' | 'system';
  actorId?: string | number | null;
  actorName?: string | null;
  actionType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  patchPayload?: any;
}) {
  try {
    await db.execute(sql`
      INSERT INTO autopilot_action_history 
        (action_id, client_id, actor_type, actor_id, actor_name, action_type, previous_status, new_status, notes, patch_payload, created_at)
      VALUES (
        ${params.actionId}, ${params.clientId}, ${params.actorType}, 
        ${params.actorId ? String(params.actorId) : null}, 
        ${params.actorName || null}, 
        ${params.actionType}, 
        ${params.previousStatus || null}, 
        ${params.newStatus || null}, 
        ${params.notes || null}, 
        ${params.patchPayload ? JSON.stringify(params.patchPayload) : null}::jsonb, 
        now()
      )`);
  } catch (err) {
    console.warn("[logActionHistory] Failed to write history:", err);
  }
}

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
        status: z.enum([
          "pending", "pending_review", "delegated_human", "delegated_agent",
          "awaiting_human_review", "escalated", "risk_accepted", "executed", "rejected", "all"
        ]).default("all"),
        limit: z.number().default(50),
      }))
      .query(async ({ input }: { input: any }) => {
        const db = await getDb();
        if (!db) return [];
        const statusVal = input.status === "pending_review" ? "pending" : input.status;
        const statusFilter = input.status === "all" ? sql`TRUE` : sql`status = ${statusVal}`;
        const rows = await db.execute(sql`
          SELECT id, type, title, description, priority, status, ai_rationale AS "aiRationale",
                 metadata, target_entity AS "targetEntity", created_at AS "createdAt",
                 assigned_to_user_id AS "assignedToUserId",
                 assigned_to_employee_id AS "assignedToEmployeeId",
                 assigned_agent AS "assignedAgent",
                 reviewer_user_id AS "reviewerUserId",
                 delegated_by_user_id AS "delegatedByUserId",
                 escalation_level AS "escalationLevel",
                 escalated_to_role AS "escalatedToRole",
                 escalated_to_name AS "escalatedToName",
                 escalated_at AS "escalatedAt",
                 escalation_reason AS "escalationReason",
                 due_at AS "dueAt",
                 risk_accepted_until AS "riskAcceptedUntil",
                 risk_acceptance_rationale AS "riskAcceptanceRationale",
                 compensating_controls AS "compensatingControls",
                 incident_id AS "incidentId"
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
                 metadata, target_entity AS "targetEntity", created_at AS "createdAt",
                 assigned_to_user_id AS "assignedToUserId",
                 assigned_to_employee_id AS "assignedToEmployeeId",
                 assigned_agent AS "assignedAgent",
                 reviewer_user_id AS "reviewerUserId",
                 delegated_by_user_id AS "delegatedByUserId",
                 escalation_level AS "escalationLevel",
                 escalated_to_role AS "escalatedToRole",
                 escalated_to_name AS "escalatedToName",
                 escalated_at AS "escalatedAt",
                 escalation_reason AS "escalationReason",
                 due_at AS "dueAt",
                 risk_accepted_until AS "riskAcceptedUntil",
                 risk_acceptance_rationale AS "riskAcceptanceRationale",
                 compensating_controls AS "compensatingControls",
                 incident_id AS "incidentId"
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
        resolutionName: z.string().optional(),
        resolutionMode: z.enum(["direct_patch", "create_task", "compliance_signoff"]).optional(),
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
        const reviewerName = ctx.user?.name || ctx.user?.email || "Reviewer";

        // Fetch the action row FIRST for both decisions: unknown ids must fail loudly
        // instead of fabricating an empty row and marking a ghost action executed.
        const rows = await db.execute(sql`
          SELECT metadata, title, ai_rationale, priority, status FROM autopilot_actions WHERE id = ${input.actionId} LIMIT 1`).then((r: any) => r.rows ?? r);
        if (!rows.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sentinel action not found" });
        }
        const actionRow = rows[0];

        if (input.decision === "rejected") {
          await db.execute(sql`
            UPDATE autopilot_actions SET status = 'rejected', reviewed_by = ${reviewerId}, reviewed_at = now()
            WHERE id = ${input.actionId}`);

          await logActionHistory(db, {
            actionId: input.actionId,
            clientId: Number(input.clientId ?? 0),
            actorType: 'user',
            actorId: reviewerId,
            actorName: reviewerName,
            actionType: 'rejected',
            previousStatus: actionRow.status,
            newStatus: 'rejected',
            notes: input.customNotes || 'Action dismissed by reviewer',
          });

          return { success: true, executed: false };
        }

        // approved → execute the proposed task creation, patch application, or compliance sign-off
        const meta = actionRow?.metadata ? (typeof actionRow.metadata === "string" ? JSON.parse(actionRow.metadata) : actionRow.metadata) : {};
        const pa = meta.proposedAction || {};
        const proposedFix = meta.proposedFix || null;
        const effectiveTitle = (input.resolutionName || actionRow?.title || "Remediation Task").trim();

        // 1. Direct Entity Patch path (if user chose direct_patch or concrete fix exists and not overridden to create_task)
        if (input.resolutionMode !== "create_task" && input.resolutionMode !== "compliance_signoff" && proposedFix && typeof proposedFix === "object" && Object.keys(proposedFix).length > 0) {
          const fix = proposedFix as Record<string, unknown>;
          if (!fix.entityType && meta.targetEntity) fix.entityType = (meta.targetEntity as any)?.entityType;
          if (!fix.entityId && meta.targetEntity) fix.entityId = (meta.targetEntity as any)?.entityId;

          const fixClientId = Number(meta.clientId ?? input.clientId);
          if (!Number.isInteger(fixClientId) || fixClientId <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot apply agent fix for action ${input.actionId}: no resolvable clientId.`,
            });
          }

          const result = await applyApprovedFix(fixClientId, input.actionId, fix);
          log(`[reviewSentinelAction] action ${input.actionId} agent-fix applied: ${result.applied} (ok=${result.success})`);

          await db.execute(sql`
            UPDATE autopilot_actions
            SET status = ${result.success ? 'executed' : 'failed'},
                reviewed_by = ${reviewerId},
                reviewed_at = now(),
                metadata = jsonb_set(coalesce(metadata,'{}'::jsonb), '{fixResult}', ${JSON.stringify({ ...result, resolutionName: effectiveTitle })}::jsonb)
            WHERE id = ${input.actionId}`);

          await logActionHistory(db, {
            actionId: input.actionId,
            clientId: fixClientId,
            actorType: 'user',
            actorId: reviewerId,
            actorName: reviewerName,
            actionType: 'approved_fix',
            previousStatus: actionRow.status,
            newStatus: result.success ? 'executed' : 'failed',
            notes: `Applied as "${effectiveTitle}". ${input.customNotes || (result.success ? `Fix applied to ${result.applied}.` : `Fix failed: ${result.error}`)}`,
            patchPayload: fix,
          });

          return {
            success: result.success,
            executed: result.success,
            applied: result.applied,
            resolutionName: effectiveTitle,
            destination: `Updated ${result.applied}`,
            detail: result.success
              ? `Remediation applied to ${result.applied} as "${effectiveTitle}".`
              : `Fix failed: ${result.error}`,
          };
        }

        // 2. Pure Compliance Sign-Off path (marked resolved without generating an open task)
        if (input.resolutionMode === "compliance_signoff") {
          const targetClientId = Number(meta.clientId ?? input.clientId);
          await db.execute(sql`
            UPDATE autopilot_actions SET status = 'executed', reviewed_by = ${reviewerId}, reviewed_at = now()
            WHERE id = ${input.actionId}`);

          await logActionHistory(db, {
            actionId: input.actionId,
            clientId: targetClientId,
            actorType: 'user',
            actorId: reviewerId,
            actorName: reviewerName,
            actionType: 'compliance_signoff',
            previousStatus: actionRow.status,
            newStatus: 'executed',
            notes: `Remediation signed off as "${effectiveTitle}". Notes: ${input.customNotes || 'Attested by compliance reviewer.'}`,
          });

          return {
            success: true,
            executed: true,
            resolutionName: effectiveTitle,
            destination: "Archived in Remediated Findings & Compliance Audit Trail",
            detail: `Finding signed off as "${effectiveTitle}".`,
          };
        }

        // 3. Governance Work Item Creation path (default)
        const validTypes = new Set([
          "review", "approval", "evidence_collection", "raci_assignment", "risk_treatment",
          "vendor_assessment", "bcp_approval", "policy_review", "control_implementation",
          "risk_review", "control_assessment",
        ]);
        const taskType = validTypes.has(pa.taskType) ? pa.taskType : "review";
        const days = Number(input.dueInDays ?? pa.dueInDays ?? 14) || 14;
        const dueDate = new Date(Date.now() + days * 86400000);
        const dueDateIso = dueDate.toISOString();
        const rationale = actionRow?.ai_rationale || "";
        const targetClientId = Number(meta.clientId ?? input.clientId);
        if (!Number.isInteger(targetClientId) || targetClientId <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot execute sentinel action ${input.actionId}: no resolvable clientId. A valid clientId is required.`,
          });
        }

        let delegationNote = "";
        if (input.assigneeType === "agent" && input.assignedAgent) {
          delegationNote = `\n\n🤖 Delegated to Autonomous Agent: ${String(input.assignedAgent).toUpperCase()}`;
        }
        if (input.customNotes) {
          delegationNote += `\n\nReviewer Implementation Notes:\n${String(input.customNotes)}`;
        }

        const assignedUserId = input.assigneeType === "user" && input.assigneeId ? Number(input.assigneeId) : null;
        const assignedEmployeeId = input.assigneeType === "employee" && input.assigneeId ? Number(input.assigneeId) : null;

        const [newWorkItem] = await db.execute(sql`
          INSERT INTO work_items
            (client_id, type, status, priority, title, description, entity_type, due_date, assigned_to_user_id, assigned_to_employee_id, is_escalated, created_at, updated_at)
          VALUES (
            ${targetClientId}, ${taskType}::work_item_type, 'pending'::work_item_status,
            ${(pa.priority || actionRow.priority || "medium")}::work_item_priority,
            ${effectiveTitle.slice(0, 240)},
            ${("Approved by human reviewer.\n\nFINDING RATIONALE:\n" + rationale + delegationNote).slice(0, 3900)},
            'task'::governance_entity_type,
            ${dueDateIso}::timestamptz, ${assignedUserId}, ${assignedEmployeeId}, false, now(), now())
          RETURNING id`).then((r: any) => r.rows ?? r);

        await db.execute(sql`
          UPDATE autopilot_actions SET status = 'executed', reviewed_by = ${reviewerId}, reviewed_at = now()
          WHERE id = ${input.actionId}`);

        await logActionHistory(db, {
          actionId: input.actionId,
          clientId: targetClientId,
          actorType: 'user',
          actorId: reviewerId,
          actorName: reviewerName,
          actionType: 'approved_task',
          previousStatus: actionRow.status,
          newStatus: 'executed',
          notes: `Created Work Item #${newWorkItem?.id || ''}: "${effectiveTitle}". ${input.customNotes || ''}`.trim(),
        });

        return {
          success: true,
          executed: true,
          resolutionName: effectiveTitle,
          workItemId: newWorkItem?.id || null,
          destination: `Work Items Inbox (Task #${newWorkItem?.id || ''})`,
          detail: `Created task "${effectiveTitle}" in Work Items backlog.`,
        };
      }),

    /** Delegate finding: to Human team member (creates work item with RACI) or Autonomous Agent (with mandatory HITL reviewer) */
    delegateAction: clientProcedure
      .input(z.object({
        clientId: z.number(),
        actionId: z.coerce.number(),
        delegationType: z.enum(["human", "agent"]),
        // Human delegation
        assigneeType: z.enum(["user", "employee", "unassigned"]).optional(),
        assigneeId: z.number().optional(),
        assigneeName: z.string().optional(),
        raciRole: z.enum(["responsible", "accountable", "consulted", "informed"]).default("responsible"),
        dueInDays: z.number().default(14),
        customNotes: z.string().optional(),
        // Agent delegation
        assignedAgent: z.string().optional(),
        reviewerUserId: z.number().optional(),
        reviewerName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const actorId = ctx.user?.id ? Number(ctx.user.id) : null;
        const actorName = ctx.user?.name || ctx.user?.email || "Reviewer";

        const [actionRow] = await db.execute(sql`
          SELECT id, title, description, priority, status, metadata, ai_rationale
          FROM autopilot_actions
          WHERE id = ${input.actionId} AND client_id = ${input.clientId}
          LIMIT 1`).then((r: any) => r.rows ?? r);

        if (!actionRow) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sentinel action not found" });
        }

        const days = Number(input.dueInDays || 14);
        const dueDate = new Date(Date.now() + days * 86400000);
        const dueDateIso = dueDate.toISOString();

        if (input.delegationType === "human") {
          const assignedUserId = input.assigneeType === "user" && input.assigneeId ? Number(input.assigneeId) : null;
          const assignedEmployeeId = input.assigneeType === "employee" && input.assigneeId ? Number(input.assigneeId) : null;

          await db.execute(sql`
            UPDATE autopilot_actions
            SET status = 'delegated_human',
                assigned_to_user_id = ${assignedUserId},
                assigned_to_employee_id = ${assignedEmployeeId},
                delegated_by_user_id = ${actorId},
                due_at = ${dueDateIso}::timestamptz
            WHERE id = ${input.actionId}`);

          // Also create formal task in work_items
          const noteText = input.customNotes ? `\n\nInstructions: ${input.customNotes}` : "";
          await db.execute(sql`
            INSERT INTO work_items
              (client_id, type, status, priority, title, description, entity_type, due_date, assigned_to_user_id, assigned_to_employee_id, assigned_role, created_at, updated_at)
            VALUES (
              ${input.clientId}, 'review'::work_item_type, 'pending'::work_item_status,
              ${(actionRow.priority || "medium")}::work_item_priority,
              ${actionRow.title.slice(0, 240)},
              ${("Delegated to team member.\n\nFINDING RATIONALE:\n" + (actionRow.ai_rationale || actionRow.description || "") + noteText).slice(0, 3900)},
              'task'::governance_entity_type,
              ${dueDateIso}::timestamptz, ${assignedUserId}, ${assignedEmployeeId}, ${input.raciRole}, now(), now())`).catch((err: any) => {
                log(`[delegateAction] work_items insert warning:`, err);
              });

          await logActionHistory(db, {
            actionId: input.actionId,
            clientId: input.clientId,
            actorType: 'user',
            actorId,
            actorName,
            actionType: 'delegated_human',
            previousStatus: actionRow.status,
            newStatus: 'delegated_human',
            notes: `Delegated to ${input.assigneeName || 'team member'} (Role: ${input.raciRole}, Due: in ${days} days). ${input.customNotes || ''}`.trim(),
          });

          return { success: true, status: 'delegated_human', target: input.assigneeName };
        } else {
          // Agent delegation with HITL gate
          const meta = typeof actionRow.metadata === "string" ? JSON.parse(actionRow.metadata || "{}") : (actionRow.metadata || {});
          // If the bot already has a patch or suggested addition, it moves directly to awaiting human review
          const hasStagedPatch = meta.suggestedAddition || meta.proposedFix;
          const nextStatus = hasStagedPatch ? 'awaiting_human_review' : 'delegated_agent';

          await db.execute(sql`
            UPDATE autopilot_actions
            SET status = ${nextStatus},
                assigned_agent = ${input.assignedAgent || 'sla_agent'},
                reviewer_user_id = ${input.reviewerUserId || actorId},
                delegated_by_user_id = ${actorId},
                due_at = ${dueDateIso}::timestamptz
            WHERE id = ${input.actionId}`);

          await logActionHistory(db, {
            actionId: input.actionId,
            clientId: input.clientId,
            actorType: 'user',
            actorId,
            actorName,
            actionType: 'delegated_agent',
            previousStatus: actionRow.status,
            newStatus: nextStatus,
            notes: `Delegated to autonomous agent [${input.assignedAgent}] with HITL Reviewer: ${input.reviewerName || actorName}. ${input.customNotes || ''}`.trim(),
          });

          return { success: true, status: nextStatus, agent: input.assignedAgent };
        }
      }),

    /** Escalate action to higher hierarchy tier (e.g. DPO or CISO) with mandatory justification */
    escalateAction: clientProcedure
      .input(z.object({
        clientId: z.number(),
        actionId: z.coerce.number(),
        targetTier: z.number().min(1).max(4),
        targetRole: z.string(),
        targetName: z.string(),
        reason: z.string().min(3),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const actorId = ctx.user?.id ? Number(ctx.user.id) : null;
        const actorName = ctx.user?.name || ctx.user?.email || "User";

        const [actionRow] = await db.execute(sql`
          SELECT id, title, status, priority FROM autopilot_actions
          WHERE id = ${input.actionId} AND client_id = ${input.clientId} LIMIT 1`).then((r: any) => r.rows ?? r);

        if (!actionRow) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });

        const newPriority = input.priority || actionRow.priority || "high";

        await db.execute(sql`
          UPDATE autopilot_actions
          SET status = 'escalated',
              priority = ${newPriority},
              escalation_level = ${input.targetTier},
              escalated_to_role = ${input.targetRole},
              escalated_to_name = ${input.targetName},
              escalated_at = now(),
              escalation_reason = ${input.reason}
          WHERE id = ${input.actionId}`);

        await logActionHistory(db, {
          actionId: input.actionId,
          clientId: input.clientId,
          actorType: 'user',
          actorId,
          actorName,
          actionType: 'escalated',
          previousStatus: actionRow.status,
          newStatus: 'escalated',
          notes: `Escalated to Tier ${input.targetTier} (${input.targetRole}: ${input.targetName}). Reason: ${input.reason}`,
        });

        return { success: true, escalated: true };
      }),

    /** Accept risk formally with expiration date and compensating controls (ISO 27005 / NIST CSF) */
    acceptRiskAction: clientProcedure
      .input(z.object({
        clientId: z.number(),
        actionId: z.coerce.number(),
        rationale: z.string().min(5),
        compensatingControls: z.string().optional(),
        expiryDays: z.number().default(90),
      }))
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const actorId = ctx.user?.id ? Number(ctx.user.id) : null;
        const actorName = ctx.user?.name || ctx.user?.email || "Reviewer";

        const [actionRow] = await db.execute(sql`
          SELECT id, title, status FROM autopilot_actions
          WHERE id = ${input.actionId} AND client_id = ${input.clientId} LIMIT 1`).then((r: any) => r.rows ?? r);

        if (!actionRow) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });

        const expiryDate = new Date(Date.now() + (input.expiryDays || 90) * 86400000);
        const expiryIso = expiryDate.toISOString();

        await db.execute(sql`
          UPDATE autopilot_actions
          SET status = 'risk_accepted',
              risk_accepted_until = ${expiryIso}::timestamptz,
              risk_acceptance_rationale = ${input.rationale},
              compensating_controls = ${input.compensatingControls || null},
              reviewed_by = ${actorId},
              reviewed_at = now()
          WHERE id = ${input.actionId}`);

        await logActionHistory(db, {
          actionId: input.actionId,
          clientId: input.clientId,
          actorType: 'user',
          actorId,
          actorName,
          actionType: 'risk_accepted',
          previousStatus: actionRow.status,
          newStatus: 'risk_accepted',
          notes: `Risk formally accepted until ${expiryDate.toLocaleDateString()}. Rationale: ${input.rationale}. Compensating controls: ${input.compensatingControls || 'None recorded'}.`,
        });

        return { success: true, acceptedUntil: expiryDate };
      }),

    /** Promote finding into an official incident with NIS2/GDPR 24h milestone clock */
    promoteToIncident: clientProcedure
      .input(z.object({
        clientId: z.number(),
        actionId: z.coerce.number(),
        title: z.string().min(3),
        severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
        description: z.string().optional(),
        isSignificant: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const actorId = ctx.user?.id ? Number(ctx.user.id) : null;
        const actorName = ctx.user?.name || ctx.user?.email || "User";

        const [actionRow] = await db.execute(sql`
          SELECT id, title, description, status FROM autopilot_actions
          WHERE id = ${input.actionId} AND client_id = ${input.clientId} LIMIT 1`).then((r: any) => r.rows ?? r);

        if (!actionRow) throw new TRPCError({ code: "NOT_FOUND", message: "Action not found" });

        const [newInc] = await db.execute(sql`
          INSERT INTO incidents 
            (client_id, title, severity, is_significant, description, status, detected_at, reporter_name, created_at, updated_at)
          VALUES (
            ${input.clientId}, ${input.title}, ${input.severity}::incident_severity, ${input.isSignificant},
            ${input.description || actionRow.description || "Promoted from Action Center finding"},
            'open'::incident_status, now(), ${actorName}, now(), now()
          ) RETURNING id`).then((r: any) => r.rows ?? r);

        const incId = newInc?.id || null;

        await db.execute(sql`
          UPDATE autopilot_actions
          SET status = 'escalated',
              incident_id = ${incId},
              escalation_level = 3,
              escalated_to_role = 'Incident Response Team',
              escalated_to_name = 'SecOps / IRT',
              escalated_at = now(),
              escalation_reason = ${`Promoted to official Security Incident #${incId || 'new'}`}
          WHERE id = ${input.actionId}`);

        await logActionHistory(db, {
          actionId: input.actionId,
          clientId: input.clientId,
          actorType: 'user',
          actorId,
          actorName,
          actionType: 'promoted_to_incident',
          previousStatus: actionRow.status,
          newStatus: 'escalated',
          notes: `Promoted to Security Incident #${incId || ''}: ${input.title} (Severity: ${input.severity.toUpperCase()}).`,
        });

        return { success: true, incidentId: incId };
      }),

    /** Get chronological audit history timeline for an action */
    getActionHistory: clientProcedure
      .input(z.object({
        clientId: z.number(),
        actionId: z.coerce.number(),
      }))
      .query(async ({ input }: { input: { clientId: number; actionId: number } }) => {
        const db = await getDb();
        if (!db) return [];
        const rows = await db.execute(sql`
          SELECT id, action_id AS "actionId", client_id AS "clientId",
                 actor_type AS "actorType", actor_id AS "actorId", actor_name AS "actorName",
                 action_type AS "actionType", previous_status AS "previousStatus", new_status AS "newStatus",
                 notes, patch_payload AS "patchPayload", created_at AS "createdAt"
          FROM autopilot_action_history
          WHERE action_id = ${input.actionId} AND client_id = ${input.clientId}
          ORDER BY created_at ASC`).then((r: any) => r.rows ?? r);
        return rows;
      }),

    /** Get proactive summary stats for top-bar badge and Action Center overview */
    getStats: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: { input: { clientId: number } }) => {
        const db = await getDb();
        if (!db) return { 
          totalPending: 0, awaitingReviewCount: 0, delegatedCount: 0, escalatedCount: 0, riskAcceptedCount: 0,
          criticalCount: 0, warningCount: 0, executedCount: 0, rejectedCount: 0, cadence: "daily", lastRunAt: null 
        };

        const [counts] = await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') AS "totalPending",
            COUNT(*) FILTER (WHERE status = 'awaiting_human_review') AS "awaitingReviewCount",
            COUNT(*) FILTER (WHERE status = 'delegated_human' OR status = 'delegated_agent') AS "delegatedCount",
            COUNT(*) FILTER (WHERE status = 'escalated') AS "escalatedCount",
            COUNT(*) FILTER (WHERE status = 'risk_accepted') AS "riskAcceptedCount",
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
          awaitingReviewCount: parseInt(counts?.awaitingReviewCount || "0", 10),
          delegatedCount: parseInt(counts?.delegatedCount || "0", 10),
          escalatedCount: parseInt(counts?.escalatedCount || "0", 10),
          riskAcceptedCount: parseInt(counts?.riskAcceptedCount || "0", 10),
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

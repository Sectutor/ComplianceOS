import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { AutopilotEngine, runScheduledAutopilot, ensureAutopilotTablesExist } from "../../lib/autopilot/engine";
import { getDb } from "../../db";
import { autopilotRuns, autopilotActions } from "../../schema_autopilot";
import { eq, desc } from "drizzle-orm";

export const createAutopilotRouter = (t: any, clientProcedure: any, adminProcedure: any) => {
  return t.router({
    /** Get autopilot configuration for the client */
    getConfig: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => AutopilotEngine.getConfig(input.clientId)),

    /** Update autopilot configuration */
    updateConfig: clientProcedure
      .input(z.object({
        clientId: z.number(),
        enabled: z.boolean().optional(),
        schedule: z.enum(['hourly', 'daily', 'weekly', 'manual']).optional(),
        modules: z.object({
          collectEvidence: z.boolean().optional(),
          runHealthChecks: z.boolean().optional(),
          detectGaps: z.boolean().optional(),
          createRemediationTasks: z.boolean().optional(),
          generateReport: z.boolean().optional(),
          sendNotifications: z.boolean().optional(),
        }).optional(),
        approvalMode: z.enum(['auto', 'review']).optional(),
        // The dashboard sends this as `mode`; accept the alias so the
        // approval setting is not silently discarded.
        mode: z.enum(['auto', 'review']).optional(),
      }))
      .mutation(async ({ input }) => {
        // Normalise the `mode` alias onto the real `approvalMode` column and
        // drop it, so it is never spread into the DB update as an unknown key.
        const { mode, ...rest } = input as any;
        const updates = {
          ...rest,
          ...(mode !== undefined && rest.approvalMode === undefined
            ? { approvalMode: mode }
            : {}),
        };
        await AutopilotEngine.updateConfig(input.clientId, updates);
        return { success: true };
      }),

    /** Run autopilot now */
    runNow: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => AutopilotEngine.run(input.clientId)),

    /** Get run history */
    getRunHistory: clientProcedure
      .input(z.object({ clientId: z.number(), limit: z.number().default(10) }))
      .query(async ({ input }) => AutopilotEngine.getRunHistory(input.clientId, input.limit)),

    /** Get pending actions requiring review */
    getPendingActions: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => AutopilotEngine.getPendingActions(input.clientId)),

    /** Approve or reject an action */
    reviewAction: clientProcedure
      .input(z.object({
        actionId: z.number(),
        status: z.enum(['approved', 'rejected']),
      }))
      .mutation(async ({ input, ctx }) => {
        await AutopilotEngine.reviewAction(input.actionId, ctx.user?.id || 0, input.status);
        return { success: true };
      }),

    /**
     * approveAction / rejectAction
     *
     * The Autopilot dashboard calls these two names with { clientId, actionId }.
     * They are thin wrappers over reviewAction so the review logic lives in one
     * place. actionId is coerced because the UI passes it as a string.
     */
    approveAction: clientProcedure
      .input(z.object({
        clientId: z.number().optional(),
        actionId: z.coerce.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await AutopilotEngine.reviewAction(input.actionId, ctx.user?.id || 0, 'approved');
        return { success: true, actionId: input.actionId, status: 'approved' as const };
      }),

    rejectAction: clientProcedure
      .input(z.object({
        clientId: z.number().optional(),
        actionId: z.coerce.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        await AutopilotEngine.reviewAction(input.actionId, ctx.user?.id || 0, 'rejected');
        return { success: true, actionId: input.actionId, status: 'rejected' as const };
      }),

    /** Admin: run autopilot for all enabled clients */
    runAll: adminProcedure
      .mutation(async () => runScheduledAutopilot()),

    /** Admin: list recent runs across all clients */
    listAllRuns: adminProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        await ensureAutopilotTablesExist();
        try {
          const db = await getDb();
          return await db.select().from(autopilotRuns)
            .orderBy(desc(autopilotRuns.startedAt))
            .limit(input.limit);
        } catch (err) {
          console.warn('[AutopilotRouter] listAllRuns failed:', (err as Error).message);
          return [];
        }
      }),

    /** Get the last autopilot run for a client */
    getLastRun: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        await ensureAutopilotTablesExist();
        try {
          const db = await getDb();
          const [run] = await db.select().from(autopilotRuns)
            .where(eq(autopilotRuns.clientId, input.clientId))
            .orderBy(desc(autopilotRuns.startedAt))
            .limit(1);
          if (!run) return null;
          return {
            ...run,
            createdAt: run.startedAt, // Map startedAt to createdAt for the frontend query
          };
        } catch (err) {
          console.warn('[AutopilotRouter] getLastRun failed:', (err as Error).message);
          return null;
        }
      }),

    /** Trigger autopilot run manually */
    trigger: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => {
        // Run the autopilot orchestrator
        const run = await AutopilotEngine.run(input.clientId);
        // Real engine outcomes only — the previous response invented
        // per-category numbers with arbitrary multipliers.
        return {
          totalCreated: run.results?.tasksCreated || 0,
          evidenceCollected: run.results?.evidenceCollected || 0,
          healthIssuesFound: run.results?.healthIssuesFound || 0,
          gapsDetected: run.results?.gapsDetected || 0,
          notificationsSent: run.results?.notificationsSent || 0,
        };
      }),
  });
};

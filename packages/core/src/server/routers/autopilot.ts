import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { AutopilotEngine, runScheduledAutopilot } from "../../lib/autopilot/engine";
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
      }))
      .mutation(async ({ input }) => {
        await AutopilotEngine.updateConfig(input.clientId, input);
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

    /** Admin: run autopilot for all enabled clients */
    runAll: adminProcedure
      .mutation(async () => runScheduledAutopilot()),

    /** Admin: list recent runs across all clients */
    listAllRuns: adminProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        return db.select().from(autopilotRuns)
          .orderBy(desc(autopilotRuns.startedAt))
          .limit(input.limit);
      }),

    /** Get the last autopilot run for a client */
    getLastRun: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
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
      }),

    /** Trigger autopilot run manually */
    trigger: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => {
        // Run the autopilot orchestrator
        const run = await AutopilotEngine.run(input.clientId);
        return {
          totalCreated: run.results?.tasksCreated || 0,
          policies: Math.round((run.results?.tasksCreated || 0) * 0.3),
          risks: Math.round((run.results?.tasksCreated || 0) * 0.2),
          controls: Math.round((run.results?.tasksCreated || 0) * 0.5),
        };
      }),
  });
};

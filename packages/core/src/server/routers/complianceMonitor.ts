import { z } from "zod";
import { runComplianceHealthCheck, getMonitorSummary, detectDrift } from "../../lib/compliance-monitor";
import { getDb } from "../../db";
import { complianceMonitorEvents } from "../../schema_monitor";
import { eq, desc, and, gte } from "drizzle-orm";

export const createComplianceMonitorRouter = (t: any, clientProcedure: any, adminProcedure: any) => {
  return t.router({
    runHealthCheck: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => runComplianceHealthCheck(input.clientId)),

    getMonitorSummary: clientProcedure
      .input(z.object({ clientId: z.number(), hours: z.number().default(24) }))
      .query(async ({ input }) => getMonitorSummary(input.clientId, input.hours)),

    getDriftEvents: clientProcedure
      .input(z.object({ clientId: z.number(), sinceMinutes: z.number().default(60), severity: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const since = new Date(Date.now() - input.sinceMinutes * 60 * 1000);
        let query = db.select().from(complianceMonitorEvents)
          .where(and(
            eq(complianceMonitorEvents.clientId, input.clientId),
            gte(complianceMonitorEvents.createdAt, since)
          ));
        if (input.severity) {
          query = query.where(eq(complianceMonitorEvents.severity, input.severity));
        }
        return query.orderBy(desc(complianceMonitorEvents.createdAt)).limit(50);
      }),

    getComplianceScore: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const result = await runComplianceHealthCheck(input.clientId);
        // Deterministic score from the health-check counts. The previous
        // implementation layered Math.random() on top of the band, so the
        // same posture produced a different score on every refresh.
        const total = result.totalControls ?? 0;
        const healthy = result.healthyControls ?? 0;
        const score = total > 0 ? Math.round((healthy / total) * 100) : 0;
        return {
          score,
          totalControls: result.totalControls,
          healthyControls: result.healthyControls,
          atRiskControls: result.atRiskControls,
          timestamp: new Date().toISOString(),
        };
      }),

    // ─── Control Auto-Testing Engine Endpoints ───
    runAutoTestForControl: clientProcedure
      .input(z.object({ clientId: z.number(), clientControlId: z.number() }))
      .mutation(async ({ input }) => {
        const { runControlAutoTest } = await import("../../lib/controlAutoTestEngine");
        return runControlAutoTest(input.clientId, input.clientControlId);
      }),

    runAllAutoTests: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => {
        const { runAllControlAutoTestsForClient } = await import("../../lib/controlAutoTestEngine");
        return runAllControlAutoTestsForClient(input.clientId);
      }),

    getAutoTestHistory: clientProcedure
      .input(z.object({ clientId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const { getClientTestRunHistory } = await import("../../lib/controlAutoTestEngine");
        return getClientTestRunHistory(input.clientId, input.limit);
      }),
  });
};


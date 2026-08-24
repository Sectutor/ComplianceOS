import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  collectGithubEvidence,
  collectAwsEvidence,
  collectOktaEvidence,
  runAllAutomatedCollectors,
  ensureCollectorLogsTableExists,
} from "../../connectors/automatedEvidenceCollectors";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { sql, eq, desc } from "drizzle-orm";

export const connectorsRouter = router({
  /**
   * Run all automated evidence collectors for a client
   */
  runAll: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const results = await runAllAutomatedCollectors(input.clientId);
      const totalEvidence = results.reduce((acc, r) => acc + r.evidenceGenerated, 0);

      return {
        success: true,
        clientId: input.clientId,
        totalEvidenceGenerated: totalEvidence,
        results,
      };
    }),

  /**
   * Run specific automated provider collector
   */
  runProvider: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        provider: z.enum(["github", "aws", "okta"]),
      })
    )
    .mutation(async ({ input }) => {
      let result;
      if (input.provider === "github") {
        result = await collectGithubEvidence(input.clientId);
      } else if (input.provider === "aws") {
        result = await collectAwsEvidence(input.clientId);
      } else {
        result = await collectOktaEvidence(input.clientId);
      }

      return {
        success: true,
        clientId: input.clientId,
        result,
      };
    }),

  /**
   * Get collector execution logs history
   */
  getLogs: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      await ensureCollectorLogsTableExists();
      const db = await getDb();

      const res = await db.execute(sql`
        SELECT id, provider, status, evidence_count as "evidenceCount",
               findings_json as "findingsJson", executed_at as "executedAt"
        FROM evidence_collector_logs
        WHERE client_id = ${input.clientId}
        ORDER BY executed_at DESC
        LIMIT 50;
      `);

      const rows = (res.rows || res) as any[];
      return rows.map((r) => ({
        ...r,
        findings: r.findingsJson ? JSON.parse(r.findingsJson) : [],
        executedAt: new Date(r.executedAt).toISOString(),
      }));
    }),

  /**
   * Connector catalogue — one entry per registered integration definition.
   * Backs the "Add Connector" type picker in ConnectorManager.
   */
  listTypes: publicProcedure.query(async () => {
    const db = await getDb();
    return db.select().from(schema.integrationDefinitions).orderBy(schema.integrationDefinitions.name);
  }),

  /** Installed connectors for a client. */
  listInstalled: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(schema.integrations)
        .where(eq(schema.integrations.clientId, input.clientId))
        .orderBy(desc(schema.integrations.createdAt));
    }),

  /**
   * Install a connector. The UI sends {clientId, type, name, credentials,
   * settings, schedule}; these map onto the integrations table.
   */
  install: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        type: z.string(),
        name: z.string().min(1),
        credentials: z.any().optional(),
        settings: z.any().optional(),
        schedule: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Resolve the definition so we store its numeric id where available
      const [definition] = await db
        .select()
        .from(schema.integrationDefinitions)
        .where(eq(schema.integrationDefinitions.provider, input.type))
        .limit(1);

      const [created] = await db
        .insert(schema.integrations)
        .values({
          clientId: input.clientId,
          provider: input.type,
          metadata: {
            name: input.name,
            credentials: input.credentials ?? {},
            settings: input.settings ?? {},
            schedule: input.schedule ?? "daily",
            definitionId: definition?.id ?? null,
          },
        } as any)
        .returning();
      return created;
    }),

  /** Uninstall a connector by id. */
  uninstall: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [deleted] = await db
        .delete(schema.integrations)
        .where(eq(schema.integrations.id, input.id))
        .returning();
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });
      return { success: true, id: deleted.id };
    }),

  /**
   * Run a single connector now: executes the matching automated collector and
   * returns the evidence count the UI toasts about.
   */
  run: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [connector] = await db
        .select()
        .from(schema.integrations)
        .where(eq(schema.integrations.id, input.id))
        .limit(1);
      if (!connector) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });

      const results = await runAllAutomatedCollectors(connector.clientId);
      const evidenceCollected = results.reduce((acc: number, r: any) => acc + (r.evidenceGenerated || 0), 0);
      const failed = results.filter((r: any) => r.status === "error");

      return {
        success: failed.length === 0,
        evidenceCollected,
        errors: failed.map((f: any) => f.error || f.provider),
        results,
      };
    }),

  /** Aggregated run history stats for EvidenceCollectionDashboard. */
  getStats: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      await ensureCollectorLogsTableExists();
      const db = await getDb();
      const res = await db.execute(sql`
        SELECT
          COUNT(*)::int AS totalRuns,
          COALESCE(SUM(evidence_count), 0)::int AS totalEvidence,
          COUNT(*) FILTER (WHERE status = 'success')::int AS successfulRuns,
          COUNT(*) FILTER (WHERE status = 'error')::int AS failedRuns,
          MAX(executed_at) AS lastRunAt
        FROM evidence_collector_logs
        WHERE client_id = ${input.clientId};
      `);
      const rows = (res.rows || res) as any[];
      const s = rows[0] || {};
      return {
        totalRuns: s.totalRuns ?? 0,
        totalEvidence: s.totalEvidence ?? 0,
        successfulRuns: s.successfulRuns ?? 0,
        failedRuns: s.failedRuns ?? 0,
        lastRunAt: s.lastRunAt ? new Date(s.lastRunAt).toISOString() : null,
      };
    }),

  /** Per-connector run history (newer wrapper over getLogs with a limit). */
  getRunHistory: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input }) => {
      await ensureCollectorLogsTableExists();
      const db = await getDb();
      const res = await db.execute(sql`
        SELECT id, provider, status, evidence_count as "evidenceCount",
               findings_json as "findingsJson", executed_at as "executedAt"
        FROM evidence_collector_logs
        WHERE client_id = ${input.clientId}
        ORDER BY executed_at DESC
        LIMIT ${input.limit};
      `);
      const rows = (res.rows || res) as any[];
      return rows.map((r) => {
        // Malformed findings_json must not blow up the whole history query
        let findings: any[] = [];
        try {
          findings = r.findingsJson ? JSON.parse(r.findingsJson) : [];
        } catch {
          findings = [];
        }
        return {
          ...r,
          findings,
          executedAt: new Date(r.executedAt).toISOString(),
        };
      });
    }),
});

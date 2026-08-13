import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import {
  collectGithubEvidence,
  collectAwsEvidence,
  collectOktaEvidence,
  runAllAutomatedCollectors,
  ensureCollectorLogsTableExists,
} from "../../connectors/automatedEvidenceCollectors";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";

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
});

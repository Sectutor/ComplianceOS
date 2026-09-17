import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { analyzeClientEvidenceGaps } from "../../lib/evidence/gapAnalysisEngine";

export const gapAnalysisEngineRouter = router({
  /**
   * Run automated evidence gap analysis & readiness scoring
   */
  getGapReport: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const report = await analyzeClientEvidenceGaps(input.clientId);
      return report;
    }),
});

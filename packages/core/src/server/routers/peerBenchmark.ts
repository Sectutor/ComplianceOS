import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { getPeerBenchmarkData } from "../../lib/analytics/peerBenchmarkEngine";

export const peerBenchmarkRouter = router({
  /**
   * Fetch Industry Peer Compliance Benchmark Report
   */
  getBenchmark: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        industry: z.enum(["SaaS & Cloud", "Fintech", "Healthcare", "Government & Defense"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const res = await getPeerBenchmarkData(input.clientId, input.industry);
      return res;
    }),
});

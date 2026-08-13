import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { calculateZeroTrustHealthScore } from "../../lib/telemetry/controlHealthTelemetry";

export const controlHealthRouter = router({
  /**
   * Fetch Zero-Trust Real-Time Control Health Score & Telemetry Breakdown
   */
  getHealthScore: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const res = await calculateZeroTrustHealthScore(input.clientId);
      return res;
    }),
});

import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { evaluateTransferImpactAssessment } from "../../lib/privacy/privacySovereigntyService";

export const privacySovereigntyRouter = router({
  /**
   * Evaluate Cross-Border Data Transfer Impact Assessment (TIA)
   */
  evaluateTransfer: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        sourceRegion: z.enum(["EU", "UK", "US", "APAC"]),
        destinationRegion: z.enum(["EU", "UK", "US", "APAC"]),
        dataType: z.enum(["PII", "ePHI", "Financial", "Telemetry"]),
      })
    )
    .mutation(async ({ input }) => {
      const tia = await evaluateTransferImpactAssessment(
        input.clientId,
        input.sourceRegion,
        input.destinationRegion,
        input.dataType
      );
      return { success: true, tia };
    }),
});

import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { calculateVendorRiskTier, dispatchVendorQuestionnaire } from "../../lib/vendor/vendorRiskEngine";

export const vendorRiskRouter = router({
  /**
   * Calculate Vendor Risk Score and TPRM Tiering
   */
  calculateTier: publicProcedure
    .input(
      z.object({
        vendorName: z.string(),
        dataAccessType: z.enum(["PII", "ePHI", "Infrastructure", "None"]),
        hasCleanSoc2: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const result = await calculateVendorRiskTier(
        input.vendorName,
        input.dataAccessType,
        input.hasCleanSoc2
      );
      return { success: true, ...result };
    }),

  /**
   * Dispatch Annual Vendor Security Questionnaire
   */
  dispatchQuestionnaire: publicProcedure
    .input(
      z.object({
        vendorId: z.number(),
        vendorEmail: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await dispatchVendorQuestionnaire(input.vendorId, input.vendorEmail);
      return result;
    }),
});

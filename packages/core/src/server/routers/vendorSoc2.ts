import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { evaluateVendorSoc2Report } from "../../lib/vendor/soc2PdfParser";

export const vendorSoc2Router = router({
  /**
   * Evaluate uploaded Vendor SOC 2 PDF Report text
   */
  evaluateReport: publicProcedure
    .input(
      z.object({
        vendorName: z.string(),
        reportText: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const evaluation = await evaluateVendorSoc2Report(input.reportText, input.vendorName);
      return {
        success: true,
        evaluation,
      };
    }),
});

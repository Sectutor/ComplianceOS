import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { evaluateCisaKevThreats, CISA_KEV_CATALOG } from "../../lib/threats/cisaKevWatcher";

export const cisaKevRouter = router({
  /**
   * Run automated CISA KEV vulnerability scan & threat auto-mapping
   */
  scan: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await evaluateCisaKevThreats(input.clientId);
      return {
        success: true,
        ...result,
      };
    }),

  /**
   * Get active CISA Known Exploited Vulnerabilities catalog
   */
  getCatalog: publicProcedure.query(async () => {
    return {
      total: CISA_KEV_CATALOG.length,
      catalog: CISA_KEV_CATALOG,
      lastUpdated: new Date().toISOString(),
    };
  }),
});

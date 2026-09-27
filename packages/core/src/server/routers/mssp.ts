import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import {
  createMsspPartner,
  assignClientToPartner,
  getMsspPortfolioRollup,
} from "../../lib/mssp/msspGovernanceService";

export const msspRouter = router({
  /**
   * Create MSSP Partner Account
   */
  createPartner: adminProcedure
    .input(
      z.object({
        name: z.string(),
        whiteLabelDomain: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const partner = await createMsspPartner(input.name, input.whiteLabelDomain);
      return { success: true, partner };
    }),

  /**
   * Assign Client Organization to Partner
   */
  assignClient: adminProcedure
    .input(
      z.object({
        partnerId: z.number(),
        clientId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await assignClientToPartner(input.partnerId, input.clientId);
      return { success: true };
    }),

  /**
   * Fetch Multi-Tenant Portfolio Risk & Compliance Rollup
   */
  getPortfolioRollup: adminProcedure
    .input(z.object({ partnerId: z.number().default(1) }))
    .query(async ({ input }) => {
      const rollup = await getMsspPortfolioRollup(input.partnerId);
      return rollup;
    }),
});

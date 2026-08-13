import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import {
  createAccessReviewCampaign,
  decideAccessItem,
  getCampaignSummary,
} from "../../lib/access/accessReviewService";

export const accessReviewRouter = router({
  /**
   * Create new Access Review Campaign
   */
  createCampaign: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        name: z.string(),
        quarter: z.string().optional().default("Q1 2026"),
      })
    )
    .mutation(async ({ input }) => {
      const campaign = await createAccessReviewCampaign(input.clientId, input.name, input.quarter);
      return { success: true, campaign };
    }),

  /**
   * Record decision for access item
   */
  decideItem: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
        decision: z.enum(["approved", "revoked"]),
        reviewerEmail: z.string().optional().default("manager@company.com"),
      })
    )
    .mutation(async ({ input }) => {
      await decideAccessItem(input.itemId, input.decision, input.reviewerEmail);
      return { success: true };
    }),

  /**
   * Get Campaign Summary & Items
   */
  getCampaignSummary: publicProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const summary = await getCampaignSummary(input.campaignId);
      return summary;
    }),
});

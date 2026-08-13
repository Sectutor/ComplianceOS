import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { discoverCloudAssets } from "../../lib/assets/cloudAssetDiscovery";
import { getDb } from "../../db";
import { assets } from "../../schema";
import { eq } from "drizzle-orm";

export const cloudAssetsRouter = router({
  /**
   * Run continuous cloud asset auto-discovery
   */
  runDiscovery: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        provider: z.enum(["aws", "azure", "gcp"]).default("aws"),
      })
    )
    .mutation(async ({ input }) => {
      const res = await discoverCloudAssets(input.clientId, input.provider);
      return {
        success: true,
        ...res,
      };
    }),

  /**
   * Fetch discovered asset inventory
   */
  getAssets: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db
        .select()
        .from(assets)
        .where(eq(assets.clientId, input.clientId));
      return rows;
    }),
});

import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { runEvidenceSentinelScan } from "../../lib/evidence/evidenceSentinel";

export const evidenceSentinelRouter = router({
  /**
   * Run continuous evidence expiration scan & auto-recollection
   */
  runScan: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const res = await runEvidenceSentinelScan(input.clientId);
      return { success: true, ...res };
    }),
});

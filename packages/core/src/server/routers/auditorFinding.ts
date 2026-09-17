import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { logAuditorFinding, getCapRemediationStatus } from "../../lib/audit/auditorFindingTracker";

export const auditorFindingRouter = router({
  /**
   * Log External Auditor Observation Finding & Corrective Action Plan (CAP)
   */
  logFinding: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        title: z.string(),
        description: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        auditorId: z.number().default(1),
        slaDays: z.enum(["30", "60", "90"]).optional().transform((val) => (val ? (parseInt(val) as 30 | 60 | 90) : undefined)),
      })
    )
    .mutation(async ({ input }) => {
      const res = await logAuditorFinding({
        clientId: input.clientId,
        title: input.title,
        description: input.description,
        severity: input.severity,
        auditorId: input.auditorId,
        slaDays: input.slaDays,
      });
      return res;
    }),

  /**
   * Get CAP Remediation Status Summary
   */
  getStatus: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const res = await getCapRemediationStatus(input.clientId);
      return res;
    }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  buildHeatmapContract,
  listTreatmentPlans,
  loadRiskHeatmap,
  loadTreatmentSummary,
  updateTreatmentStatus,
} from "../lib/riskHeatmap";

/**
 * Stable error helper for the risk heat map namespace — converts any thrown
 * value into a TRPCError with a user-safe message.
 */
function trpcError(err: unknown, fallback: string): never {
  const detail = err instanceof Error && err.message ? err.message : fallback;
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Risk heat map failed: ${detail}`,
    cause: err,
  });
}

/**
 * Risk Heat Map router (scorecard P1 #3 "Risk heat map + treatment plans").
 *
 * Activates the previously dormant Phase-2 risk code:
 *   - getHeatmap         → 5x5 likelihood x impact matrix with counts
 *   - treatmentSummary   → treatment status breakdown + progress
 *   - updateTreatmentStatus → forward-only status transitions
 *
 * Mirrors the createControlMonitoringRouter factory pattern (routers/
 * controlMonitoring.ts). Use `clientProcedure` so client scoping is enforced
 * at the middleware level.
 */
export const createRiskHeatmapRouter = (t: any, clientProcedure: any) => {
  return t.router({
    getHeatmap: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          type: z.enum(["inherent", "residual"]).optional().default("inherent"),
        })
      )
      .query(async ({ input }) => {
        try {
          const result = await loadRiskHeatmap(input.clientId, input.type);
          return buildHeatmapContract(result);
        } catch (err) {
          return trpcError(err, "could not load risk heat map");
        }
      }),

    listTreatmentPlans: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          likelihood: z.number().optional(),
          impact: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          return await listTreatmentPlans(
            input.clientId,
            input.likelihood,
            input.impact
          );
        } catch (err) {
          return trpcError(err, "could not load treatment plans");
        }
      }),

    treatmentSummary: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await loadTreatmentSummary(input.clientId);
        } catch (err) {
          return trpcError(err, "could not load treatment summary");
        }
      }),

    updateTreatmentStatus: clientProcedure
      .input(
        z.object({
          treatmentId: z.number(),
          clientId: z.number(),
          status: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await updateTreatmentStatus(
            input.treatmentId,
            input.clientId,
            input.status
          );
          if (!result.allowed) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid treatment status transition to "${input.status}"`,
            });
          }
          return result;
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          return trpcError(err, "could not update treatment status");
        }
      }),
  });
};

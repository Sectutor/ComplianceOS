import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  DEFAULT_RENEWAL_HORIZON_DAYS,
  getRenewalStateSummary,
  runEvidenceRenewal,
} from '../lib/evidenceRenewal';

/**
 * Stable error helper for the evidence renewal namespace — converts any
 * thrown value into a TRPCError with a user-safe prefix.
 */
function trpcError(err: unknown, fallback: string): never {
  const detail = err instanceof Error && err.message ? err.message : fallback;
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Evidence renewal failed: ${detail}`,
    cause: err,
  });
}

/**
 * Evidence Renewal router (scorecard P1 #14 — evidence expiration +
 * auto-renewal). Exposes the renewal loop as on-demand tRPC procedures:
 *   - getSummary → current renewal state (due / expired / verified counts)
 *   - runNow     → trigger a renewal tick immediately (auto-remediation)
 *
 * Mirrors the createEvidenceCollectorsRouter factory pattern.
 */
export const createEvidenceRenewalRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    getSummary: protectedProcedure
      .input(
        z
          .object({
            horizonDays: z.number().int().positive().max(365).optional(),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        try {
          return await getRenewalStateSummary({
            horizonDays: input?.horizonDays ?? DEFAULT_RENEWAL_HORIZON_DAYS,
          });
        } catch (err) {
          return trpcError(err, 'could not load evidence renewal summary');
        }
      }),

    runNow: protectedProcedure
      .input(
        z
          .object({
            horizonDays: z.number().int().positive().max(365).optional(),
          })
          .optional(),
      )
      .mutation(async ({ input }) => {
        try {
          return await runEvidenceRenewal({
            horizonDays: input?.horizonDays ?? DEFAULT_RENEWAL_HORIZON_DAYS,
          });
        } catch (err) {
          return trpcError(err, 'could not run evidence renewal');
        }
      }),
  });
};

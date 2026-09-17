import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  acknowledgeById,
  acknowledgePolicy,
  assignPolicy,
  getAckSummary,
  listAcks,
  listAcksForPolicy,
  listPendingAcks,
} from "../lib/policyAck";

/**
 * Policy Acknowledgment router (scorecard P1 #4 — "Policy management + ack").
 *
 * Exposes the user-based sign-off workflow backed by the Drizzle-native
 * `policy_acknowledgements` table:
 *   - listPending     → acknowledgments waiting on a user
 *   - acknowledge     → upsert a user's sign-off for a policy
 *   - listForPolicy   → all acknowledgments for one policy
 *   - summary         → per-policy sign-off stats for a client
 */
export const createPolicyAckRouter = (t: any, clientProcedure: any) => {
  return t.router({
    listPending: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          return await listPendingAcks(input.clientId, input.userId);
        } catch (err) {
          throw trpcError(err, "could not load pending acknowledgments");
        }
      }),

    list: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await listAcks(input.clientId);
        } catch (err) {
          throw trpcError(err, "could not load acknowledgments");
        }
      }),

    acknowledge: clientProcedure
      .input(z.object({ acknowledgmentId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const row = await acknowledgeById(input.acknowledgmentId);
          const records = await listAcks(row.clientId);
          const record = records.find((r) => r.id === row.id);
          if (!record) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Acknowledgment ${input.acknowledgmentId} not found`,
            });
          }
          return record;
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          throw trpcError(err, "could not record acknowledgment");
        }
      }),

    listForPolicy: clientProcedure
      .input(
        z.object({
          policyId: z.number(),
          clientId: z.number(),
        })
      )
      .query(async ({ input }) => {
        try {
          return await listAcksForPolicy(input.policyId, input.clientId);
        } catch (err) {
          throw trpcError(err, "could not load acknowledgments for policy");
        }
      }),

    summary: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await getAckSummary(input.clientId);
        } catch (err) {
          throw trpcError(err, "could not load acknowledgment summary");
        }
      }),

    // Assign a policy to users (creates pending acknowledgment rows).
    // Idempotent: users who already have a row for the policy are skipped.
    assign: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          policyId: z.number(),
          userIds: z.array(z.number()).optional(),
          allUsers: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await assignPolicy(input);
        } catch (err) {
          throw trpcError(err, "could not assign policy acknowledgments");
        }
      }),
  });
};

function trpcError(err: unknown, fallback: string): never {
  const detail = err instanceof Error && err.message ? err.message : fallback;
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Policy acknowledgment failed: ${detail}`,
    cause: err,
  });
}

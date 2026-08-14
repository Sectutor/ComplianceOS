import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  runControlAutoTest,
  runAllControlAutoTestsForClient,
  getClientTestRunHistory,
  getClientAutoTestSchedule,
  setClientAutoTestSchedule,
} from "../lib/controlAutoTestEngine";

/**
 * Stable error helper for the control monitoring namespace.
 * Converts any thrown value into a TRPCError with a stable,
 * user-safe prefix so clients never see raw stack internals.
 */
function trpcError(err: unknown, fallback: string): never {
  const detail =
    err instanceof Error && err.message ? err.message : fallback;
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Control auto-test failed: ${detail}`,
    cause: err,
  });
}

/**
 * Control Monitoring router — exposes the control auto-test engine
 * (scorecard P0 #2 "Continuous control monitoring") as on-demand
 * tRPC procedures. Mirrors the createManagementRouter factory pattern
 * from routers/management-and-readiness.ts.
 */
export const createControlMonitoringRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    // Run an automated verification test for a single client control
    runControlAutoTest: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        clientControlId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await runControlAutoTest(input.clientId, input.clientControlId);
        } catch (err) {
          return trpcError(err, "could not execute control auto-test");
        }
      }),

    // Run automated verification tests for all controls of a client
    runAllForClient: protectedProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await runAllControlAutoTestsForClient(input.clientId);
        } catch (err) {
          return trpcError(err, "could not execute auto-tests for client");
        }
      }),

    // Recent control test run history for a client
    history: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        try {
          return await getClientTestRunHistory(input.clientId, input.limit);
        } catch (err) {
          return trpcError(err, "could not load control auto-test history");
        }
      }),
    // Get a client's per-client auto-test schedule config
    getScheduleConfig: protectedProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          return await getClientAutoTestSchedule(input.clientId);
        } catch (err) {
          return trpcError(err, "could not load auto-test schedule");
        }
      }),

    // Update a client's per-client auto-test schedule config
    updateScheduleConfig: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        enabled: z.boolean().optional(),
        intervalHours: z.number().int().min(1).max(168).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await setClientAutoTestSchedule(input.clientId, {
            enabled: input.enabled,
            intervalHours: input.intervalHours,
          });
        } catch (err) {
          return trpcError(err, "could not update auto-test schedule");
        }
      }),
  });
};

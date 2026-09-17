import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  listCollectorProviders,
  listCollectorConnections,
  saveCollectorConnection,
  deleteCollectorConnection,
  testCollectorConnection,
  runCollectorConnection,
} from "../lib/evidenceCollectorConnections";

/**
 * Stable error helper for the evidence collectors namespace.
 * Converts any thrown value into a TRPCError with a stable,
 * user-safe prefix so clients never see raw stack internals.
 */
function trpcError(err: unknown, fallback: string): never {
  const detail =
    err instanceof Error && err.message ? err.message : fallback;
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Evidence collector failed: ${detail}`,
    cause: err,
  });
}

/**
 * Evidence Collectors router — exposes automated evidence collection
 * connection management (scorecard P0 #1) as on-demand tRPC procedures:
 * provider discovery, connection CRUD, connection testing, and
 * UI-triggered collection runs. Mirrors the createControlMonitoringRouter
 * factory pattern.
 */
export const createEvidenceCollectorsRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    // List the supported evidence collector provider manifests
    listProviders: protectedProcedure.query(async () => {
      try {
        return await listCollectorProviders();
      } catch (err) {
        return trpcError(err, "could not list evidence collector providers");
      }
    }),

    // List a client's saved evidence collector connections
    list: protectedProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          return await listCollectorConnections(input.clientId);
        } catch (err) {
          return trpcError(err, "could not load evidence collector connections");
        }
      }),

    // Create or update a connection (validates required credential fields)
    save: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        provider: z.enum(['aws', 'azure', 'gcp', 'github', 'http-api']),
        name: z.string().min(1),
        credentials: z.record(z.string()),
        settings: z.record(z.unknown()).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await saveCollectorConnection(input);
        } catch (err) {
          return trpcError(err, "could not save evidence collector connection");
        }
      }),

    // Remove a connection
    remove: protectedProcedure
      .input(z.object({
        id: z.string(),
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await deleteCollectorConnection(input.id, input.clientId);
        } catch (err) {
          return trpcError(err, "could not remove evidence collector connection");
        }
      }),

    // Test a connection against its provider (limit: 1 evidence item)
    test: protectedProcedure
      .input(z.object({
        id: z.string(),
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await testCollectorConnection(input.id, input.clientId);
        } catch (err) {
          return trpcError(err, "could not test evidence collector connection");
        }
      }),

    // Run a connection and collect evidence now (UI-triggered run)
    run: protectedProcedure
      .input(z.object({
        id: z.string(),
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await runCollectorConnection(input.id, input.clientId);
        } catch (err) {
          return trpcError(err, "could not run evidence collector connection");
        }
      }),
  });
};

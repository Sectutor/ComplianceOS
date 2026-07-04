// Connectors tRPC Router
// Provides endpoints for managing and running evidence connectors.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { cloudConnections } from "../../schema";
import { eq, desc } from "drizzle-orm";
import {
  registerConnector,
  getConnector,
  listConnectors,
  getInstalledConnectors,
  saveConnectorConfig,
  deleteConnectorConfig,
} from "../../connectors/registry";
import { runConnector, runScheduledCollectors } from "../../connectors/scheduler";
import { awsConnector } from "../../connectors/providers/aws";
import { githubConnector } from "../../connectors/providers/github";
import { googleWorkspaceConnector } from "../../connectors/providers/google-workspace";
import { oktaConnector } from "../../connectors/providers/okta";
import { dockerConnector } from "../../connectors/providers/docker";

// Auto-register built-in connectors
registerConnector(awsConnector);
registerConnector(githubConnector);
registerConnector(googleWorkspaceConnector);
registerConnector(oktaConnector);
registerConnector(dockerConnector);

export function createConnectorsRouter(
  t: any,
  clientProcedure: any,
  adminProcedure: any
) {
  return t.router({

    // List all registered connector types
    listTypes: adminProcedure.query(async () => {
      return listConnectors().map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        configSchema: c.configSchema,
      }));
    }),

    // List installed connectors for a client
    listInstalled: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return getInstalledConnectors(input.clientId);
      }),

    // Install (create) a new connector config
    install: adminProcedure
      .input(z.object({
        clientId: z.number(),
        type: z.string(),
        name: z.string(),
        credentials: z.record(z.string()),
        settings: z.record(z.any()).optional().default({}),
        schedule: z.enum(["hourly", "daily", "weekly"]).optional().default("daily"),
      }))
      .mutation(async ({ input }) => {
        const def = getConnector(input.type);
        if (!def) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Connector type "${input.type}" is not registered`,
          });
        }

        // Validate credentials
        const validation = await def.validate({
          id: "",
          clientId: input.clientId,
          type: input.type,
          name: input.name,
          enabled: true,
          schedule: input.schedule,
          credentials: input.credentials,
          settings: input.settings,
        });

        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Validation failed: ${validation.errors.join(", ")}`,
          });
        }

        return saveConnectorConfig({
          clientId: input.clientId,
          type: input.type,
          name: input.name,
          enabled: true,
          schedule: input.schedule,
          credentials: input.credentials,
          settings: input.settings,
        });
      }),

    // Uninstall (delete) a connector config
    uninstall: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteConnectorConfig(input.id);
        return { success: true };
      }),

    // Run a specific connector immediately
    run: clientProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return runConnector(input.id);
      }),

    // Run all enabled connectors for a client
    runAll: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => {
        const configs = await getInstalledConnectors(input.clientId);
        const results: any[] = [];

        for (const cfg of configs) {
          if (cfg.enabled) {
            try {
              const result = await runConnector(cfg.id);
              results.push({ id: cfg.id, name: cfg.name, ...result });
            } catch (err: any) {
              results.push({ id: cfg.id, name: cfg.name, success: false, errors: [err.message], evidenceCollected: 0, summary: [] });
            }
          }
        }

        return results;
      }),

    // Run scheduled collectors (admin / cron hook)
    runScheduled: adminProcedure.mutation(async () => {
      return runScheduledCollectors();
    }),

    // Get run history (recent evidence from connectors)
    getRunHistory: clientProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(20),
      }))
      .query(async ({ input }) => {
        const dbConn = await getDb();
        const rows = await dbConn
          .select()
          .from(cloudConnections)
          .where(eq(cloudConnections.clientId, input.clientId))
          .orderBy(desc(cloudConnections.lastSyncAt))
          .limit(input.limit);

        return rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          provider: r.provider,
          status: r.status,
          lastRunAt: r.lastSyncAt,
          errorMessage: r.errorMessage,
        }));
      }),

    // Get dashboard stats
    getStats: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await getDb();
        const configs = await getInstalledConnectors(input.clientId);

        // Count total evidence collected via connectors
        const [countResult]: any = await dbConn
          .select({
            count: z.any(),
          })
          .from(cloudConnections) // placeholder — real count would join evidence table
          .where(eq(cloudConnections.clientId, input.clientId));

        const totalConnectors = configs.length;
        const enabledConnectors = configs.filter((c) => c.enabled).length;
        const failedConnectors = configs.filter((c) => c.lastRunStatus === "failed").length;

        return {
          totalConnectors,
          enabledConnectors,
          failedConnectors,
          lastRunAt: configs.length > 0
            ? configs.reduce((latest, c) =>
                c.lastRunAt && (!latest || c.lastRunAt > latest) ? c.lastRunAt : latest
              , undefined as Date | undefined)
            : null,
        };
      }),
  });
}

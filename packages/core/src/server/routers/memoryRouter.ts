/**
 * tRPC Router for Company Memory Cortex & VFS Virtual Filesystem
 * Registered as `memory:` on AppRouter.
 */

import { z } from "zod";
import { vfsMemoryEngine } from "../../lib/memory/vfsMemoryEngine";
import { vfsSyncBridge } from "../../lib/memory/vfsSyncBridge";
import { TRPCError } from "@trpc/server";

export function createMemoryRouter(t: any, procedure: any) {
  return t.router({
    /**
     * Get recursive VFS tree. Auto-bootstraps baseline structure if empty.
     */
    getTree: procedure
      .input(z.object({ rootPath: z.string().optional() }).optional())
      .query(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        await vfsMemoryEngine.bootstrapDefaultVfsTree(clientId);
        return await vfsMemoryEngine.getVfsTree(clientId, input?.rootPath || "/");
      }),

    /**
     * List immediate children of a path with L0 summaries.
     */
    listDirectory: procedure
      .input(z.object({ path: z.string().default("/") }))
      .query(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        return await vfsMemoryEngine.listDirectory(clientId, input.path);
      }),

    /**
     * Read full document node and its relations.
     */
    getNode: procedure
      .input(z.object({ path: z.string() }))
      .query(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        const result = await vfsMemoryEngine.readNode(clientId, input.path);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Memory node at path '${input.path}' not found.`,
          });
        }
        return result;
      }),

    /**
     * Write or update a document/node.
     */
    writeNode: procedure
      .input(
        z.object({
          path: z.string(),
          title: z.string(),
          nodeType: z.enum(["folder", "document", "fact", "web_intel", "asset_profile"]).optional(),
          contentL2: z.string().optional(),
          summaryL0: z.string().optional(),
          metadata: z.record(z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        return await vfsMemoryEngine.writeNode(clientId, input);
      }),

    /**
     * Delete node and all child paths.
     */
    deleteNode: procedure
      .input(z.object({ path: z.string() }))
      .mutation(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        return await vfsMemoryEngine.deleteNode(clientId, input.path);
      }),

    /**
     * Semantic & Hybrid Memory Search across all corporate knowledge.
     */
    search: procedure
      .input(
        z.object({
          query: z.string(),
          pathPrefix: z.string().optional(),
          nodeType: z.string().optional(),
          limit: z.number().min(1).max(50).default(10),
        })
      )
      .query(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        return await vfsMemoryEngine.searchMemory(clientId, input.query, {
          pathPrefix: input.pathPrefix,
          nodeType: input.nodeType,
          limit: input.limit,
        });
      }),

    /**
     * Mem0-style Fact Extractor from conversation or text notes.
     */
    extractFacts: procedure
      .input(
        z.object({
          text: z.string(),
          source: z.string().default("user_input"),
        })
      )
      .mutation(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        return await vfsMemoryEngine.extractAndSaveFacts(clientId, input.text, input.source);
      }),

    /**
     * 1-Click Ingest Regulatory or Cloud Web Intelligence.
     */
    ingestWeb: procedure
      .input(
        z.object({
          url: z.string().url(),
          title: z.string(),
          content: z.string(),
          summary: z.string().optional(),
          frameworks: z.array(z.string()).optional(),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }: any) => {
        const clientId = ctx.user?.clientId || 1;
        return await vfsMemoryEngine.ingestWebIntel(clientId, input);
      }),

    /**
     * Sync all relational app data (policies, controls, vendors, findings) into VFS.
     */
    syncAppData: procedure.mutation(async ({ ctx }: any) => {
      const clientId = ctx.user?.clientId || 1;
      return await vfsSyncBridge.syncAllAppDataToVfs(clientId);
    }),

    /**
     * Re-seed default architecture and policies.
     */
    bootstrapDefaults: procedure.mutation(async ({ ctx }: any) => {
      const clientId = ctx.user?.clientId || 1;
      await vfsMemoryEngine.bootstrapDefaultVfsTree(clientId);
      return { success: true };
    }),

    /**
     * Visual Knowledge Graph data for interactive exploration.
     */
    getKnowledgeGraph: procedure.query(async ({ ctx }: any) => {
      const clientId = ctx.user?.clientId || 1;
      return await vfsMemoryEngine.getKnowledgeGraphData(clientId);
    }),

    /**
     * Live L0/L1 Context Snapshot of the client's memory cortex.
     */
    getCortexSnapshot: procedure.query(async ({ ctx }: any) => {
      const clientId = ctx.user?.clientId || 1;
      return await vfsMemoryEngine.getClientCortexSnapshot(clientId);
    }),
  });
}

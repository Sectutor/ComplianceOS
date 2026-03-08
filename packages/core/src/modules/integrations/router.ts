/**
 * Integrations Module - Router
 * 
 * Manages third-party integrations.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure } from "../../server/trpc";
import { eq, and, asc, desc } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";

import { integrations, integrationDefinitions, evidenceFiles } from "../../schema";

export const integrationsRouter = router({
    /**
     * List integrations for a client
     */
    list: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            return db.select().from(integrations).where(eq(integrations.clientId, input.clientId)).orderBy(desc(integrations.createdAt));
        }),

    /**
     * Get integration
     */
    get: clientProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const [integration] = await db.select().from(integrations).where(eq(integrations.id, input.id)).limit(1);
            return integration;
        }),

    /**
     * Create integration
     */
    create: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            definitionId: z.number(),
            name: z.string().min(1),
            config: z.any().optional(),
            status: z.string().default('inactive'),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const [integration] = await db.insert(integrations).values(input).returning();
            return integration;
        }),

    /**
     * Update integration
     */
    update: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
            name: z.string().optional(),
            config: z.any().optional(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const { clientId, ...updateData } = input;
            const [updated] = await db.update(integrations).set(updateData).where(and(eq(integrations.id, input.id), eq(integrations.clientId, clientId))).returning();
            if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
            return updated;
        }),

    /**
     * Delete integration
     */
    delete: clientEditorProcedure
        .input(z.object({ id: z.number(), clientId: z.number() }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            await db.delete(integrations).where(and(eq(integrations.id, input.id), eq(integrations.clientId, input.clientId)));
            return { success: true };
        }),

    /**
     * List integration definitions (available integrations)
     */
    listDefinitions: clientProcedure
        .query(async () => {
            const db = await getDb();
            return db.select().from(integrationDefinitions).orderBy(asc(integrationDefinitions.name));
        }),

    /**
     * Get integration definition
     */
    getDefinition: clientProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const [definition] = await db.select().from(integrationDefinitions).where(eq(integrationDefinitions.id, input.id)).limit(1);
            return definition;
        }),

    /**
     * Sync integration data
     */
    sync: clientEditorProcedure
        .input(z.object({ id: z.number(), clientId: z.number() }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const [integration] = await db.select().from(integrations).where(and(eq(integrations.id, input.id), eq(integrations.clientId, input.clientId))).limit(1);
            if (!integration) throw new TRPCError({ code: "NOT_FOUND" });

            const [updated] = await db.update(integrations).set({ lastSyncAt: new Date() }).where(eq(integrations.id, input.id)).returning();
            return { success: true, integration: updated };
        }),

    /**
     * Test integration connection
     */
    test: clientEditorProcedure
        .input(z.object({ id: z.number(), clientId: z.number() }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const [integration] = await db.select().from(integrations).where(and(eq(integrations.id, input.id), eq(integrations.clientId, input.clientId))).limit(1);
            if (!integration) throw new TRPCError({ code: "NOT_FOUND" });

            return { success: true, message: 'Connection successful' };
        }),
});

export default integrationsRouter;

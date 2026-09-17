/**
 * Policy Module - Router
 * 
 * This module handles policy management.
 * Extracted from monolithic routers.ts as part of modularization.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure, publicProcedure } from "../../server/trpc";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";
import { logActivity } from "../../lib/audit";

import {
    clientPolicies,
    policyTemplates,
    controlPolicyMappings
} from "../../schema";

export const policyRouter = router({
    // =========================================================================
    // Client Policies
    // =========================================================================

    /**
     * List policies for a client
     */
    list: clientProcedure
        .input(z.object({
            clientId: z.number(),
            status: z.string().optional(),
            category: z.string().optional(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            let query = db.select()
                .from(clientPolicies)
                .where(eq(clientPolicies.clientId, input.clientId));

            return query.orderBy(desc(clientPolicies.updatedAt));
        }),

    /**
     * Get a single policy
     */
    get: clientProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number().optional(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [policy] = await db.select()
                .from(clientPolicies)
                .where(eq(clientPolicies.id, input.id))
                .limit(1);

            if (!policy) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
            }

            return policy;
        }),

    /**
     * Create a new policy
     */
    create: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            title: z.string().min(1),
            content: z.string().optional(),
            category: z.string().optional(),
            status: z.string().default('draft'),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const [policy] = await db.insert(clientPolicies)
                .values({
                    clientId: input.clientId,
                    title: input.title,
                    content: input.content,
                    category: input.category,
                    status: input.status,
                })
                .returning();

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "create",
                entityType: "policy",
                entityId: policy.id,
                details: { title: input.title }
            });

            return policy;
        }),

    /**
     * Update a policy
     */
    update: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
            title: z.string().optional(),
            content: z.string().optional(),
            category: z.string().optional(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const { clientId, ...updateData } = input;

            const [updated] = await db.update(clientPolicies)
                .set({
                    ...updateData,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(clientPolicies.id, input.id),
                    eq(clientPolicies.clientId, input.clientId)
                ))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return updated;
        }),

    /**
     * Delete a policy
     */
    delete: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            await db.delete(clientPolicies)
                .where(and(
                    eq(clientPolicies.id, input.id),
                    eq(clientPolicies.clientId, input.clientId)
                ));

            return { success: true };
        }),

    /**
     * Publish a policy
     */
    publish: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const [updated] = await db.update(clientPolicies)
                .set({
                    status: 'published',
                    publishedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(clientPolicies.id, input.id),
                    eq(clientPolicies.clientId, input.clientId)
                ))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "publish",
                entityType: "policy",
                entityId: updated.id,
                details: { title: updated.title }
            });

            return updated;
        }),

    // =========================================================================
    // Policy Templates
    // =========================================================================

    /**
     * List policy templates
     */
    listTemplates: clientProcedure
        .query(async () => {
            const db = await getDb();

            return db.select()
                .from(policyTemplates)
                .orderBy(asc(policyTemplates.name));
        }),

    /**
     * Get a policy template
     */
    getTemplate: clientProcedure
        .input(z.object({
            id: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [template] = await db.select()
                .from(policyTemplates)
                .where(eq(policyTemplates.id, input.id))
                .limit(1);

            if (!template) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return template;
        }),

    // =========================================================================
    // Statistics
    // =========================================================================

    /**
     * Get policy statistics
     */
    getStats: clientProcedure
        .input(z.object({
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const policies = await db.select()
                .from(clientPolicies)
                .where(eq(clientPolicies.clientId, input.clientId));

            return {
                total: policies.length,
                draft: policies.filter((p: any) => p.status === 'draft').length,
                pendingReview: policies.filter((p: any) => p.status === 'pending_review').length,
                published: policies.filter((p: any) => p.status === 'published').length,
                archived: policies.filter((p: any) => p.status === 'archived').length,
            };
        }),
});

export default policyRouter;

/**
 * Evidence Module - Router
 * 
 * This module handles evidence management.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure } from "../../server/trpc";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";
import { logActivity } from "../../lib/audit";

import {
    evidence,
    evidenceRequests,
    clients
} from "../../schema";

export const evidenceRouter = router({
    // =========================================================================
    // Evidence
    // =========================================================================

    /**
     * List evidence for a client
     */
    list: clientProcedure
        .input(z.object({
            clientId: z.number(),
            controlId: z.number().optional(),
            status: z.string().optional(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            let query = db.select()
                .from(evidence)
                .where(eq(evidence.clientId, input.clientId));

            return query.orderBy(desc(evidence.createdAt));
        }),

    /**
     * Get a single evidence item
     */
    get: clientProcedure
        .input(z.object({
            id: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [item] = await db.select()
                .from(evidence)
                .where(eq(evidence.id, input.id))
                .limit(1);

            if (!item) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Evidence not found" });
            }

            return item;
        }),

    /**
     * Create evidence
     */
    create: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            name: z.string().min(1),
            description: z.string().optional(),
            fileUrl: z.string().optional(),
            fileType: z.string().optional(),
            controlId: z.number().optional(),
            status: z.string().default('pending'),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const [item] = await db.insert(evidence)
                .values({
                    clientId: input.clientId,
                    name: input.name,
                    description: input.description,
                    fileUrl: input.fileUrl,
                    fileType: input.fileType,
                    controlId: input.controlId,
                    status: input.status,
                })
                .returning();

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "create",
                entityType: "evidence",
                entityId: item.id,
                details: { name: input.name }
            });

            return item;
        }),

    /**
     * Update evidence
     */
    update: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            fileUrl: z.string().optional(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            const { clientId, ...updateData } = input;

            const [updated] = await db.update(evidence)
                .set({
                    ...updateData,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(evidence.id, input.id),
                    eq(evidence.clientId, input.clientId)
                ))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return updated;
        }),

    /**
     * Delete evidence
     */
    delete: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            await db.delete(evidence)
                .where(and(
                    eq(evidence.id, input.id),
                    eq(evidence.clientId, input.clientId)
                ));

            return { success: true };
        }),

    // =========================================================================
    // Evidence Requests
    // =========================================================================

    /**
     * List evidence requests
     */
    listRequests: clientProcedure
        .input(z.object({
            clientId: z.number(),
            status: z.string().optional(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            return await db.select()
                .from(evidenceRequests)
                .where(eq(evidenceRequests.clientId, input.clientId))
                .orderBy(desc(evidenceRequests.createdAt));
        }),

    /**
     * Create evidence request
     */
    createRequest: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            title: z.string().min(1),
            description: z.string().optional(),
            dueDate: z.string().optional(),
            assigneeId: z.number().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            const [request] = await db.insert(evidenceRequests)
                .values({
                    clientId: input.clientId,
                    title: input.title,
                    description: input.description,
                    dueDate: input.dueDate ? new Date(input.dueDate) : null,
                    assigneeId: input.assigneeId,
                    status: 'open',
                })
                .returning();

            return request;
        }),

    // =========================================================================
    // Statistics
    // =========================================================================

    /**
     * Get evidence statistics
     */
    getStats: clientProcedure
        .input(z.object({
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const allEvidence = await db.select()
                .from(evidence)
                .where(eq(evidence.clientId, input.clientId));

            const requests = await db.select()
                .from(evidenceRequests)
                .where(eq(evidenceRequests.clientId, input.clientId));

            return {
                evidence: {
                    total: allEvidence.length,
                    approved: allEvidence.filter((e: any) => e.status === 'approved').length,
                    pending: allEvidence.filter((e: any) => e.status === 'pending').length,
                    rejected: allEvidence.filter((e: any) => e.status === 'rejected').length,
                },
                requests: {
                    total: requests.length,
                    open: requests.filter((r: any) => r.status === 'open').length,
                    completed: requests.filter((r: any) => r.status === 'completed').length,
                },
            };
        }),
});

export default evidenceRouter;

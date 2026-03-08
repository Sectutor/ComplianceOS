/**
 * Audit Module - Router
 * 
 * This module handles audit logging.
 */

import { z } from "zod";
import { router, clientProcedure, adminProcedure } from "../../server/trpc";
import { eq, and, desc, asc } from "drizzle-orm";
import { getDb } from "../../db";

import { auditLogs } from "../../schema";

export const auditRouter = router({
    /**
     * List audit logs for a client
     */
    list: clientProcedure
        .input(z.object({
            clientId: z.number(),
            entityType: z.string().optional(),
            action: z.string().optional(),
            userId: z.number().optional(),
            limit: z.number().default(100),
            offset: z.number().default(0),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            // Build conditions array to properly combine multiple filters
            const conditions = [
                eq(auditLogs.clientId, input.clientId)
            ];

            if (input.entityType) {
                conditions.push(eq(auditLogs.entityType, input.entityType));
            }

            if (input.action) {
                conditions.push(eq(auditLogs.action, input.action));
            }

            const query = db.select()
                .from(auditLogs)
                .where(and(...conditions));

            return query.orderBy(desc(auditLogs.createdAt)).limit(input.limit);
        }),

    /**
     * Get audit log by ID
     */
    get: clientProcedure
        .input(z.object({
            id: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [log] = await db.select()
                .from(auditLogs)
                .where(eq(auditLogs.id, input.id))
                .limit(1);

            return log;
        }),

    /**
     * Get audit statistics
     */
    getStats: clientProcedure
        .input(z.object({
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const logs = await db.select()
                .from(auditLogs)
                .where(eq(auditLogs.clientId, input.clientId));

            const actionCounts = logs.reduce((acc: Record<string, number>, log: any) => {
                acc[log.action] = (acc[log.action] || 0) + 1;
                return acc;
            }, {});

            return {
                total: logs.length,
                byAction: actionCounts,
            };
        }),
});

export default auditRouter;

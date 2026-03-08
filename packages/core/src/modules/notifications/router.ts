/**
 * Notifications Module - Router
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure } from "../../server/trpc";
import { eq, desc, and, isNull } from "drizzle-orm";
import { getDb } from "../../db";

export const notificationsRouter = router({
    list: clientProcedure
        .input(z.object({ clientId: z.number(), limit: z.number().default(50) }))
        .query(async ({ input, ctx }: any) => {
            const db = await getDb();
            const { notificationLog } = await import("../../schema");
            return await db.select()
                .from(notificationLog)
                .where(eq(notificationLog.userId, ctx.user.id))
                .orderBy(desc(notificationLog.sentAt))
                .limit(input.limit);
        }),

    getSettings: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const { notificationSettings } = await import("../../schema");

            const settings = await db.select().from(notificationSettings)
                .where(eq(notificationSettings.clientId, input.clientId))
                .limit(1);

            if (settings.length === 0) {
                return {
                    clientId: input.clientId,
                    emailEnabled: true,
                    overdueEnabled: true,
                    upcomingReviewDays: 7,
                    dailyDigestEnabled: false,
                    weeklyDigestEnabled: true,
                    notifyControlReviews: true,
                    notifyPolicyRenewals: true,
                    notifyEvidenceExpiration: true,
                    notifyRiskReviews: true
                };
            }

            return settings[0];
        }),

    updateSettings: clientProcedure
        .input(z.object({
            clientId: z.number(),
            emailEnabled: z.boolean().optional(),
            overdueEnabled: z.boolean().optional(),
            upcomingReviewDays: z.number().optional(),
            dailyDigestEnabled: z.boolean().optional(),
            weeklyDigestEnabled: z.boolean().optional(),
            notifyControlReviews: z.boolean().optional(),
            notifyPolicyRenewals: z.boolean().optional(),
            notifyEvidenceExpiration: z.boolean().optional(),
            notifyRiskReviews: z.boolean().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const { notificationSettings } = await import("../../schema");
            const { clientId, ...updates } = input;

            const existing = await db.select().from(notificationSettings)
                .where(eq(notificationSettings.clientId, clientId))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(notificationSettings).values({
                    clientId,
                    ...updates
                });
            } else {
                await db.update(notificationSettings)
                    .set({ ...updates, updatedAt: new Date() })
                    .where(eq(notificationSettings.clientId, clientId));
            }

            return { success: true };
        }),

    getUnreadCount: clientProcedure
        .query(async ({ ctx }: any) => {
            const db = await getDb();
            const { notificationLog } = await import("../../schema");
            const { sql } = await import("drizzle-orm");
            
            const result = await db.select({
                count: sql<number>`count(*)`
            })
                .from(notificationLog)
                .where(and(
                    eq(notificationLog.userId, ctx.user.id),
                    isNull(notificationLog.readAt)
                ));
            return Number(result[0]?.count || 0);
        }),

    markAsRead: clientProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();
            const { notificationLog } = await import("../../schema");
            await db.update(notificationLog)
                .set({ readAt: new Date() })
                .where(and(
                    eq(notificationLog.id, input.id),
                    eq(notificationLog.userId, ctx.user.id)
                ));
            return { success: true };
        }),

    markAllAsRead: clientProcedure
        .mutation(async ({ ctx }: any) => {
            const db = await getDb();
            const { notificationLog } = await import("../../schema");
            await db.update(notificationLog)
                .set({ readAt: new Date() })
                .where(and(
                    eq(notificationLog.userId, ctx.user.id),
                    isNull(notificationLog.readAt)
                ));
            return { success: true };
        }),
});

export default notificationsRouter;

import { z } from "zod";
import { getDb } from "../../db";
import { workItems, workItemStatusEnum, workItemPriorityEnum, workItemTypeEnum, governanceEvents } from "../../schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const createGovernanceRouter = (t: any, clientProcedure: any, adminProcedure: any) => t.router({
    // List work items with filters
    list: clientProcedure
        .input(z.object({
            clientId: z.number(),
            status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
            type: z.enum(['policy_review', 'control_assessment', 'risk_review', 'vendor_assessment', 'review', 'approval', 'evidence_collection']).optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
        }))
        .query(async ({ input }) => {
            const db = await getDb();

            const conditions = [eq(workItems.clientId, input.clientId)];

            if (input.status) {
                conditions.push(eq(workItems.status, input.status));
            }

            if (input.priority) {
                conditions.push(eq(workItems.priority, input.priority));
            }

            if (input.type) {
                conditions.push(eq(workItems.type, input.type));
            }

            const items = await db.select()
                .from(workItems)
                .where(and(...conditions))
                .orderBy(desc(workItems.createdAt))
                .limit(input.limit)
                .offset(input.offset);

            return items;
        }),

    // Get aggregated stats for the workbench dashboard
    getStats: clientProcedure
        .input(z.any())
        .query(async ({ input }) => {
            const db = await getDb();

            // Safely extract clientId from input
            const clientId = input && typeof input === 'object' && 'clientId' in input
                ? Number(input.clientId)
                : undefined;

            if (!clientId || isNaN(clientId)) {
                return {
                    pending: 0,
                    critical: 0,
                    overdue: 0,
                    healthScore: 100
                };
            }

            // We'll run a few aggregate queries
            // 1. Total pending items
            const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
                .from(workItems)
                .where(and(
                    eq(workItems.clientId, clientId),
                    inArray(workItems.status, ['pending', 'in_progress'])
                ));

            // 2. High/Critical priority pending
            const [criticalCount] = await db.select({ count: sql<number>`count(*)` })
                .from(workItems)
                .where(and(
                    eq(workItems.clientId, clientId),
                    inArray(workItems.status, ['pending', 'in_progress']),
                    inArray(workItems.priority, ['high', 'critical'])
                ));

            // 3. Overdue (dueDate < now AND status != completed AND dueDate IS NOT NULL)
            const [overdueCount] = await db.select({ count: sql<number>`count(*)` })
                .from(workItems)
                .where(and(
                    eq(workItems.clientId, clientId),
                    inArray(workItems.status, ['pending', 'in_progress']),
                    sql`${workItems.dueDate} IS NOT NULL AND ${workItems.dueDate} < NOW()`
                ));

            return {
                pending: Number(pendingCount?.count || 0),
                critical: Number(criticalCount?.count || 0),
                overdue: Number(overdueCount?.count || 0),
                healthScore: Math.max(0, 100 - (Number(overdueCount?.count || 0) * 5) - (Number(criticalCount?.count || 0) * 2))
            };
        }),

    // Create a manual task
    create: clientProcedure
        .input(z.object({
            clientId: z.number(),
            title: z.string().min(1),
            description: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
            type: z.enum(['policy_review', 'control_assessment', 'risk_review', 'vendor_assessment', 'review', 'approval', 'evidence_collection', 'control_implementation']).default('review'),
            entityType: z.enum(["policy", "control", "risk", "bcp_plan", "vendor", "evidence", "task"]).optional(),
            entityId: z.number().optional(),
            dueDate: z.string().optional(), // ISO string
            assignedToUserId: z.number().optional(),
            metadata: z.record(z.any()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();

            const newItem = await db.insert(workItems).values({
                clientId: input.clientId,
                title: input.title,
                description: input.description,
                priority: input.priority,
                type: input.type,
                entityType: input.entityType,
                entityId: input.entityId,
                status: 'pending',
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
                assignedToUserId: input.assignedToUserId,
                createdBy: ctx.user?.id || 1, // Fallback for dev if ctx user missing
                metadata: input.metadata ?? null,
            }).returning();

            return newItem[0];
        }),

    // Update a task
    update: clientProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
            title: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
            priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
            dueDate: z.string().optional(),
            assignedToUserId: z.number().nullable().optional(),
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();

            const existing = await db.select().from(workItems)
                .where(and(eq(workItems.id, input.id), eq(workItems.clientId, input.clientId)));

            if (!existing.length) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Work item not found' });
            }

            const updates: any = { updatedAt: new Date() };

            if (input.title !== undefined) updates.title = input.title;
            if (input.description !== undefined) updates.description = input.description;

            if (input.status) {
                updates.status = input.status;
                if (input.status === 'completed') {
                    updates.completedAt = new Date();
                }
            }

            if (input.dueDate !== undefined) {
                updates.dueDate = input.dueDate ? new Date(input.dueDate) : null;
            }

            if (input.priority) updates.priority = input.priority;

            if (input.assignedToUserId !== undefined) { // Allow setting to null
                updates.assignedToUserId = input.assignedToUserId;
            }

            const updated = await db.update(workItems)
                .set(updates)
                .where(eq(workItems.id, input.id))
                .returning();

            return updated[0];
        }),

    // Get activity trend for the last 30 days
    getActivityTrend: clientProcedure
        .input(z.object({
            clientId: z.number().optional()
        }).optional())
        .query(async ({ input }) => {
            const db = await getDb();
            const days = 30;

            // Generate last 30 days
            const trend: any[] = [];
            for (let i = days; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                trend.push({
                    date: dateStr,
                    created: 0,
                    completed: 0
                });
            }

            // Fetch created counts
            const createdActivities = await db.select({
                date: sql<string>`DATE(${workItems.createdAt})::text`,
                count: sql<number>`count(*)`
            })
                .from(workItems)
                .where(and(
                    eq(workItems.clientId, input.clientId),
                    sql`${workItems.createdAt} > NOW() - INTERVAL '30 days'`
                ))
                .groupBy(sql`DATE(${workItems.createdAt})`);

            // Fetch completed counts
            const completedActivities = await db.select({
                date: sql<string>`DATE(${workItems.completedAt})::text`,
                count: sql<number>`count(*)`
            })
                .from(workItems)
                .where(and(
                    eq(workItems.clientId, input.clientId),
                    sql`${workItems.completedAt} IS NOT NULL`,
                    sql`${workItems.completedAt} > NOW() - INTERVAL '30 days'`
                ))
                .groupBy(sql`DATE(${workItems.completedAt})`);

            // Merge results
            createdActivities.forEach(row => {
                const entry = trend.find(t => t.date === row.date);
                if (entry) entry.created = Number(row.count);
            });

            completedActivities.forEach(row => {
                const entry = trend.find(t => t.date === row.date);
                if (entry) entry.completed = Number(row.count);
            });

            return trend.map(t => ({
                ...t,
                displayDate: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }));
        }),

    // ── Rich Workbench sub-routers ─────────────────────────────────────────
    // Backing tables: work_items (with is_escalated), escalation_rules, governance_events
    queue: t.router({
        list: clientProcedure
            .input(z.object({
                clientId: z.number(),
                filters: z.object({
                    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'escalated']).optional(),
                    type: z.enum(['policy_review', 'control_assessment', 'risk_review', 'vendor_assessment', 'review', 'approval', 'evidence_collection', 'raci_assignment', 'risk_treatment', 'bcp_approval', 'control_implementation']).optional(),
                    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
                    assignedToMe: z.boolean().default(false),
                }).optional(),
            }))
            .query(async ({ input }) => {
                const db = await getDb();
                const conditions: any[] = [eq(workItems.clientId, input.clientId)];

                const f = input.filters;
                if (f?.status) {
                    if (f.status === 'escalated') {
                        conditions.push(eq(workItems.isEscalated, true));
                    } else {
                        conditions.push(eq(workItems.status, f.status));
                    }
                }
                if (f?.type) conditions.push(eq(workItems.type, f.type));
                if (f?.priority) conditions.push(eq(workItems.priority, f.priority));

                // "Assigned to me" is applied post-query when ctx user is known;
                // unfiltered for now so the filter toggle doesn't silently hide rows.
                const items = await db.select()
                    .from(workItems)
                    .where(and(...conditions))
                    .orderBy(desc(workItems.createdAt))
                    .limit(100);

                return { items };
            }),

        stats: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }) => {
                const db = await getDb();
                const items = await db.select({
                    status: workItems.status,
                    priority: workItems.priority,
                    isEscalated: workItems.isEscalated,
                    dueDate: workItems.dueDate,
                })
                    .from(workItems)
                    .where(eq(workItems.clientId, input.clientId));

                const now = new Date();
                const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const byStatus: Record<string, number> = {};
                let overdue = 0, upcoming = 0, escalated = 0;

                for (const item of items) {
                    byStatus[item.status || 'pending'] = (byStatus[item.status || 'pending'] || 0) + 1;
                    if (item.isEscalated) escalated++;
                    if (item.dueDate && item.status !== 'completed') {
                        const due = new Date(item.dueDate);
                        if (due < now) overdue++;
                        else if (due <= in7Days) upcoming++;
                    }
                }

                return { byStatus, overdue, upcoming, escalated };
            }),
    }),

    escalations: t.router({
        list: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }) => {
                const db = await getDb();
                return db.select()
                    .from(workItems)
                    .where(and(
                        eq(workItems.clientId, input.clientId),
                        eq(workItems.isEscalated, true)
                    ))
                    .orderBy(desc(workItems.escalatedAt))
                    .limit(50);
            }),

        respond: clientProcedure
            .input(z.object({
                clientId: z.number(),
                workItemId: z.number(),
                action: z.enum(['acknowledge', 'resolve']),
            }))
            .mutation(async ({ input, ctx }) => {
                const db = await getDb();
                const [existing] = await db.select()
                    .from(workItems)
                    .where(and(
                        eq(workItems.id, input.workItemId),
                        eq(workItems.clientId, input.clientId)
                    ))
                    .limit(1);

                if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Work item not found' });

                const updates: any = { updatedAt: new Date() };
                if (input.action === 'resolve') {
                    updates.isEscalated = false;
                    updates.status = 'in_progress';
                } else {
                    updates.metadata = { ...(existing.metadata || {}), acknowledgedAt: new Date().toISOString() };
                }

                const [updated] = await db.update(workItems)
                    .set(updates)
                    .where(eq(workItems.id, input.workItemId))
                    .returning();

                // Record the governance event for the timeline
                await db.insert(governanceEvents).values({
                    clientId: input.clientId,
                    entityType: 'task',
                    entityId: updated.id,
                    entityName: updated.title,
                    eventType: input.action === 'resolve' ? 'escalation_resolved' : 'escalation_acknowledged',
                    toState: String(updated.status),
                    actorUserId: ctx.user?.id ?? null,
                    createdAt: new Date(),
                } as any);

                return { success: true, id: updated.id, isEscalated: updated.isEscalated };
            }),
    }),

    events: t.router({
        list: clientProcedure
            .input(z.object({
                clientId: z.number(),
                pagination: z.object({
                    limit: z.number().min(1).max(200).default(50),
                    offset: z.number().min(0).default(0),
                }).optional(),
            }))
            .query(async ({ input }) => {
                const db = await getDb();
                const limit = input.pagination?.limit ?? 50;
                const offset = input.pagination?.offset ?? 0;

                const events = await db.select()
                    .from(governanceEvents)
                    .where(eq(governanceEvents.clientId, input.clientId))
                    .orderBy(desc(governanceEvents.createdAt))
                    .limit(limit)
                    .offset(offset);

                return { events };
            }),
    }),
});

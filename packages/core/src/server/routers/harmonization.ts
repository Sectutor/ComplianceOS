
import { z } from "zod";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, and, inArray, desc, ilike, or } from "drizzle-orm";

export const createHarmonizationRouter = (t: any, protectedProcedure: any) => {
    return t.router({
        // Get mappings for a specific framework (e.g., what maps TO ISO 27001)
        getMappings: protectedProcedure.input(z.object({
            frameworkId: z.number(),
            direction: z.enum(['incoming', 'outgoing']).default('incoming')
        })).query(async ({ input }: any) => {
            const db = await getDb();

            let whereClause;
            if (input.direction === 'incoming') {
                // Show me things that convert INTO this framework
                whereClause = eq(schema.frameworkMappings.targetFrameworkId, input.frameworkId);
            } else {
                // Show me things this framework converts TO
                whereClause = eq(schema.frameworkMappings.sourceFrameworkId, input.frameworkId);
            }

            const mappings = await db.select().from(schema.frameworkMappings)
                .where(whereClause);

            return mappings;
        }),

        // The Magic: Scans a plan and finds efficiency gains
        analyzePlanHarmonization: protectedProcedure.input(z.object({
            planId: z.number()
        })).mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            // 1. Get current plan details
            const [plan] = await db.select().from(schema.implementationPlans)
                .where(eq(schema.implementationPlans.id, input.planId))
                .limit(1);

            if (!plan || !plan.frameworkId) throw new Error("Plan or Framework not found");

            // 2. Find ALL other separate plans for this client that are "Completed" or "In Progress"
            // We want to find controls implemented elsewhere
            const otherPlans = await db.select().from(schema.implementationPlans)
                .where(and(
                    eq(schema.implementationPlans.clientId, plan.clientId),
                    // ne(schema.implementationPlans.id, plan.id) // In Drizzle `ne` is not imported, use raw sql or filter in JS
                ));

            const relevantOtherPlans = otherPlans.filter(p => p.id !== plan.id && p.status !== 'not_started');

            if (relevantOtherPlans.length === 0) {
                return {
                    savingsPercentage: 0,
                    opportunities: []
                };
            }

            const otherPlanIds = relevantOtherPlans.map(p => p.id);

            // 3. Find completed tasks in those other plans
            const completedTasks = await db.select().from(schema.implementationTasks)
                .where(and(
                    inArray(schema.implementationTasks.implementationPlanId, otherPlanIds),
                    eq(schema.implementationTasks.status, 'done')
                ));

            // 4. Trace completed tasks -> controls -> mappings -> current plan requirements
            // This is complex because we need to bridge: Task -> Control ID (string) -> Control (int) -> Mapping -> Target Control (int) -> Target Control ID (string) -> Current Plan Task

            const opportunities: any[] = [];
            let totalSavedHours = 0;
            const currentPlanTotalHours = plan.estimatedHours || 100; // Fallback

            // Get all controls to resolve string IDs to Int IDs
            // optimize: fetch only relevant controls? For now fetch all is safer or use where inArray
            const allControls = await db.select().from(schema.controls);
            const controlsMap = new Map(allControls.map(c => [c.controlId, c]));
            const controlsIdMap = new Map(allControls.map(c => [c.id, c]));

            // Get mappings
            const mappings = await db.select().from(schema.controlMappings);

            // Get tasks in CURRENT plan to recommend skipping
            const currentPlanTasks = await db.select().from(schema.implementationTasks)
                .where(eq(schema.implementationTasks.implementationPlanId, plan.id));

            for (const otherTask of completedTasks) {
                if (!otherTask.controlId) continue;

                const sourceControl = controlsMap.get(otherTask.controlId);
                if (!sourceControl) continue;

                // Find what this maps TO (outgoing)
                const relevantMappings = mappings.filter(m => m.sourceControlId === sourceControl.id);

                for (const map of relevantMappings) {
                    const targetControl = controlsIdMap.get(map.targetControlId);
                    if (!targetControl) continue;

                    // Does the current plan have a task for this target control?
                    const matchingCurrentTask = currentPlanTasks.find(t => t.controlId === targetControl.controlId && t.status !== 'done');

                    if (matchingCurrentTask) {
                        // Found an opportunity!
                        if (!opportunities.find(o => o.id === matchingCurrentTask.id)) {
                            opportunities.push({
                                id: matchingCurrentTask.id,
                                title: matchingCurrentTask.title,
                                source: `Implemented in ${relevantOtherPlans.find(p => p.id === otherTask.implementationPlanId)?.title || 'Other Plan'}`,
                                confidence: map.confidence === 'ai_high' ? 'High' : 'Medium',
                                savedHours: matchingCurrentTask.estimatedHours || 0
                            });
                            totalSavedHours += (matchingCurrentTask.estimatedHours || 0);
                        }
                    }
                }
            }

            // Heuristic fallbacks for Demo if no exact mappings found
            // If the titles are very similar (e.g. "Access Control Policy"), exact match
            for (const otherTask of completedTasks) {
                const matchingCurrentTask = currentPlanTasks.find(t =>
                    t.title === otherTask.title &&
                    t.status !== 'done' &&
                    !opportunities.find(o => o.id === t.id)
                );

                if (matchingCurrentTask) {
                    opportunities.push({
                        id: matchingCurrentTask.id,
                        title: matchingCurrentTask.title,
                        source: `Direct Match in ${relevantOtherPlans.find(p => p.id === otherTask.implementationPlanId)?.title || 'Other Plan'}`,
                        confidence: 'High',
                        savedHours: matchingCurrentTask.estimatedHours || 0
                    });
                    totalSavedHours += (matchingCurrentTask.estimatedHours || 0);
                }
            }

            const savingsPercentage = currentPlanTotalHours > 0
                ? Math.round((totalSavedHours / currentPlanTotalHours) * 100)
                : 0;

            return {
                savingsPercentage,
                opportunities
            };
        }),

        listCommonControls: protectedProcedure
            .query(async () => {
                const db = await getDb();
                return db.select().from(schema.commonControls).orderBy(desc(schema.commonControls.updatedAt));
            }),

        createCommonControl: protectedProcedure
            .input(z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                domain: z.string().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const [created] = await db.insert(schema.commonControls).values({
                    name: input.name,
                    description: input.description,
                    domain: input.domain,
                    createdById: ctx.user?.id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any).returning();
                return created;
            }),

        updateCommonControl: protectedProcedure
            .input(z.object({
                id: z.number(),
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                domain: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const { id, ...rest } = input;
                const updateData: any = { updatedAt: new Date() };
                for (const [k, v] of Object.entries(rest)) {
                    if (v !== undefined) updateData[k] = v;
                }
                const [updated] = await db.update(schema.commonControls)
                    .set(updateData)
                    .where(eq(schema.commonControls.id, id))
                    .returning();
                return updated;
            }),

        deleteCommonControl: protectedProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.delete(schema.commonControls).where(eq(schema.commonControls.id, input.id));
                return { success: true };
            }),

        listRequirements: protectedProcedure
            .input(z.object({
                frameworkId: z.number(),
                search: z.string().optional(),
                limit: z.number().min(1).max(500).optional().default(200)
            }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const search = input.search?.trim();
                const whereClause = search
                    ? and(
                        eq(schema.frameworkRequirements.frameworkId, input.frameworkId),
                        or(
                            ilike(schema.frameworkRequirements.identifier, `%${search}%`),
                            ilike(schema.frameworkRequirements.title, `%${search}%`)
                        )
                    )
                    : eq(schema.frameworkRequirements.frameworkId, input.frameworkId);

                return db.select()
                    .from(schema.frameworkRequirements)
                    .where(whereClause)
                    .orderBy(desc(schema.frameworkRequirements.updatedAt))
                    .limit(input.limit);
            }),

        listRequirementMappings: protectedProcedure
            .input(z.object({
                sourceFrameworkId: z.number(),
                targetFrameworkId: z.number()
            }))
            .query(async ({ input }: any) => {
                const db = await getDb();

                const mappings = await db.select()
                    .from(schema.frameworkMappings)
                    .where(and(
                        eq(schema.frameworkMappings.sourceFrameworkId, input.sourceFrameworkId),
                        eq(schema.frameworkMappings.targetFrameworkId, input.targetFrameworkId)
                    ))
                    .orderBy(desc(schema.frameworkMappings.createdAt));

                const sourceIds = Array.from(new Set(mappings.map(m => m.sourceRequirementId).filter(Boolean))) as number[];
                const targetIds = Array.from(new Set(mappings.map(m => m.targetRequirementId).filter(Boolean))) as number[];
                const commonIds = Array.from(new Set(mappings.map(m => m.commonControlId).filter(Boolean))) as number[];

                const [sourceReqs, targetReqs, commonControls] = await Promise.all([
                    sourceIds.length
                        ? db.select().from(schema.frameworkRequirements).where(inArray(schema.frameworkRequirements.id, sourceIds))
                        : Promise.resolve([]),
                    targetIds.length
                        ? db.select().from(schema.frameworkRequirements).where(inArray(schema.frameworkRequirements.id, targetIds))
                        : Promise.resolve([]),
                    commonIds.length
                        ? db.select().from(schema.commonControls).where(inArray(schema.commonControls.id, commonIds))
                        : Promise.resolve([])
                ]);

                const sourceMap = new Map(sourceReqs.map(r => [r.id, r]));
                const targetMap = new Map(targetReqs.map(r => [r.id, r]));
                const commonMap = new Map(commonControls.map(c => [c.id, c]));

                return mappings.map(m => ({
                    ...m,
                    sourceRequirement: m.sourceRequirementId ? sourceMap.get(m.sourceRequirementId) : null,
                    targetRequirement: m.targetRequirementId ? targetMap.get(m.targetRequirementId) : null,
                    commonControl: m.commonControlId ? commonMap.get(m.commonControlId) : null
                }));
            }),

        upsertRequirementMapping: protectedProcedure
            .input(z.object({
                sourceFrameworkId: z.number(),
                sourceRequirementId: z.number(),
                targetFrameworkId: z.number(),
                targetRequirementId: z.number(),
                strength: z.enum(['exact', 'subset', 'superset', 'partial', 'related']).optional().default('related'),
                justification: z.string().optional(),
                commonControlId: z.number().nullable().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();

                const existing = await db.select()
                    .from(schema.frameworkMappings)
                    .where(and(
                        eq(schema.frameworkMappings.sourceFrameworkId, input.sourceFrameworkId),
                        eq(schema.frameworkMappings.sourceRequirementId, input.sourceRequirementId),
                        eq(schema.frameworkMappings.targetFrameworkId, input.targetFrameworkId),
                        eq(schema.frameworkMappings.targetRequirementId, input.targetRequirementId)
                    ))
                    .limit(1);

                if (existing.length > 0) {
                    const [updated] = await db.update(schema.frameworkMappings)
                        .set({
                            strength: input.strength,
                            justification: input.justification,
                            commonControlId: input.commonControlId ?? null
                        } as any)
                        .where(eq(schema.frameworkMappings.id, existing[0].id))
                        .returning();
                    return updated;
                }

                const [created] = await db.insert(schema.frameworkMappings).values({
                    sourceFrameworkId: input.sourceFrameworkId,
                    sourceRequirementId: input.sourceRequirementId,
                    targetFrameworkId: input.targetFrameworkId,
                    targetRequirementId: input.targetRequirementId,
                    strength: input.strength,
                    justification: input.justification,
                    commonControlId: input.commonControlId ?? null,
                    createdById: ctx.user?.id,
                    createdAt: new Date()
                } as any).returning();
                return created;
            }),

        deleteRequirementMapping: protectedProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.delete(schema.frameworkMappings).where(eq(schema.frameworkMappings.id, input.id));
                return { success: true };
            })
    });
};

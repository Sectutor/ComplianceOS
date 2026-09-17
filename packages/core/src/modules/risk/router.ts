/**
 * Risk Module - Router
 * 
 * This module handles risk management, scenarios, and treatments.
 * Extracted from monolithic routers.ts as part of modularization.
 * 
 * NOTE: This is a foundational module. The full implementation should be
 * migrated from server/routers/risks.ts progressively.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure, protectedProcedure } from "../../server/trpc";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";
import { logActivity } from "../../lib/audit";

// Import schema from main schema (to be split in Phase 4)
import {
    clients,
    riskScenarios,
    riskTreatments,
    riskAssessments,
    riskPolicyMappings,
    treatmentControls,
    threats,
    vulnerabilities
} from "../../schema";

export const riskRouter = router({
    // =========================================================================
    // Risk Scenarios
    // =========================================================================

    /**
     * List risk scenarios for a client
     */
    listScenarios: clientProcedure
        .input(z.object({
            clientId: z.number(),
            status: z.string().optional(),
            category: z.string().optional(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            let query = db.select()
                .from(riskScenarios)
                .where(eq(riskScenarios.clientId, input.clientId));

            return query.orderBy(desc(riskScenarios.updatedAt));
        }),

    /**
     * Get a single risk scenario
     */
    getScenario: clientProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [scenario] = await db.select()
                .from(riskScenarios)
                .where(and(
                    eq(riskScenarios.id, input.id),
                    eq(riskScenarios.clientId, input.clientId)
                ))
                .limit(1);

            if (!scenario) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Risk scenario not found" });
            }

            return scenario;
        }),

    /**
     * Create a new risk scenario
     */
    createScenario: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            title: z.string().min(1),
            description: z.string().optional(),
            category: z.string().optional(),
            inherentRisk: z.number().optional(),
            residualRisk: z.number().optional(),
            status: z.string().default('identified'),
            threatIds: z.array(z.number()).optional(),
            vulnerabilityIds: z.array(z.number()).optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const [scenario] = await db.insert(riskScenarios)
                .values({
                    clientId: input.clientId,
                    title: input.title,
                    description: input.description,
                    category: input.category,
                    inherentRisk: input.inherentRisk,
                    residualRisk: input.residualRisk,
                    status: input.status,
                })
                .returning();

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "create",
                entityType: "risk_scenario",
                entityId: scenario.id,
                details: { title: input.title }
            });

            return scenario;
        }),

    /**
     * Update a risk scenario
     */
    updateScenario: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
            title: z.string().optional(),
            description: z.string().optional(),
            category: z.string().optional(),
            inherentRisk: z.number().optional(),
            residualRisk: z.number().optional(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const [updated] = await db.update(riskScenarios)
                .set({
                    ...input,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(riskScenarios.id, input.id),
                    eq(riskScenarios.clientId, input.clientId)
                ))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return updated;
        }),

    /**
     * Delete a risk scenario
     */
    deleteScenario: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            // Delete associated treatments first
            await db.delete(riskTreatments)
                .where(eq(riskTreatments.scenarioId, input.id));

            await db.delete(riskScenarios)
                .where(and(
                    eq(riskScenarios.id, input.id),
                    eq(riskScenarios.clientId, input.clientId)
                ));

            return { success: true };
        }),

    // =========================================================================
    // Risk Treatments
    // =========================================================================

    /**
     * List treatments for a risk scenario
     */
    listTreatments: clientProcedure
        .input(z.object({
            scenarioId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            return await db.select()
                .from(riskTreatments)
                .where(eq(riskTreatments.scenarioId, input.scenarioId));
        }),

    /**
     * Create a risk treatment
     */
    createTreatment: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            scenarioId: z.number(),
            title: z.string().min(1),
            description: z.string().optional(),
            status: z.string().default('planned'),
            priority: z.string().optional(),
            dueDate: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const [treatment] = await db.insert(riskTreatments)
                .values({
                    clientId: input.clientId,
                    scenarioId: input.scenarioId,
                    title: input.title,
                    description: input.description,
                    status: input.status,
                    priority: input.priority,
                    dueDate: input.dueDate ? new Date(input.dueDate) : null,
                })
                .returning();

            return treatment;
        }),

    /**
     * Update a risk treatment
     */
    updateTreatment: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            title: z.string().optional(),
            description: z.string().optional(),
            status: z.string().optional(),
            priority: z.string().optional(),
            dueDate: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            const [updated] = await db.update(riskTreatments)
                .set({
                    ...input,
                    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
                    updatedAt: new Date(),
                })
                .where(eq(riskTreatments.id, input.id))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return updated;
        }),

    // =========================================================================
    // Risk Statistics & Dashboard
    // =========================================================================

    /**
     * Get risk statistics for a client
     */
    getStats: clientProcedure
        .input(z.object({
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            // Get all scenarios
            const scenarios = await db.select()
                .from(riskScenarios)
                .where(eq(riskScenarios.clientId, input.clientId));

            // Calculate stats
            const stats = {
                total: scenarios.length,
                identified: scenarios.filter((s: any) => s.status === 'identified').length,
                mitigated: scenarios.filter((s: any) => s.status === 'mitigated').length,
                accepted: scenarios.filter((s: any) => s.status === 'accepted').length,
                transferred: scenarios.filter((s: any) => s.status === 'transferred').length,
            };

            // Calculate average risk scores
            const withScores = scenarios.filter((s: any) => s.residualRisk !== null);
            const avgResidualRisk = withScores.length > 0
                ? withScores.reduce((sum: number, s: any) => sum + (s.residualRisk || 0), 0) / withScores.length
                : 0;

            return {
                ...stats,
                avgResidualRisk: Math.round(avgResidualRisk),
                lastUpdated: new Date(),
            };
        }),

    // =========================================================================
    // Threats & Vulnerabilities (references)
    // =========================================================================

    /**
     * List threats
     */
    listThreats: clientProcedure
        .input(z.object({
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            return await db.select()
                .from(threats)
                .where(eq(threats.clientId, input.clientId));
        }),

    /**
     * List vulnerabilities
     */
    listVulnerabilities: clientProcedure
        .input(z.object({
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            return await db.select()
                .from(vulnerabilities)
                .where(eq(vulnerabilities.clientId, input.clientId));
        }),
});

export default riskRouter;

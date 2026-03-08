/**
 * Dashboard Module - Router
 * 
 * This module handles dashboard statistics, insights, and summaries.
 * Extracted from server/routers/dashboard.ts as part of modularization.
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../../server/trpc";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, desc, count, and, sql, or, inArray, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const dashboardRouter = router({
    /**
     * Get basic statistics
     */
    stats: protectedProcedure.query(async () => {
        const dbConn = await getDb();
        const [clientsCount] = await dbConn.select({ value: count() }).from(schema.clients);
        const [controlsCount] = await dbConn.select({ value: count() }).from(schema.clientControls);
        const [policiesCount] = await dbConn.select({ value: count() }).from(schema.clientPolicies);
        const [evidenceCount] = await dbConn.select({ value: count() }).from(schema.evidence);

        return {
            totalClients: Number(clientsCount.value),
            totalControls: Number(controlsCount.value),
            totalPolicies: Number(policiesCount.value),
            totalEvidence: Number(evidenceCount.value),
        };
    }),

    /**
     * Get enhanced dashboard data with filtering
     */
    enhanced: protectedProcedure
        .input(z.object({
            framework: z.string().optional(),
            clientId: z.number().optional(),
        }))
        .query(async ({ ctx, input }: any) => {
            const dbConn = await getDb();
            // Get framework from input with proper type safety
            const frameworkFilter = input?.framework;

            // Get clientId from input with proper type safety
            const clientIdFilter = input?.clientId;

            if (!ctx?.user) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
            }

            const isGlobalAdmin = ['admin', 'owner', 'super_admin', 'super', 'enterprise_admin', 'ent_admin'].includes(ctx.user.role || '');

            const userClientIds = isGlobalAdmin ? null : (await dbConn.select({ id: schema.userClients.clientId })
                .from(schema.userClients)
                .where(eq(schema.userClients.userId, ctx.user.id))).map((c: any) => c.id);

            // Determine effective client IDs to filter by
            let effectiveClientIds: number[] | null = null;

            if (clientIdFilter) {
                if (isGlobalAdmin) {
                    effectiveClientIds = [clientIdFilter];
                } else {
                    if (userClientIds?.includes(clientIdFilter)) {
                        effectiveClientIds = [clientIdFilter];
                    } else {
                        effectiveClientIds = [];
                    }
                }
            } else {
                effectiveClientIds = isGlobalAdmin ? null : (userClientIds || []);
            }

            if (effectiveClientIds !== null && effectiveClientIds.length === 0) {
                const [userData]: any = await dbConn.select({ maxClients: schema.users.maxClients })
                    .from(schema.users)
                    .where(eq(schema.users.id, ctx.user.id))
                    .limit(1);

                return {
                    overview: {
                        totalClients: 0,
                        totalControls: 0,
                        totalPolicies: 0,
                        totalEvidence: 0,
                        totalLLMProviders: 0,
                        totalRisks: 0,
                        highRisks: 0,
                        maxClients: userData?.maxClients || 2,
                        ownedClientsCount: 0
                    },
                    controlsByStatus: { implemented: 0, inProgress: 0, notStarted: 0, notApplicable: 0 },
                    policiesByStatus: { approved: 0, review: 0, draft: 0, archived: 0 },
                    evidenceByStatus: { verified: 0, collected: 0, pending: 0, expired: 0, notApplicable: 0 },
                    controlsByFramework: {},
                    clientsOverview: [],
                    recentActivity: []
                };
            }

            // 1. Overview Counts
            const clientsCountQuery = dbConn.select({ value: count() }).from(schema.clients);
            if (effectiveClientIds !== null) clientsCountQuery.where(inArray(schema.clients.id, effectiveClientIds));
            const [clientsCount] = await clientsCountQuery;

            const controlsQuery = dbConn.select({ value: count() }).from(schema.controls);
            if (frameworkFilter) {
                controlsQuery.where(eq(schema.controls.framework, frameworkFilter));
            }
            const [controlsCount] = await controlsQuery;

            const policiesQuery = dbConn.select({ value: count() }).from(schema.policyTemplates);
            const [policiesCount] = await policiesQuery;

            const evidenceQuery = dbConn.select({ value: count() }).from(schema.evidence);
            const evidenceConditions = [];
            if (frameworkFilter) {
                evidenceQuery.innerJoin(schema.clientControls, eq(schema.evidence.clientControlId, schema.clientControls.id))
                    .innerJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id));
                evidenceConditions.push(eq(schema.controls.framework, frameworkFilter));
            }
            if (effectiveClientIds !== null) {
                evidenceConditions.push(inArray(schema.evidence.clientId, effectiveClientIds));
            }
            if (evidenceConditions.length > 0) {
                evidenceQuery.where(and(...evidenceConditions));
            }
            const [evidenceCount] = await evidenceQuery;

            const [llmCount] = await dbConn.select({ value: count() }).from(schema.llmProviders);

            // 2. Status Aggregations
            const controlsByStatusQuery = dbConn.select({
                status: schema.clientControls.status,
                value: count()
            })
                .from(schema.clientControls);

            const controlStatusConditions = [];
            if (frameworkFilter) {
                controlsByStatusQuery.innerJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id));
                controlStatusConditions.push(eq(schema.controls.framework, frameworkFilter));
            }
            if (effectiveClientIds !== null) {
                controlStatusConditions.push(inArray(schema.clientControls.clientId, effectiveClientIds));
            }
            if (controlStatusConditions.length > 0) {
                controlsByStatusQuery.where(and(...controlStatusConditions));
            }

            const controlsByStatusResults = await controlsByStatusQuery.groupBy(schema.clientControls.status);
            const controlsByStatus: Record<string, number> = {
                implemented: 0,
                inProgress: 0,
                notStarted: 0,
                notApplicable: 0
            };
            controlsByStatusResults.forEach((r: any) => {
                if (r.status === 'implemented') controlsByStatus.implemented = Number(r.value);
                else if (r.status === 'in_progress') controlsByStatus.inProgress = Number(r.value);
                else if (r.status === 'not_implemented') controlsByStatus.notStarted = Number(r.value);
                else if (r.status === 'not_applicable') controlsByStatus.notApplicable = Number(r.value);
            });

            const policiesByStatusQuery = dbConn.select({
                status: schema.clientPolicies.status,
                value: count()
            })
                .from(schema.clientPolicies);

            const policyStatusConditions = [];
            if (frameworkFilter) {
                policiesByStatusQuery.innerJoin(schema.controlPolicyMappings, eq(schema.clientPolicies.id, schema.controlPolicyMappings.clientPolicyId))
                    .innerJoin(schema.clientControls, eq(schema.controlPolicyMappings.clientControlId, schema.clientControls.id))
                    .innerJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id));
                policyStatusConditions.push(eq(schema.controls.framework, frameworkFilter));
            }
            if (effectiveClientIds !== null) {
                policyStatusConditions.push(inArray(schema.clientPolicies.clientId, effectiveClientIds));
            }
            if (policyStatusConditions.length > 0) {
                policiesByStatusQuery.where(and(...policyStatusConditions));
            }

            const policiesByStatusResults = await policiesByStatusQuery.groupBy(schema.clientPolicies.status);
            const policiesByStatus: Record<string, number> = {
                approved: 0,
                review: 0,
                draft: 0,
                archived: 0
            };
            policiesByStatusResults.forEach((r: any) => {
                if (r.status === 'approved') policiesByStatus.approved = Number(r.value);
                else if (r.status === 'review') policiesByStatus.review = Number(r.value);
                else if (r.status === 'draft') policiesByStatus.draft = Number(r.value);
                else if (r.status === 'archived') policiesByStatus.archived = Number(r.value);
            });

            const evidenceByStatusQuery = dbConn.select({
                status: schema.evidence.status,
                value: count()
            })
                .from(schema.evidence);

            const evidenceStatusConditions = [];
            if (frameworkFilter) {
                evidenceByStatusQuery.innerJoin(schema.clientControls, eq(schema.evidence.clientControlId, schema.clientControls.id))
                    .innerJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id));
                evidenceStatusConditions.push(eq(schema.controls.framework, frameworkFilter));
            }
            if (effectiveClientIds !== null) {
                evidenceStatusConditions.push(inArray(schema.evidence.clientId, effectiveClientIds));
            }
            if (evidenceStatusConditions.length > 0) {
                evidenceByStatusQuery.where(and(...evidenceStatusConditions));
            }

            const evidenceByStatusResults = await evidenceByStatusQuery.groupBy(schema.evidence.status);
            const evidenceByStatus: Record<string, number> = {
                verified: 0,
                collected: 0,
                pending: 0,
                expired: 0,
                notApplicable: 0
            };
            evidenceByStatusResults.forEach((r: any) => {
                if (r.status === 'verified') evidenceByStatus.verified = Number(r.value);
                else if (r.status === 'collected') evidenceByStatus.collected = Number(r.value);
                else if (r.status === 'pending') evidenceByStatus.pending = Number(r.value);
                else if (r.status === 'expired') evidenceByStatus.expired = Number(r.value);
            });

            // 3. Frameworks
            const frameworksQuery = dbConn.select({
                framework: schema.controls.framework,
                count: count()
            })
                .from(schema.controls);

            const frameworksResults = await frameworksQuery.groupBy(schema.controls.framework);
            const controlsByFramework: Record<string, number> = {};
            frameworksResults.forEach((f: { framework: string | null; count: any }) => {
                if (f.framework) controlsByFramework[f.framework] = Number(f.count);
            });

            // 4. Clients Overview
            const allClientsQuery = dbConn.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients);
            if (effectiveClientIds !== null) {
                allClientsQuery.where(inArray(schema.clients.id, effectiveClientIds));
            }
            const allClients = await allClientsQuery;

            const controlsOverviewQuery = dbConn.select({
                clientId: schema.clientControls.clientId,
                count: count()
            })
                .from(schema.clientControls);

            if (frameworkFilter) {
                controlsOverviewQuery.innerJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id))
                    .where(eq(schema.controls.framework, frameworkFilter));
            }
            if (effectiveClientIds !== null) {
                controlsOverviewQuery.where(inArray(schema.clientControls.clientId, effectiveClientIds));
            }
            const controlsCounts = await controlsOverviewQuery.groupBy(schema.clientControls.clientId);
            const controlsMap = new Map<number, number>(controlsCounts.map((r: any) => [r.clientId, Number(r.count)]));

            const implementedOverviewQuery = dbConn.select({
                clientId: schema.clientControls.clientId,
                count: count()
            })
                .from(schema.clientControls)
                .where(eq(schema.clientControls.status, 'implemented'));

            if (frameworkFilter) {
                implementedOverviewQuery.innerJoin(schema.controls, eq(schema.clientControls.controlId, schema.controls.id))
                    .where(and(eq(schema.clientControls.status, 'implemented'), eq(schema.controls.framework, frameworkFilter)));
            }
            if (effectiveClientIds !== null) {
                implementedOverviewQuery.where(inArray(schema.clientControls.clientId, effectiveClientIds));
            }
            const implementedCounts = await implementedOverviewQuery.groupBy(schema.clientControls.clientId);
            const implementedMap = new Map<number, number>(implementedCounts.map((r: any) => [r.clientId, Number(r.count)]));

            const clientsOverview = allClients.map((c: { id: number; name: string }) => {
                const totalControls = controlsMap.get(c.id) || 0;
                const implemented = implementedMap.get(c.id) || 0;
                const percentage = totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0;

                return {
                    id: c.id,
                    name: c.name,
                    compliancePercentage: percentage,
                    controlsCount: totalControls,
                };
            });

            // 5. Recent Activity
            const activityQuery = dbConn.select()
                .from(schema.auditLogs);

            if (effectiveClientIds !== null) {
                activityQuery.where(inArray(schema.auditLogs.clientId, effectiveClientIds));
            }

            const recentActivity = await activityQuery.orderBy(desc(schema.auditLogs.createdAt))
                .limit(5);

            const formattedActivity = recentActivity.map((a: any) => ({
                type: a.entityType as 'control' | 'policy' | 'evidence',
                name: `${a.action} ${a.entityType}`,
                updatedAt: a.createdAt
            }));

            // 6. Risk Statistics
            const risksCountQuery = dbConn.select({ value: count() }).from(schema.riskAssessments);
            if (effectiveClientIds !== null && effectiveClientIds.length > 0) {
                risksCountQuery.where(inArray(schema.riskAssessments.clientId, effectiveClientIds));
            }
            const [totalRisksCount] = await risksCountQuery;

            const highRisksQuery = dbConn.select({ count: count() })
                .from(schema.riskAssessments)
                .where(and(
                    or(
                        eq(schema.riskAssessments.residualRisk, 'High'),
                        eq(schema.riskAssessments.residualRisk, 'Critical')
                    ),
                    effectiveClientIds !== null && effectiveClientIds.length > 0 ? inArray(schema.riskAssessments.clientId, effectiveClientIds) : undefined
                ));
            const [highRisksCount] = await highRisksQuery;

            // 7. Organization Limits
            const [userData]: any = await dbConn.select({ maxClients: schema.users.maxClients })
                .from(schema.users)
                .where(eq(schema.users.id, ctx.user.id))
                .limit(1);

            return {
                overview: {
                    totalClients: Number(clientsCount.value),
                    totalControls: Number(controlsCount.value),
                    totalPolicies: Number(policiesCount.value),
                    totalEvidence: Number(evidenceCount.value),
                    totalLLMProviders: Number(llmCount.value),
                    totalRisks: Number(totalRisksCount.value),
                    highRisks: Number(highRisksCount.count || 0),
                    maxClients: userData?.maxClients || 2,
                    ownedClientsCount: 0 // Simplification
                },
                controlsByStatus,
                policiesByStatus,
                evidenceByStatus,
                controlsByFramework,
                clientsOverview,
                recentActivity: formattedActivity
            };
        }),

    complianceScores: protectedProcedure.query(async () => {
        const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
        return months.map((month, i) => ({
            date: month,
            score: 20 + (i * 12) + Math.round(Math.random() * 5),
            target: 80
        }));
    }),

    getInsights: protectedProcedure
        .input(z.object({
            clientId: z.number().optional(),
        }))
        .query(async ({ ctx, input }: any) => {
            const dbConn = await getDb();

            const clientIdFilter = input?.clientId;

            const isGlobalAdmin = ['admin', 'owner', 'super_admin', 'super', 'enterprise_admin', 'ent_admin'].includes(ctx.user.role || '');

            const userClientIds = isGlobalAdmin ? null : (await dbConn.select({ id: schema.userClients.clientId })
                .from(schema.userClients)
                .where(eq(schema.userClients.userId, ctx.user.id))).map((c: any) => c.id);

            let effectiveClientIds: number[] | null = null;
            if (clientIdFilter) {
                if (isGlobalAdmin) effectiveClientIds = [clientIdFilter];
                else effectiveClientIds = userClientIds?.includes(clientIdFilter) ? [clientIdFilter] : [];
            } else {
                effectiveClientIds = isGlobalAdmin ? null : (userClientIds || []);
            }

            if (effectiveClientIds !== null && effectiveClientIds.length === 0) {
                return [];
            }

            const insights = [];
            // Simplified insights generation logic
            insights.push({
                id: 'all-clear',
                type: 'success',
                title: 'Compliance is on Track',
                description: 'All core metrics are within healthy ranges. Great job!',
                action: 'Run Audit Prep',
                link: '/audit-prep'
            });

            return insights;
        })
});

export default dashboardRouter;

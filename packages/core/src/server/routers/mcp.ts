import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, getClientControls } from "../../db";
import { 
    projects, 
    clients, 
    riskAssessments, 
    projectComplianceMappings, 
    riskScenarios,
    userClients,
    workItems,
    programGuideAssignments,
    users,
    riskTreatments
} from "../../schema";
import { AutopilotEngine } from "../../lib/autopilot/engine";
import { eq, desc, and, sql } from "drizzle-orm";
import { logActivity } from "../../lib/audit";
import { getMatrixScoreLevel } from "../../lib/riskCalculations";

/**
 * MCP Router
 * 
 * Provides specialized endpoints for the Model Context Protocol (MCP) server.
 * All Tool-based operations are gated by premiumClientProcedure.
 */
export const createMcpRouter = (t: any, premiumClientProcedure: any, protectedProcedure: any) => {
    return t.router({
        /**
         * listClients
         * Lists all organizations/clients the current user belongs to.
         * Essential for AI to discover which clientId to use for other tools.
         */
        listClients: protectedProcedure
            .query(async ({ ctx }: any) => {
                const db = await getDb();
                const results = await db.select({
                    id: clients.id,
                    name: clients.name,
                    edition: (clients as any).edition,
                })
                    .from(clients)
                    .innerJoin(userClients, eq(userClients.clientId, clients.id))
                    .where(eq(userClients.userId, ctx.user.id));

                return results;
            }),

        /**
         * list_projects
         * Proxies logic from projects.list for AI consumption.
         */
        listProjects: premiumClientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const result = await db.select({
                    id: projects.id,
                    name: projects.name,
                    description: projects.description,
                    projectType: projects.projectType,
                    status: projects.status,
                    updatedAt: projects.updatedAt,
                    riskCount: sql<number>`count(DISTINCT ${riskScenarios.id})`.mapWith(Number),
                })
                    .from(projects)
                    .leftJoin(riskScenarios, eq(riskScenarios.projectId, projects.id))
                    .where(eq(projects.clientId, input.clientId))
                    .groupBy(projects.id)
                    .orderBy(desc(projects.updatedAt));

                return result;
            }),

        /**
         * get_compliance_status
         * Provides a simplified status view for AI context.
         */
        getComplianceStatus: premiumClientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
                
                if (!client) throw new TRPCError({ code: "NOT_FOUND" });

                const controlsList = await getClientControls(input.clientId);
                
                const total = controlsList.length;
                const implemented = controlsList.filter(c => c.status === 'implemented').length;
                const inProgress = controlsList.filter(c => c.status === 'in_progress').length;
                
                return {
                    organization: client.name,
                    complianceLevel: total > 0 ? Math.round((implemented / total) * 100) : 0,
                    metrics: {
                        totalControls: total,
                        implemented,
                        inProgress,
                        gapCount: total - (implemented + inProgress)
                    }
                };
            }),

        /**
         * add_risk_scenario
         * Allows AI to programmatically add new risks to the register.
         */
        addRiskScenario: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                projectId: z.number(),
                title: z.string(),
                likelihood: z.number().min(1).max(5),
                impact: z.number().min(1).max(5),
                threatDescription: z.string().optional(),
                category: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                
                const inherentScore = input.likelihood * input.impact;
                const inherentRisk = getMatrixScoreLevel(inherentScore);

                const assessmentId = `MCP-RA-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

                const [created] = await db.insert(riskAssessments)
                    .values({
                        clientId: input.clientId,
                        projectId: input.projectId,
                        assessmentId,
                        title: input.title,
                        likelihood: String(input.likelihood),
                        impact: String(input.impact),
                        inherentScore,
                        inherentRisk,
                        status: 'draft',
                        threatDescription: input.threatDescription,
                        category: input.category || 'MCP Automation',
                        assessor: 'MCP AI Assistant',
                        notes: `Created via MCP Tool by user ${ctx.user.id}`,
                        updatedAt: new Date()
                    } as any)
                    .returning();

                await logActivity({ 
                    userId: ctx.user.id, 
                    clientId: input.clientId, 
                    action: "create", 
                    entityType: "risk", 
                    entityId: created.id, 
                    details: { title: created.title, source: 'MCP' } 
                });

                return {
                    success: true,
                    riskId: created.id,
                    assessmentId: created.assessmentId,
                    score: inherentScore,
                    level: inherentRisk
                };
            }),

        /**
         * map_controls
         * Allows AI to link multiple controls to a project/workspace.
         */
        mapControls: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                projectId: z.number(),
                controlIds: z.array(z.number()),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const dbConn = await getDb();
                
                const results: (typeof projectComplianceMappings.$inferSelect)[] = [];
                for (const controlId of input.controlIds) {
                    const mapping = await dbConn.insert(projectComplianceMappings)
                        .values({
                            projectId: input.projectId,
                            clientId: input.clientId,
                            requirementId: `AUTO-${controlId}`, // Simple mapping logic for now
                            framework: "MCP_AUTO",
                            status: "pending",
                            notes: "Provisioned via MCP AI Assistant"
                        } as any)
                        .returning();
                    results.push(mapping[0]);
                }

                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: "create",
                    entityType: "compliance_mapping",
                    entityId: input.projectId,
                    details: { count: results.length, project: input.projectId }
                });

                return {
                    success: true,
                    mappedCount: results.length
                };
            }),

        /**
         * listGovernanceTasks
         * Read the governance workbench task feed for AI consumption.
         * Supports optional status/priority filters.
         */
        listGovernanceTasks: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
                priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
                limit: z.number().min(1).max(200).default(50),
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const conditions: any[] = [eq(workItems.clientId, input.clientId)];
                if (input.status) conditions.push(eq(workItems.status, input.status));
                if (input.priority) conditions.push(eq(workItems.priority, input.priority));

                const tasks = await dbConn.select({
                    id: workItems.id,
                    title: workItems.title,
                    description: workItems.description,
                    status: workItems.status,
                    priority: workItems.priority,
                    type: workItems.type,
                    dueDate: workItems.dueDate,
                    assignedToUserId: workItems.assignedToUserId,
                    entityType: workItems.entityType,
                    entityId: workItems.entityId,
                    createdAt: workItems.createdAt,
                    completedAt: workItems.completedAt,
                })
                    .from(workItems)
                    .where(and(...conditions))
                    .orderBy(desc(workItems.createdAt))
                    .limit(input.limit);

                return { tasks, total: tasks.length };
            }),

        /**
         * createGovernanceTask
         * Allows AI agents to create work items in the governance workbench.
         */
        createGovernanceTask: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                title: z.string().min(1),
                description: z.string().optional(),
                priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
                type: z.enum(['policy_review', 'control_assessment', 'risk_review', 'vendor_assessment', 'review', 'approval', 'evidence_collection']).default('review'),
                dueDate: z.string().optional(),
                entityType: z.enum(["policy", "control", "risk", "bcp_plan", "vendor", "evidence", "task"]).optional(),
                entityId: z.number().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const dbConn = await getDb();
                const [created] = await dbConn.insert(workItems)
                    .values({
                        clientId: input.clientId,
                        title: input.title,
                        description: input.description,
                        priority: input.priority,
                        type: input.type,
                        entityType: input.entityType,
                        entityId: input.entityId,
                        status: 'pending',
                        dueDate: input.dueDate ? new Date(input.dueDate) : null,
                        createdBy: ctx.user?.id || 1,
                        metadata: { source: 'MCP' },
                    } as any)
                    .returning();

                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: "create",
                    entityType: "work_item",
                    entityId: created.id,
                    details: { title: created.title, source: 'MCP' }
                });

                return {
                    success: true,
                    taskId: created.id,
                    title: created.title,
                    status: created.status,
                    priority: created.priority
                };
            }),

        /**
         * updateGovernanceTask
         * Allows AI agents to update task status, priority, or assignment.
         */
        updateGovernanceTask: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                taskId: z.number(),
                status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
                priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
                assignedToUserId: z.number().nullable().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const dbConn = await getDb();
                const [existing] = await dbConn.select()
                    .from(workItems)
                    .where(and(eq(workItems.id, input.taskId), eq(workItems.clientId, input.clientId)))
                    .limit(1);
                if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Governance task not found" });

                const updates: any = { updatedAt: new Date() };
                if (input.status) {
                    updates.status = input.status;
                    if (input.status === 'completed') updates.completedAt = new Date();
                }
                if (input.priority) updates.priority = input.priority;
                if (input.assignedToUserId !== undefined) updates.assignedToUserId = input.assignedToUserId;

                const [updated] = await dbConn.update(workItems)
                    .set(updates)
                    .where(eq(workItems.id, input.taskId))
                    .returning();

                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: "update",
                    entityType: "work_item",
                    entityId: input.taskId,
                    details: { status: updated.status, priority: updated.priority, source: 'MCP' }
                });

                return {
                    success: true,
                    taskId: updated.id,
                    status: updated.status,
                    priority: updated.priority
                };
            }),

        /**
         * runAutopilot
         * Triggers the AI Autopilot engine for a workspace. Returns real engine
         * outcomes (tasks created, evidence collected, gaps detected).
         */
        runAutopilot: premiumClientProcedure
            .input(z.object({ clientId: z.number() }))
            .mutation(async ({ input, ctx }: any) => {
                const run = await AutopilotEngine.run(input.clientId);
                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: "trigger",
                    entityType: "autopilot_run",
                    entityId: run.id,
                    details: { source: 'MCP', results: run.results }
                });
                return {
                    success: true,
                    runId: run.id,
                    totalCreated: run.results?.tasksCreated || 0,
                    evidenceCollected: run.results?.evidenceCollected || 0,
                    healthIssuesFound: run.results?.healthIssuesFound || 0,
                    gapsDetected: run.results?.gapsDetected || 0,
                };
            }),

        /**
         * listRisks
         * Read the risk register for AI consumption, with optional level filter.
         */
        listRisks: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                inherentRisk: z.enum(['low', 'medium', 'high', 'critical', 'extreme']).optional(),
                status: z.enum(['draft', 'approved', 'reviewed']).optional(),
                limit: z.number().min(1).max(200).default(50),
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const conditions: any[] = [eq(riskAssessments.clientId, input.clientId)];
                if (input.inherentRisk) conditions.push(eq(riskAssessments.inherentRisk, input.inherentRisk));
                if (input.status) conditions.push(eq(riskAssessments.status, input.status));

                const rows = await dbConn.select({
                    id: riskAssessments.id,
                    assessmentId: riskAssessments.assessmentId,
                    title: riskAssessments.title,
                    category: riskAssessments.category,
                    likelihood: riskAssessments.likelihood,
                    impact: riskAssessments.impact,
                    inherentScore: riskAssessments.inherentScore,
                    inherentRisk: riskAssessments.inherentRisk,
                    status: riskAssessments.status,
                    threatDescription: riskAssessments.threatDescription,
                    createdAt: riskAssessments.createdAt,
                })
                    .from(riskAssessments)
                    .where(and(...conditions))
                    .orderBy(desc(riskAssessments.inherentScore))
                    .limit(input.limit);

                return { risks: rows, total: rows.length };
            }),

        /**
         * getRiskSummary
         * Aggregated risk posture: counts by level plus unmitigated critical risks.
         */
        getRiskSummary: premiumClientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const rows = await dbConn.select({
                    id: riskAssessments.id,
                    inherentRisk: riskAssessments.inherentRisk,
                    inherentScore: riskAssessments.inherentScore,
                    status: riskAssessments.status,
                })
                    .from(riskAssessments)
                    .where(eq(riskAssessments.clientId, input.clientId));

                const byLevel: Record<string, number> = {};
                let highOrAbove = 0;
                for (const r of rows) {
                    const lvl = String(r.inherentRisk || 'unrated');
                    byLevel[lvl] = (byLevel[lvl] || 0) + 1;
                    if ((r.inherentScore || 0) >= 15) highOrAbove++;
                }

                // Risks scoring >= 15 with zero treatments attached
                const unmitigated = await dbConn.select({ id: riskAssessments.id })
                    .from(riskAssessments)
                    .leftJoin(riskTreatments, eq(riskTreatments.riskAssessmentId, riskAssessments.id))
                    .where(and(
                        eq(riskAssessments.clientId, input.clientId),
                        sql`${riskAssessments.inherentScore} >= 15`
                    ))
                    .groupBy(riskAssessments.id)
                    .having(sql`count(${riskTreatments.id}) = 0`);

                return {
                    totalRisks: rows.length,
                    byLevel,
                    highOrAbove,
                    unmitigatedCriticalRisks: unmitigated.length,
                };
            }),

        /**
         * addRiskTreatment
         * Attach a treatment (mitigate/transfer/accept/avoid) to an existing risk.
         */
        addRiskTreatment: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                riskAssessmentId: z.number(),
                strategy: z.enum(['mitigate', 'transfer', 'accept', 'avoid']),
                justification: z.string(),
                owner: z.string().optional(),
                dueDate: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const dbConn = await getDb();

                const [risk] = await dbConn.select()
                    .from(riskAssessments)
                    .where(and(
                        eq(riskAssessments.id, input.riskAssessmentId),
                        eq(riskAssessments.clientId, input.clientId)
                    ))
                    .limit(1);
                if (!risk) throw new TRPCError({ code: 'NOT_FOUND', message: 'Risk assessment not found' });

                const [created] = await dbConn.insert(riskTreatments)
                    .values({
                        clientId: input.clientId,
                        riskAssessmentId: input.riskAssessmentId,
                        strategy: input.strategy,
                        treatmentType: input.strategy,
                        justification: input.justification,
                        owner: input.owner,
                        dueDate: input.dueDate ? new Date(input.dueDate) : null,
                        status: 'planned',
                    } as any)
                    .returning();

                await logActivity({
                    userId: ctx.user.id,
                    clientId: input.clientId,
                    action: 'create',
                    entityType: 'treatment',
                    entityId: created.id,
                    details: { strategy: created.strategy, risk: input.riskAssessmentId, source: 'MCP' }
                });

                return {
                    success: true,
                    treatmentId: created.id,
                    strategy: created.strategy,
                    riskAssessmentId: input.riskAssessmentId,
                };
            }),

        /**
         * getProgramGuideProgress
         * Reads program-guide step assignments and completion for AI reporting.
         */
        getProgramGuideProgress: premiumClientProcedure
            .input(z.object({
                clientId: z.number(),
                guideType: z.string().default('governance'),
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const assignments = await dbConn.select({
                    stepId: programGuideAssignments.stepId,
                    ownerName: users.name,
                    ownerId: programGuideAssignments.userId,
                    targetDate: programGuideAssignments.targetDate,
                })
                    .from(programGuideAssignments)
                    .innerJoin(users, eq(programGuideAssignments.userId, users.id))
                    .where(and(
                        eq(programGuideAssignments.clientId, input.clientId),
                        eq(programGuideAssignments.guideType, input.guideType)
                    ));

                return {
                    guideType: input.guideType,
                    assignedSteps: assignments.length,
                    assignments: assignments.map(a => ({
                        stepId: a.stepId,
                        owner: a.ownerName,
                        targetDate: a.targetDate,
                    }))
                };
            })
    });
};

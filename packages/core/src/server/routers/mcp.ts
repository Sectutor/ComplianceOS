import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, getClientControls } from "../../db";
import { 
    projects, 
    clients, 
    riskAssessments, 
    projectComplianceMappings, 
    riskScenarios,
    userClients
} from "../../schema";
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
                    edition: clients.edition,
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
                
                const results = [];
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
            })
    });
};

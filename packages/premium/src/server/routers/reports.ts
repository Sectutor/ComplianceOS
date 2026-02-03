import { z } from "zod";
import { roadmapReports, implementationPhases } from "../../../../core/src/schema";
import { generateRoadmapReport, ReportData, ReportConfig } from "../../../../core/src/server/services/reportGenerator";
import { generateAIContent } from "../services/reportAI";
import * as db from "../../../../core/src/db";
import { and, eq, asc } from "drizzle-orm";

const reportSectionSchema = z.enum([
    "cover_page",
    "executive_summary",
    "strategic_vision",
    "risk_appetite",
    "objectives_timeline",
    "implementation_plan",
    "resource_allocation",
    "kpis_metrics",
    "governance",
    "appendix",
    "execution_dashboard",
    "detailed_task_log",
]);

const generateReportSchema = z.object({
    clientId: z.number(),
    roadmapId: z.number().optional(),
    implementationPlanId: z.number().optional(),
    title: z.string(),
    version: z.string().optional(),
    includedSections: z.array(reportSectionSchema),
    dataSources: z.object({
        gapAnalysis: z.boolean().optional(),
        riskAssessment: z.boolean().optional(),
        controls: z.boolean().optional(),
        policies: z.boolean().optional(),
    }).optional(),
    branding: z.object({
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        fontFamily: z.string().optional(),
    }).optional(),
});

export const createPremiumReportsRouter = (t: any, premiumClientProcedure: any) => {
    return t.router({
        generateRoadmapReport: premiumClientProcedure
            .input(generateReportSchema)
            .mutation(async ({ input, ctx }: any) => {
                const userId = ctx.user?.id;
                const dbConn = await db.getDb();

                const reportData: ReportData = {
                    client: await dbConn.query.clients.findFirst({
                        where: (clients: any, { eq }: any) => eq(clients.id, input.clientId),
                    }),
                };

                if (input.roadmapId) {
                    const roadmap = await dbConn.query.roadmaps.findFirst({
                        where: (roadmaps: any, { eq, and }: any) =>
                            and(
                                eq(roadmaps.id, input.roadmapId),
                                eq(roadmaps.clientId, input.clientId)
                            ),
                    });

                    if (roadmap) {
                        reportData.roadmap = roadmap;
                        const milestones = await dbConn.query.roadmapMilestones.findMany({
                            where: (milestones: any, { eq }: any) => eq(milestones.roadmapId, input.roadmapId),
                            orderBy: (milestones: any, { asc }: any) => [asc(milestones.targetDate)],
                        });
                        reportData.roadmapMilestones = milestones;

                        const implementationPlan = await dbConn.query.implementationPlans.findFirst({
                            where: (plans: any, { eq, and }: any) =>
                                and(
                                    eq(plans.roadmapId, input.roadmapId),
                                    eq(plans.clientId, input.clientId)
                                ),
                        });

                        if (implementationPlan) {
                            reportData.implementationPlan = implementationPlan;
                            const implementationTasks = await dbConn.query.implementationTasks.findMany({
                                where: (tasks: any, { eq }: any) => eq(tasks.implementationPlanId, implementationPlan.id),
                                orderBy: (tasks: any, { asc }: any) => [asc(tasks.id)],
                            });
                            reportData.implementationTasks = implementationTasks;

                            if (reportData.roadmap && reportData.roadmap.frameworkId) {
                                const phases = await dbConn.query.implementationPhases.findMany({
                                    where: (ph: any, { eq }: any) => eq(ph.frameworkId, reportData.roadmap!.frameworkId!),
                                    orderBy: (ph: any, { asc }: any) => [asc(ph.order)],
                                });
                                (reportData.implementationPlan as any).phases = phases;
                            }
                        }
                    }
                }

                if (reportData.roadmap && reportData.roadmap.frameworkId) {
                    reportData.requirements = await dbConn.query.frameworkRequirements.findMany({
                        where: (reqs: any, { eq }: any) => eq(reqs.frameworkId, reportData.roadmap.frameworkId),
                        orderBy: (reqs: any, { asc }: any) => [asc(reqs.id)],
                    });
                }

                if (input.dataSources?.riskAssessment) {
                    reportData.riskAssessments = await dbConn.query.riskAssessments.findMany({
                        where: (risks: any, { eq }: any) => eq(risks.clientId, input.clientId),
                    });
                }

                if (input.dataSources?.controls) {
                    reportData.controls = await dbConn.query.clientControls.findMany({
                        where: (controls: any, { eq }: any) => eq(controls.clientId, input.clientId),
                        limit: 100,
                    });
                }

                if (input.dataSources?.policies) {
                    reportData.policies = await dbConn.query.clientPolicies.findMany({
                        where: (policies: any, { eq }: any) => eq(policies.clientId, input.clientId),
                        limit: 50,
                    });
                }

                if (input.includedSections.includes("executive_summary")) {
                    const aiSummary = await generateAIContent("executive_summary", reportData);
                    (reportData as any).aiExecutiveSummary = aiSummary;
                }

                const config: ReportConfig = {
                    clientId: input.clientId,
                    roadmapId: input.roadmapId,
                    title: input.title,
                    version: input.version,
                    includedSections: input.includedSections as any[],
                    dataSources: input.dataSources,
                    branding: input.branding,
                    generatedBy: userId,
                };

                const { reportId } = await generateRoadmapReport(config, reportData);
                return { reportId, success: true };
            }),

        generateImplementationReport: premiumClientProcedure
            .input(generateReportSchema)
            .mutation(async ({ input, ctx }: any) => {
                const userId = ctx.user?.id;
                const dbConn = await db.getDb();

                const reportData: ReportData = {
                    client: await dbConn.query.clients.findFirst({
                        where: (clients: any, { eq }: any) => eq(clients.id, input.clientId),
                    }),
                };

                if (input.implementationPlanId) {
                    const plan = await dbConn.query.implementationPlans.findFirst({
                        where: (plans: any, { eq }: any) => eq(plans.id, input.implementationPlanId),
                    });

                    if (plan) {
                        reportData.implementationPlan = plan;
                        reportData.implementationTasks = await dbConn.query.implementationTasks.findMany({
                            where: (tasks: any, { eq }: any) => eq(tasks.implementationPlanId, plan.id),
                            orderBy: (tasks: any, { asc }: any) => [asc(tasks.id)],
                        });
                    }
                }

                const config: ReportConfig = {
                    clientId: input.clientId,
                    implementationPlanId: input.implementationPlanId,
                    title: input.title,
                    version: input.version,
                    includedSections: input.includedSections as any[],
                    dataSources: input.dataSources,
                    branding: input.branding,
                    generatedBy: userId,
                };

                const { reportId } = await generateRoadmapReport(config, reportData);
                return { reportId, success: true };
            }),
    });
};

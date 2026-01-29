import { z } from "zod";
import * as db from "../../db";
import { roadmapReports, implementationPhases } from "../../schema";
import { eq, desc } from "drizzle-orm";
import { generateRoadmapReport, ReportConfig, ReportData } from "../services/reportGenerator";
import { generateAIContent } from "../services/reportAI";
import * as fs from "fs/promises";

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

export const createReportsRouter = (t: any, adminProcedure: any, clientProcedure: any, clientEditorProcedure: any, publicProcedure: any, isAuthed: any) => {
    return t.router({
        /**
         * Generate a new roadmap report
         */
        generateRoadmapReport: clientProcedure
            .input(generateReportSchema)
            .mutation(async ({ input, ctx }: any) => {
                const userId = ctx.user?.id;
                if (!userId) throw new Error("User not authenticated");

                const dbConn = await db.getDb();

                // Fetch required data
                const reportData: ReportData = {
                    client: await dbConn.query.clients.findFirst({
                        where: (clients: any, { eq }: any) => eq(clients.id, input.clientId),
                    }),
                };

                // Fetch actual roadmap data if roadmapId is provided
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

                        // Fetch roadmap milestones
                        const milestones = await dbConn.query.roadmapMilestones.findMany({
                            where: (milestones: any, { eq }: any) => eq(milestones.roadmapId, input.roadmapId),
                            orderBy: (milestones: any, { asc }: any) => [asc(milestones.targetDate)],
                        });
                        reportData.roadmapMilestones = milestones;

                        // Fetch implementation plan if exists
                        const implementationPlan = await dbConn.query.implementationPlans.findFirst({
                            where: (plans: any, { eq, and }: any) =>
                                and(
                                    eq(plans.roadmapId, input.roadmapId),
                                    eq(plans.clientId, input.clientId)
                                ),
                        });


                        if (implementationPlan) {
                            reportData.implementationPlan = implementationPlan;

                            // Fetch implementation tasks
                            const implementationTasks = await dbConn.query.implementationTasks.findMany({
                                where: (tasks: any, { eq }: any) => eq(tasks.implementationPlanId, implementationPlan.id),
                                orderBy: (tasks: any, { asc }: any) => [asc(tasks.id)],
                            });
                            reportData.implementationTasks = implementationTasks;

                            // Fetch phases manually (since relation is missing)
                            if (reportData.roadmap && reportData.roadmap.frameworkId) {
                                const phases = await dbConn.query.implementationPhases.findMany({
                                    where: (ph, { eq }) => eq(ph.frameworkId, reportData.roadmap!.frameworkId!),
                                    orderBy: (ph, { asc }) => [asc(ph.order)],
                                });
                                (reportData.implementationPlan as any).phases = phases;
                                console.log(`DEBUG: Fetched ${phases.length} phases for implementation plan.`);
                            }
                        }
                    }
                } else {
                    // Fallback to placeholder if no roadmapId
                    reportData.roadmap = {
                        title: "Strategic Compliance Roadmap",
                        vision: "Comprehensive compliance program implementation",
                        objectives: ["Establish governance framework", "Implement key controls", "Achieve target compliance score"],
                        kpiTargets: [],
                    };
                }

                // Fetch Framework Requirements for detailed report
                if (reportData.roadmap && reportData.roadmap.frameworkId) {
                    reportData.requirements = await dbConn.query.frameworkRequirements.findMany({
                        where: (reqs: any, { eq }: any) => eq(reqs.frameworkId, reportData.roadmap.frameworkId),
                        orderBy: (reqs: any, { asc }: any) => [asc(reqs.id)], // ensure order
                    });
                    console.log(`DEBUG: Fetched ${reportData.requirements.length} framework requirements for report.`);
                }

                // Fetch optional data sources
                if (input.dataSources?.gapAnalysis) {
                    // TODO: Fetch gap analysis data
                    reportData.gapAnalysis = [];
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

                // Generate AI content for executive summary if included
                if (input.includedSections.includes("executive_summary")) {
                    const aiSummary = await generateAIContent("executive_summary", reportData);
                    // Store AI content for use in generation
                    (reportData as any).aiExecutiveSummary = aiSummary;
                }

                // Build config
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

                // Generate report
                try {
                    console.log("DEBUG: Starting report generation with config:", {
                        clientId: config.clientId,
                        roadmapId: config.roadmapId,
                        includedSections: config.includedSections.length,
                        dataSources: config.dataSources
                    });

                    console.log("DEBUG: Report data summary:", {
                        hasClient: !!reportData.client,
                        hasRoadmap: !!reportData.roadmap,
                        roadmapTitle: reportData.roadmap?.title,
                        riskCount: reportData.riskAssessments?.length || 0,
                        controlCount: reportData.controls?.length || 0,
                        policyCount: reportData.policies?.length || 0
                    });

                    const { reportId, buffer } = await generateRoadmapReport(config, reportData);

                    console.log("DEBUG: Report generated successfully, size:", buffer.length, "bytes");

                    return {
                        reportId,
                        success: true,
                        message: "Report generated successfully",
                    };
                } catch (error) {
                    console.error("Report generation failed:", error);
                    throw new Error(`Report generation failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            }),

        /**
         * Generate a new implementation plan report
         */
        generateImplementationReport: clientProcedure
            .input(generateReportSchema)
            .mutation(async ({ input, ctx }: any) => {
                const userId = ctx.user?.id;
                if (!userId) throw new Error("User not authenticated");

                const dbConn = await db.getDb();

                // Fetch required data
                const reportData: ReportData = {
                    client: await dbConn.query.clients.findFirst({
                        where: (clients: any, { eq }: any) => eq(clients.id, input.clientId),
                    }),
                };

                // Fetch Implementation Plan
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

                // AI Executive Summary
                if (input.includedSections.includes("executive_summary") && reportData.implementationPlan) {
                    // Simple mock for speed, or call generateAIContent if it supports it
                    // For now, let's just generate a basic summary string
                    const totalTasks = reportData.implementationTasks?.length || 0;
                    const completed = reportData.implementationTasks?.filter((t: any) => t.status === 'done').length || 0;
                    const percent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

                    (reportData as any).aiExecutiveSummary = `This report details the execution status of ${reportData.implementationPlan.title}. currently, the project is ${percent}% complete with ${completed} of ${totalTasks} tasks finished.`;
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

                const { reportId, buffer } = await generateRoadmapReport(config, reportData);

                return {
                    reportId,
                    success: true,
                    message: "Implementation report generated successfully",
                };
            }),

        /**
         * Get report history for a client
         */
        getReportHistory: clientProcedure
            .input(z.object({
                clientId: z.number(),
                limit: z.number().optional().default(10),
            }))
            .query(async ({ input }: any) => {
                const dbConn = await db.getDb();
                const reports = await dbConn.query.roadmapReports.findMany({
                    where: eq(roadmapReports.clientId, input.clientId),
                    orderBy: [desc(roadmapReports.generatedAt)],
                    limit: input.limit,
                });

                return reports;
            }),

        /**
         * Get a single report by ID
         */
        getReport: clientProcedure
            .input(z.object({
                reportId: z.number(),
            }))
            .query(async ({ input }: any) => {
                const dbConn = await db.getDb();
                const report = await dbConn.query.roadmapReports.findFirst({
                    where: eq(roadmapReports.id, input.reportId),
                });

                if (!report) {
                    throw new Error("Report not found");
                }

                return report;
            }),

        /**
         * Update a report
         */
        updateReport: clientProcedure
            .input(z.object({
                reportId: z.number(),
                title: z.string().optional(),
                version: z.string().optional(),
                content: z.string().optional(),
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await db.getDb();

                // First, check if report exists
                const existingReport = await dbConn.query.roadmapReports.findFirst({
                    where: eq(roadmapReports.id, input.reportId),
                });

                if (!existingReport) {
                    throw new Error("Report not found");
                }

                // Prepare update data
                const updateData: any = {
                    updatedAt: new Date(),
                };

                if (input.title !== undefined) updateData.title = input.title;
                if (input.version !== undefined) updateData.version = input.version;
                if (input.content !== undefined) updateData.content = input.content;

                // Update the report
                await dbConn.update(roadmapReports)
                    .set(updateData)
                    .where(eq(roadmapReports.id, input.reportId));

                return { success: true };
            }),

        /**
         * Download a report
         */
        downloadReport: clientProcedure
            .input(z.object({
                reportId: z.number(),
            }))
            .query(async ({ input }: any) => {
                const dbConn = await db.getDb();
                const report = await dbConn.query.roadmapReports.findFirst({
                    where: eq(roadmapReports.id, input.reportId),
                });

                if (!report || !report.filePath) {
                    throw new Error("Report not found");
                }

                // Read file
                const buffer = await fs.readFile(report.filePath);

                return {
                    fileName: `${report.title.replace(/\s+/g, "_")}_${report.version}.docx`,
                    data: buffer.toString("base64"),
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                };
            }),

        /**
         * Delete a report
         */
        deleteReport: clientProcedure
            .input(z.object({
                reportId: z.number(),
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await db.getDb();
                const report = await dbConn.query.roadmapReports.findFirst({
                    where: eq(roadmapReports.id, input.reportId),
                });

                if (!report) {
                    throw new Error("Report not found");
                }

                // Delete file if exists
                if (report.filePath) {
                    try {
                        await fs.unlink(report.filePath);
                    } catch (err) {
                        console.error("Failed to delete report file:", err);
                    }
                }

                // Delete from database
                await dbConn.delete(roadmapReports).where(eq(roadmapReports.id, input.reportId));

                return { success: true };
            }),
    });
};

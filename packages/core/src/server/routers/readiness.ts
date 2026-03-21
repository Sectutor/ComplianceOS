
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, bulkAssignControls } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { clients, readinessAssessments, reportLogs } from "../../schema";

export const createReadinessRouter = (t: any, clientProcedure: any) => {
    return t.router({
        // Initialize or Get the current assessment state
        getState: clientProcedure
            .input(z.object({
                clientId: z.number(),
                standardId: z.string().optional().default("ISO27001")
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const standardId = input.standardId;

                try {
                    const assessment = await dbConn.query.readinessAssessments.findFirst({
                        where: and(
                            eq(readinessAssessments.clientId, input.clientId),
                            eq(readinessAssessments.standardId, standardId)
                        ),
                        orderBy: [desc(readinessAssessments.updatedAt)]
                    });

                    if (assessment) {
                        return {
                            id: assessment.id,
                            clientId: assessment.clientId,
                            name: assessment.name,
                            status: assessment.status,
                            currentStep: assessment.currentStep,
                            scopeDetails: assessment.scopeDetails || {},
                            stakeholders: assessment.stakeholders || {},
                            existingPolicies: assessment.existingPolicies || {},
                            businessContext: assessment.businessContext || {},
                            maturityExpectations: assessment.maturityExpectations || {},
                            questionnaireData: assessment.questionnaireData || {},
                            scopingReport: assessment.scopingReport || null,
                            updatedAt: assessment.updatedAt,
                            createdAt: assessment.createdAt
                        };
                    }

                    // Prefill
                    const client = await dbConn.query.clients.findFirst({
                        where: eq(clients.id, input.clientId)
                    });

                    if (client) {
                        const address = client.headquarters || "";
                        return {
                            id: 0, // Virtual ID
                            clientId: input.clientId,
                            name: `ISO 27001 Readiness - ${client.name}`,
                            status: "draft",
                            currentStep: 1,
                            scopeDetails: {
                                orgBoundaries: client.name,
                                locations: address,
                                technologies: client.industry ? `Industry: ${client.industry}` : ""
                            },
                            stakeholders: {},
                            existingPolicies: {},
                            businessContext: {},
                            maturityExpectations: {},
                            questionnaireData: {},
                            updatedAt: new Date(),
                            createdAt: new Date()
                        };
                    }

                    return null;
                } catch (err) {
                    console.error("ORM Error in getState:", err);
                    throw new Error("Database query failed");
                }
            }),

        createOrUpdate: clientProcedure
            .input(z.object({
                clientId: z.number(),
                standardId: z.string().optional().default("ISO27001"),
                step: z.number().optional(),
                data: z.object({
                    scope: z.any().optional(),
                    stakeholders: z.any().optional(),
                    existingPolicies: z.any().optional(),
                    context: z.any().optional(),
                    expectations: z.any().optional(),
                    questionnaireData: z.any().optional(),
                    scopingReport: z.string().optional(),
                }).optional()
            }))
            .mutation(async ({ input }: any) => {
                try {
                    const dbConn = await getDb();

                    const existing = await dbConn.query.readinessAssessments.findFirst({
                        where: and(
                            eq(readinessAssessments.clientId, input.clientId),
                            eq(readinessAssessments.standardId, input.standardId || "ISO27001")
                        ),
                        orderBy: [desc(readinessAssessments.updatedAt)]
                    });

                    if (!existing) {
                        // INSERT
                        const name = `ISO 27001 Readiness - ${new Date().getFullYear()}`;
                        const currentStep = input.step || 1;

                        const [newRow] = await dbConn.insert(readinessAssessments).values({
                            clientId: input.clientId,
                            standardId: input.standardId || "ISO27001",
                            name,
                            currentStep,
                            scopeDetails: input.data?.scope || {},
                            stakeholders: input.data?.stakeholders || {},
                            existingPolicies: input.data?.existingPolicies || {},
                            businessContext: input.data?.context || {},
                            maturityExpectations: input.data?.expectations || {},
                            questionnaireData: input.data?.questionnaireData || {},
                            scopingReport: input.data?.scopingReport || null
                        }).returning();

                        return newRow;
                    } else {
                        // UPDATE
                        const [updatedRow] = await dbConn.update(readinessAssessments)
                            .set({
                                currentStep: input.step ?? existing.currentStep,
                                scopeDetails: input.data?.scope ?? existing.scopeDetails,
                                stakeholders: input.data?.stakeholders ?? existing.stakeholders,
                                existingPolicies: input.data?.existingPolicies ?? existing.existingPolicies,
                                businessContext: input.data?.context ?? existing.businessContext,
                                maturityExpectations: input.data?.expectations ?? existing.maturityExpectations,
                                questionnaireData: input.data?.questionnaireData ?? existing.questionnaireData,
                                scopingReport: input.data?.scopingReport ?? existing.scopingReport,
                                updatedAt: new Date()
                            })
                            .where(eq(readinessAssessments.id, existing.id))
                            .returning();

                        return updatedRow;
                    }
                } catch (error: any) {
                    console.error("Failed to createOrUpdate readiness assessment:", error);
                    // Ensure we return a clean error message that TRPC can display
                    throw new Error(error.message || "Failed to save progress");
                }
            }),

        list: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                return await dbConn.query.readinessAssessments.findMany({
                    where: eq(readinessAssessments.clientId, input.clientId),
                    orderBy: [desc(readinessAssessments.updatedAt)]
                });
            }),

        baseline: clientProcedure
            .input(z.object({
                clientId: z.number(),
                standardId: z.string(),
            }))
            .mutation(async ({ input }: any) => {
                try {
                    const dbConn = await getDb();

                    // 1. Mark assessment as completed
                    await dbConn.update(readinessAssessments)
                        .set({ status: 'completed', updatedAt: new Date() })
                        .where(and(
                            eq(readinessAssessments.clientId, input.clientId),
                            eq(readinessAssessments.standardId, input.standardId)
                        ));

                    // 2. Map standardId to framework name
                    let framework = input.standardId;
                    if (framework === 'ISO27001') framework = 'ISO 27001';
                    if (framework === 'SOC2') framework = 'SOC 2';
                    if (framework === 'NISTCSF') framework = 'NIST CSF';
                    if (framework === 'HIPAA') framework = 'HIPAA';

                    // 3. Trigger framework activation (Assign controls)
                    try {
                        await bulkAssignControls(input.clientId, [framework]);
                    } catch (e) {
                        console.error("Failed to assign controls during baseline:", e);
                    }

                    return { success: true, framework };
                } catch (error: any) {
                    console.error("Failed to complete baseline assessment:", error);
                    throw new Error(`Failed to complete baseline: ${error.message}`);
                }
            }),

        /**
         * Generate a Gap Analysis report (legacy path)
         */
        generateReport: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .mutation(async ({ input, ctx }: any) => {
                const { generateGapAnalysisReport, logReportGeneration } = await import("../../lib/reporting");
                const { storage } = await import("../../lib/storage");
                
                const buffer = await generateGapAnalysisReport(input.clientId);
                const filename = `compliance-report-${new Date().toISOString().split('T')[0]}-${Date.now()}.pdf`;
                
                // Save to storage for history
                const storageUrl = await storage.save(`reports/readiness/${input.clientId}/${filename}`, buffer, 'application/pdf');
                
                // Log generation
                await logReportGeneration({
                    clientId: input.clientId,
                    userId: ctx.session?.user?.id,
                    reportType: "compliance_readiness",
                    format: "pdf",
                    metadata: {
                        filename,
                        storageUrl,
                        generatedAt: new Date().toISOString()
                    }
                });

                return {
                    filename,
                    pdfBase64: buffer.toString('base64'),
                    storageUrl
                };
            }),

        getReportHistory: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                return await dbConn.select().from(reportLogs)
                    .where(and(
                        eq(reportLogs.clientId, input.clientId),
                        eq(reportLogs.reportType, "compliance_readiness")
                    ))
                    .orderBy(desc(reportLogs.timestamp))
                    .limit(10);
            }),

        downloadReport: clientProcedure
            .input(z.object({ 
                clientId: z.number(),
                reportId: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [report] = await dbConn.select().from(reportLogs)
                    .where(and(
                        eq(reportLogs.id, input.reportId),
                        eq(reportLogs.clientId, input.clientId)
                    ))
                    .limit(1);

                if (!report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });
                
                const metadata = report.metadata as any;
                if (!metadata?.storageUrl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Report file reference missing' });

                const { storage } = await import("../../lib/storage");
                
                // key is the part after /api/storage/ if using local storage or just the key if using S3
                // LocalStorageProvider.save returns `/api/storage/${key}`
                const key = metadata.storageUrl.replace('/api/storage/', '');
                const buffer = await storage.get(key);

                return {
                    filename: metadata.filename || `report-${report.id}.pdf`,
                    pdfBase64: buffer.toString('base64')
                };
            }),

        deleteReport: clientProcedure
            .input(z.object({ 
                clientId: z.number(),
                reportId: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                
                // 1. Fetch the report log to get storage info
                const [report] = await dbConn.select().from(reportLogs)
                    .where(and(
                        eq(reportLogs.id, input.reportId),
                        eq(reportLogs.clientId, input.clientId)
                    ))
                    .limit(1);

                if (!report) throw new TRPCError({ code: 'NOT_FOUND', message: 'Report not found' });

                // 2. Delete file from storage if it exists
                const metadata = report.metadata as any;
                if (metadata?.storageUrl) {
                    try {
                        const { storage } = await import("../../lib/storage");
                        const key = metadata.storageUrl.replace('/api/storage/', '');
                        await storage.delete(key);
                    } catch (err) {
                        console.error("Failed to delete report file from storage:", err);
                        // We continue with DB deletion even if file deletion fails
                    }
                }

                // 3. Delete from DB
                await dbConn.delete(reportLogs)
                    .where(and(
                        eq(reportLogs.id, input.reportId),
                        eq(reportLogs.clientId, input.clientId)
                    ));

                return { success: true };
            }),
    });
};

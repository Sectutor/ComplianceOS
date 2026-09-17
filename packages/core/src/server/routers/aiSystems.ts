import { z } from "zod";
import * as schema from "../../schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { getDb } from "../../db";

const AGENT_GOVERNANCE_BLOCK_RE = /(?:^|\n)---\nAGENT_GOVERNANCE\n([\s\S]*)$/;

const stripAgentGovernanceBlockFromTechnicalConstraints = (technicalConstraints: string | null | undefined) => {
    if (!technicalConstraints) return '';
    const trimmed = technicalConstraints.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed?.notes === 'string') return parsed.notes;
            if (typeof parsed?.technicalConstraints === 'string') return parsed.technicalConstraints;
        } catch {
            return '';
        }
        return '';
    }
    const match = AGENT_GOVERNANCE_BLOCK_RE.exec(technicalConstraints);
    if (!match) return technicalConstraints;
    const idx = match.index ?? 0;
    return technicalConstraints.slice(0, idx).trimEnd();
};

export const createAiSystemsRouter = (t: any, protectedProcedure: any) => {
    return t.router({
        list: protectedProcedure
            .input(z.object({
                clientId: z.number()
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                return await dbConn.query.aiSystems.findMany({
                    where: eq(schema.aiSystems.clientId, input.clientId),
                    with: {
                        // We will add the relation in schema if needed, for now just join manually or return raw
                    },
                    orderBy: [desc(schema.aiSystems.createdAt)]
                });
            }),

        create: protectedProcedure
            .input(z.object({
                clientId: z.number(),
                name: z.string().min(1),
                description: z.string().optional(),
                purpose: z.string().optional(),
                intendedUsers: z.string().optional(),
                deploymentContext: z.string().optional(),
                type: z.string().optional(),
                riskLevel: z.enum(["low", "medium", "high", "critical", "unacceptable"]).optional(),
                status: z.enum(["evaluation", "development", "production", "monitoring", "retired"]).optional(),
                owner: z.string().optional(),
                vendorId: z.number().optional(),
                dataSensitivity: z.string().optional(),
                technicalConstraints: z.string().optional(),
                euAiActClass: z.enum(["unacceptable", "high", "limited", "minimal", "general_purpose_ai", "not_applicable"]).optional(),
                euAiActProhibited: z.boolean().optional(),
                euAiActHighRiskCategory: z.string().optional(),
                euAiActDeployer: z.boolean().optional(),
                euAiActRegistrationNumber: z.string().optional(),
                euAiActConformityAssessment: z.enum(["not_required", "self_assessment", "notified_body"]).optional(),
                euAiActLastAssessmentDate: z.string().optional(),
                euAiActNextAssessmentDate: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [newSystem] = await dbConn.insert(schema.aiSystems).values({
                    clientId: input.clientId,
                    name: input.name,
                    description: input.description,
                    purpose: input.purpose,
                    intendedUsers: input.intendedUsers,
                    deploymentContext: input.deploymentContext,
                    type: input.type,
                    riskLevel: input.riskLevel as any,
                    status: input.status as any,
                    owner: input.owner,
                    vendorId: input.vendorId,
                    dataSensitivity: input.dataSensitivity,
                    technicalConstraints: input.technicalConstraints,
                    euAiActClass: input.euAiActClass as any,
                    euAiActProhibited: input.euAiActProhibited,
                    euAiActHighRiskCategory: input.euAiActHighRiskCategory,
                    euAiActDeployer: input.euAiActDeployer,
                    euAiActRegistrationNumber: input.euAiActRegistrationNumber,
                    euAiActConformityAssessment: input.euAiActConformityAssessment as any,
                    euAiActLastAssessmentDate: input.euAiActLastAssessmentDate ? new Date(input.euAiActLastAssessmentDate) : undefined,
                    euAiActNextAssessmentDate: input.euAiActNextAssessmentDate ? new Date(input.euAiActNextAssessmentDate) : undefined
                }).returning();
                return newSystem;
            }),

        update: protectedProcedure
            .input(z.object({
                id: z.number(),
                name: z.string().optional(),
                description: z.string().optional(),
                purpose: z.string().optional(),
                status: z.enum(["evaluation", "development", "production", "monitoring", "retired"]).optional(),
                riskLevel: z.enum(["low", "medium", "high", "critical", "unacceptable"]).optional(),
                vendorId: z.number().optional(),
                owner: z.string().optional(),
                intendedUsers: z.string().optional(),
                deploymentContext: z.string().optional(),
                type: z.string().optional(),
                dataSensitivity: z.string().optional(),
                technicalConstraints: z.string().optional(),
                euAiActClass: z.enum(["unacceptable", "high", "limited", "minimal", "general_purpose_ai", "not_applicable"]).optional(),
                euAiActProhibited: z.boolean().optional(),
                euAiActHighRiskCategory: z.string().optional(),
                euAiActDeployer: z.boolean().optional(),
                euAiActRegistrationNumber: z.string().optional(),
                euAiActConformityAssessment: z.enum(["not_required", "self_assessment", "notified_body"]).optional(),
                euAiActLastAssessmentDate: z.string().optional(),
                euAiActNextAssessmentDate: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const { id, ...updateData } = input;
                const [updated] = await dbConn.update(schema.aiSystems)
                    .set({
                        ...updateData,
                        euAiActLastAssessmentDate: updateData.euAiActLastAssessmentDate ? new Date(updateData.euAiActLastAssessmentDate) : undefined,
                        euAiActNextAssessmentDate: updateData.euAiActNextAssessmentDate ? new Date(updateData.euAiActNextAssessmentDate) : undefined,
                        updatedAt: new Date()
                    })
                    .where(eq(schema.aiSystems.id, id))
                    .returning();
                return updated;
            }),

        delete: protectedProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                await dbConn.delete(schema.aiSystems).where(eq(schema.aiSystems.id, input.id));
                return { success: true };
            }),

        getWithAssessments: protectedProcedure
            .input(z.object({ id: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const system = await dbConn.query.aiSystems.findFirst({
                    where: eq(schema.aiSystems.id, input.id),
                });

                if (!system) throw new Error("AI System not found");

                const assessments = await dbConn.query.aiImpactAssessments.findMany({
                    where: eq(schema.aiImpactAssessments.aiSystemId, input.id),
                    orderBy: [desc(schema.aiImpactAssessments.createdAt)]
                });

                let vendor = null;
                if (system.vendorId) {
                    vendor = await dbConn.query.vendors.findFirst({
                        where: eq(schema.vendors.id, system.vendorId)
                    });
                }

                return { ...system, assessments, vendor };
            }),

        addImpactAssessment: protectedProcedure
            .input(z.object({
                aiSystemId: z.number(),
                safetyImpact: z.string().optional(),
                biasImpact: z.string().optional(),
                privacyImpact: z.string().optional(),
                securityImpact: z.string().optional(),
                overallRiskScore: z.number().optional(),
                recommendations: z.string().optional()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const dbConn = await getDb();
                const [assessment] = await dbConn.insert(schema.aiImpactAssessments).values({
                    aiSystemId: input.aiSystemId,
                    assessorId: ctx.user.id,
                    safetyImpact: input.safetyImpact,
                    biasImpact: input.biasImpact,
                    privacyImpact: input.privacyImpact,
                    securityImpact: input.securityImpact,
                    overallRiskScore: input.overallRiskScore,
                    recommendations: input.recommendations
                }).returning();
                return assessment;
            }),

        mapControl: protectedProcedure
            .input(z.object({
                aiSystemId: z.number(),
                controlId: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [mapping] = await dbConn.insert(schema.aiSystemControls).values({
                    aiSystemId: input.aiSystemId,
                    controlId: input.controlId,
                    status: "mapped"
                }).returning();
                return mapping;
            }),

        unmapControl: protectedProcedure
            .input(z.object({
                aiSystemId: z.number(),
                controlId: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                await dbConn.delete(schema.aiSystemControls)
                    .where(and(
                        eq(schema.aiSystemControls.aiSystemId, input.aiSystemId),
                        eq(schema.aiSystemControls.controlId, input.controlId)
                    ));
                return { success: true };
            }),

        updateControlStatus: protectedProcedure
            .input(z.object({
                aiSystemId: z.number(),
                controlId: z.number(),
                status: z.string()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                await dbConn.update(schema.aiSystemControls)
                    .set({ status: input.status })
                    .where(and(
                        eq(schema.aiSystemControls.aiSystemId, input.aiSystemId),
                        eq(schema.aiSystemControls.controlId, input.controlId)
                    ));
                return { success: true };
            }),

        getMappedControls: protectedProcedure
            .input(z.object({
                aiSystemId: z.number()
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                return await dbConn.select({
                    mappingId: schema.aiSystemControls.id,
                    controlId: schema.controls.id,
                    name: schema.controls.name,
                    controlIdString: schema.controls.controlId,
                    framework: schema.controls.framework,
                    status: schema.aiSystemControls.status
                })
                    .from(schema.aiSystemControls)
                    .innerJoin(schema.controls, eq(schema.aiSystemControls.controlId, schema.controls.id))
                    .where(eq(schema.aiSystemControls.aiSystemId, input.aiSystemId));
            }),

        exportModelCard: protectedProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const system = await dbConn.query.aiSystems.findFirst({
                    where: eq(schema.aiSystems.id, input.id)
                });

                if (!system) throw new Error("AI System not found");

                const assessments = await dbConn.query.aiImpactAssessments.findMany({
                    where: eq(schema.aiImpactAssessments.aiSystemId, input.id),
                    orderBy: [desc(schema.aiImpactAssessments.createdAt)]
                });

                const controls = await dbConn.select({
                    controlId: schema.controls.controlId,
                    name: schema.controls.name,
                    framework: schema.controls.framework
                })
                    .from(schema.aiSystemControls)
                    .innerJoin(schema.controls, eq(schema.aiSystemControls.controlId, schema.controls.id))
                    .where(eq(schema.aiSystemControls.aiSystemId, input.id));

                // Standardized Model Card Format
                return {
                    version: "1.0",
                    generatedAt: new Date(),
                    modelDetails: {
                        name: system.name,
                        description: system.description,
                        purpose: system.purpose,
                        type: system.type,
                        owner: system.owner,
                        intendedUsers: system.intendedUsers
                    },
                    riskManagement: {
                        overallRiskLevel: system.riskLevel,
                        impactAssessments: assessments.map((a: any) => ({
                            date: a.createdAt,
                            safetyImpact: a.safetyImpact,
                            biasImpact: a.biasImpact,
                            privacyImpact: a.privacyImpact,
                            riskScore: a.overallRiskScore
                        })),
                        complianceMapping: controls
                    },
                    technicalContext: {
                        constraints: stripAgentGovernanceBlockFromTechnicalConstraints(system.technicalConstraints) || "Not documented",
                        deploymentContext: system.deploymentContext || "Not documented"
                    }
                };
            }),

        getStats: protectedProcedure
            .input(z.object({ clientId: z.number(), aiSystemId: z.number().optional() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();

                let systems: any[] = [];
                if (input.aiSystemId) {
                    const s = await dbConn.query.aiSystems.findFirst({
                        where: and(eq(schema.aiSystems.id, input.aiSystemId), eq(schema.aiSystems.clientId, input.clientId))
                    });
                    if (!s) throw new Error("AI System not found");
                    systems = [s];
                } else {
                    systems = await dbConn.select().from(schema.aiSystems)
                        .where(eq(schema.aiSystems.clientId, input.clientId));
                }

                const totalSystems = systems.length;

                const highRiskSystems = systems.filter((s: any) =>
                    s.riskLevel === "high" ||
                    s.riskLevel === "critical" ||
                    s.riskLevel === "unacceptable"
                ).length;

                const totalAssessmentsResult = await dbConn.select({ count: sql<number>`count(*)` })
                    .from(schema.aiImpactAssessments)
                    .innerJoin(schema.aiSystems, eq(schema.aiImpactAssessments.aiSystemId, schema.aiSystems.id))
                    .where(and(
                        eq(schema.aiSystems.clientId, input.clientId),
                        input.aiSystemId ? eq(schema.aiImpactAssessments.aiSystemId, input.aiSystemId) : sql<boolean>`true`
                    ));

                const totalAssessments = Number(totalAssessmentsResult[0]?.count) || 0;

                // 4. NIST Compliance
                const mappedControlsResult = await dbConn.selectDistinct({ controlId: schema.aiSystemControls.controlId })
                    .from(schema.aiSystemControls)
                    .innerJoin(schema.aiSystems, eq(schema.aiSystemControls.aiSystemId, schema.aiSystems.id))
                    .innerJoin(schema.controls, eq(schema.aiSystemControls.controlId, schema.controls.id))
                    .where(and(
                        eq(schema.controls.framework, "NIST AI RMF"),
                        input.aiSystemId ? eq(schema.aiSystemControls.aiSystemId, input.aiSystemId) : eq(schema.aiSystems.clientId, input.clientId)
                    ));

                const nistControlsResult = await dbConn.select({ count: sql<number>`count(*)` })
                    .from(schema.controls)
                    .where(eq(schema.controls.framework, "NIST AI RMF"));

                const mappedCount = mappedControlsResult.length;
                const totalNistCount = Number(nistControlsResult[0]?.count) || 73;

                // 5. Category Breakdown for NIST AI RMF
                const nistCategories = ["GOVERN", "MAP", "MEASURE", "MANAGE"];
                const categoryStats = await Promise.all(nistCategories.map(async (cat) => {
                    const totalInCatResult = await dbConn.select({ count: sql<number>`count(*)` })
                        .from(schema.controls)
                        .where(and(
                            eq(schema.controls.framework, "NIST AI RMF"),
                            eq(schema.controls.category, cat)
                        ));

                    const mappedInCatResult = await dbConn.selectDistinct({ controlId: schema.aiSystemControls.controlId })
                        .from(schema.aiSystemControls)
                        .innerJoin(schema.aiSystems, eq(schema.aiSystemControls.aiSystemId, schema.aiSystems.id))
                        .innerJoin(schema.controls, eq(schema.aiSystemControls.controlId, schema.controls.id))
                        .where(and(
                            eq(schema.controls.framework, "NIST AI RMF"),
                            eq(schema.controls.category, cat),
                            input.aiSystemId ? eq(schema.aiSystemControls.aiSystemId, input.aiSystemId) : eq(schema.aiSystems.clientId, input.clientId)
                        ));

                    const total = Number(totalInCatResult[0]?.count) || 0;
                    const mapped = mappedInCatResult.length;

                    return {
                        category: cat,
                        total,
                        mapped,
                        percentage: total > 0 ? Math.round((mapped / total) * 100) : 0
                    };
                }));

                return {
                    totalSystems,
                    highRiskSystems,
                    totalAssessments,
                    nistCompliance: {
                        percentage: totalNistCount > 0 ? Math.round((mappedCount / totalNistCount) * 100) : 0,
                        mappedCount,
                        totalCount: totalNistCount
                    },
                    categoryBreakdown: categoryStats
                };
            }),

        listAllAssessments: protectedProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                return await dbConn.select({
                    id: schema.aiImpactAssessments.id,
                    aiSystemId: schema.aiImpactAssessments.aiSystemId,
                    systemName: schema.aiSystems.name,
                    overallRiskScore: schema.aiImpactAssessments.overallRiskScore,
                    createdAt: schema.aiImpactAssessments.createdAt,
                    assessorName: schema.users.name
                })
                    .from(schema.aiImpactAssessments)
                    .innerJoin(schema.aiSystems, eq(schema.aiImpactAssessments.aiSystemId, schema.aiSystems.id))
                    .leftJoin(schema.users, eq(schema.aiImpactAssessments.assessorId, schema.users.id))
                    .where(eq(schema.aiSystems.clientId, input.clientId))
                    .orderBy(desc(schema.aiImpactAssessments.createdAt));
            }),

        downloadAssessmentReport: protectedProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const { generateAIImpactAssessmentPdf } = await import('../../lib/reporting');
                const pdfBuffer = await generateAIImpactAssessmentPdf(input.id);
                return {
                    pdfBase64: pdfBuffer.toString('base64'),
                    filename: `AI_Impact_Assessment_${input.id}.pdf`
                };
            }),

        // ──────────────────────────────────────────────
        // EU AI Act Compliance Procedures
        // ──────────────────────────────────────────────

        getEuAiActCompliance: protectedProcedure
            .input(z.object({
                aiSystemId: z.number()
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                const record = await dbConn.query.aiEuAiActCompliance.findFirst({
                    where: eq(schema.aiEuAiActCompliance.aiSystemId, input.aiSystemId)
                });
                return record ?? null;
            }),

        upsertEuAiActCompliance: protectedProcedure
            .input(z.object({
                aiSystemId: z.number(),
                clientId: z.number(),
                // Article 9 - Risk Management System
                riskMgmtSystemEstablished: z.boolean().optional(),
                riskMgmtDocLink: z.string().optional(),
                riskMgmtReviewDate: z.string().optional(),
                // Article 10 - Data Governance
                dataGovernanceImplemented: z.boolean().optional(),
                trainingDataProvenance: z.string().optional(),
                dataPrivacyCompliant: z.boolean().optional(),
                // Article 11-12 - Technical Documentation & Record-Keeping
                techDocumentationComplete: z.boolean().optional(),
                techDocUrl: z.string().optional(),
                logsAutomaticallyRecorded: z.boolean().optional(),
                logRetentionDays: z.number().optional(),
                // Article 13 - Transparency
                transparencyInfoProvided: z.boolean().optional(),
                transparencyInfoUrl: z.string().optional(),
                // Article 14 - Human Oversight
                humanOversightMeasuresImplemented: z.boolean().optional(),
                humanOversightDescription: z.string().optional(),
                // Article 15 - Accuracy, Robustness, Cybersecurity
                accuracyBenchmarksMet: z.boolean().optional(),
                robustnessTested: z.boolean().optional(),
                cybersecurityMeasuresImplemented: z.boolean().optional(),
                // Article 26 - Obligations of Deployers
                deployerHumanOversightAssigned: z.boolean().optional(),
                deployerMonitoringImplemented: z.boolean().optional(),
                deployerIncidentReportingConfigured: z.boolean().optional(),
                // Article 52 - Transparency for Limited Risk AI
                transparencyLabelImplemented: z.boolean().optional(),
                transparencyLabelText: z.string().optional(),
                // Overall Status
                complianceStatus: z.string().optional(),
                complianceScore: z.number().optional(),
                lastAssessedAt: z.string().optional(),
                assessedByUserId: z.number().optional(),
                assessmentNotes: z.string().optional()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();

                // Check if a record already exists
                const existing = await dbConn.query.aiEuAiActCompliance.findFirst({
                    where: eq(schema.aiEuAiActCompliance.aiSystemId, input.aiSystemId)
                });

                const values: any = {
                    aiSystemId: input.aiSystemId,
                    clientId: input.clientId,
                    riskMgmtSystemEstablished: input.riskMgmtSystemEstablished,
                    riskMgmtDocLink: input.riskMgmtDocLink,
                    riskMgmtReviewDate: input.riskMgmtReviewDate ? new Date(input.riskMgmtReviewDate) : undefined,
                    dataGovernanceImplemented: input.dataGovernanceImplemented,
                    trainingDataProvenance: input.trainingDataProvenance,
                    dataPrivacyCompliant: input.dataPrivacyCompliant,
                    techDocumentationComplete: input.techDocumentationComplete,
                    techDocUrl: input.techDocUrl,
                    logsAutomaticallyRecorded: input.logsAutomaticallyRecorded,
                    logRetentionDays: input.logRetentionDays,
                    transparencyInfoProvided: input.transparencyInfoProvided,
                    transparencyInfoUrl: input.transparencyInfoUrl,
                    humanOversightMeasuresImplemented: input.humanOversightMeasuresImplemented,
                    humanOversightDescription: input.humanOversightDescription,
                    accuracyBenchmarksMet: input.accuracyBenchmarksMet,
                    robustnessTested: input.robustnessTested,
                    cybersecurityMeasuresImplemented: input.cybersecurityMeasuresImplemented,
                    deployerHumanOversightAssigned: input.deployerHumanOversightAssigned,
                    deployerMonitoringImplemented: input.deployerMonitoringImplemented,
                    deployerIncidentReportingConfigured: input.deployerIncidentReportingConfigured,
                    transparencyLabelImplemented: input.transparencyLabelImplemented,
                    transparencyLabelText: input.transparencyLabelText,
                    complianceStatus: input.complianceStatus,
                    complianceScore: input.complianceScore,
                    lastAssessedAt: input.lastAssessedAt ? new Date(input.lastAssessedAt) : undefined,
                    assessedByUserId: input.assessedByUserId,
                    assessmentNotes: input.assessmentNotes,
                    updatedAt: new Date()
                };

                if (existing) {
                    const [updated] = await dbConn.update(schema.aiEuAiActCompliance)
                        .set(values)
                        .where(eq(schema.aiEuAiActCompliance.id, existing.id))
                        .returning();
                    return updated;
                } else {
                    const [created] = await dbConn.insert(schema.aiEuAiActCompliance)
                        .values(values)
                        .returning();
                    return created;
                }
            }),

        assessEuAiActCompliance: protectedProcedure
            .input(z.object({
                aiSystemId: z.number(),
                clientId: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();

                // Fetch the existing compliance record
                const existing = await dbConn.query.aiEuAiActCompliance.findFirst({
                    where: eq(schema.aiEuAiActCompliance.aiSystemId, input.aiSystemId)
                });

                if (!existing) {
                    throw new Error("EU AI Act compliance record not found. Please create one first.");
                }

                // Count positive checks completed
                const positiveChecks = [
                    existing.riskMgmtSystemEstablished,
                    existing.dataGovernanceImplemented,
                    existing.dataPrivacyCompliant,
                    existing.techDocumentationComplete,
                    existing.logsAutomaticallyRecorded,
                    existing.transparencyInfoProvided,
                    existing.humanOversightMeasuresImplemented,
                    existing.accuracyBenchmarksMet,
                    existing.robustnessTested,
                    existing.cybersecurityMeasuresImplemented,
                    existing.deployerHumanOversightAssigned,
                    existing.deployerMonitoringImplemented,
                    existing.deployerIncidentReportingConfigured,
                    existing.transparencyLabelImplemented
                ];

                const totalChecks = positiveChecks.length;
                const completedChecks = positiveChecks.filter(Boolean).length;
                const score = Math.round((completedChecks / totalChecks) * 100);

                // Determine compliance status
                let complianceStatus: string;
                if (score >= 80) {
                    complianceStatus = "compliant";
                } else if (score >= 40) {
                    complianceStatus = "partially_compliant";
                } else {
                    complianceStatus = "non_compliant";
                }

                // Update the record
                const [updated] = await dbConn.update(schema.aiEuAiActCompliance)
                    .set({
                        complianceStatus,
                        complianceScore: score,
                        lastAssessedAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(schema.aiEuAiActCompliance.id, existing.id))
                    .returning();

                return updated;
            })
    });
};

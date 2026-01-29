
import { z } from "zod";
import * as db from "../../db";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, desc, and, sql, getTableColumns, lt, or, inArray, like } from "drizzle-orm";
import { llmService } from "../../lib/llm/service";

export const createEvidenceRouter = (
    t: any,
    adminProcedure: any,
    publicProcedure: any,
    protectedProcedure: any
) => {
    return t.router({
        list: publicProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const results = await db.getEvidence(input.clientId);
                // Flatten structure for report consumption
                return results.map((r: any) => ({
                    id: r.id,
                    evidenceId: r.evidenceId,
                    description: r.description,
                    status: r.status,
                    lastVerified: r.lastVerified,
                    control: r.control,
                    fileCount: r.fileCount,
                    // Map missing fields expected by frontend
                    title: r.description || r.evidenceId,
                    collectionFrequency: 'On Demand', // Default
                    lastVerificationDate: r.lastVerified
                }));
            }),

        create: publicProcedure
            .input(z.object({
                clientId: z.number(),
                clientControlId: z.number(),
                evidenceId: z.string(),
                description: z.string().optional(),
                type: z.string().optional(),
                status: z.string().optional(),
                owner: z.string().optional(),
                location: z.string().optional(),
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [newEvidence] = await dbConn.insert(schema.evidence).values({
                    ...input,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any).returning();
                return newEvidence;
            }),

        delete: publicProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                await dbConn.delete(schema.evidence)
                    .where(eq(schema.evidence.id, input.id));
                return { success: true };
            }),

        updateStatus: publicProcedure
            .input(z.object({
                evidenceId: z.number(),
                status: z.enum(['verified', 'rejected', 'collected', 'pending', 'expired', 'not_applicable'])
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                await dbConn.update(schema.evidence)
                    .set({
                        status: input.status,
                        lastVerified: input.status === 'verified' ? new Date() : null,
                        updatedAt: new Date()
                    } as any)
                    .where(eq(schema.evidence.id, input.evidenceId));
                return { success: true };
            }),

        getFiles: publicProcedure
            .input(z.object({ evidenceId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                return dbConn.select().from(schema.evidenceFiles)
                    .where(eq(schema.evidenceFiles.evidenceId, input.evidenceId));
            }),

        analyze: publicProcedure
            .input(z.object({
                evidenceId: z.number(),
                controlName: z.string().optional(),
                controlDescription: z.string().optional(),
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                const [evidenceItem] = await dbConn.select().from(schema.evidence).where(eq(schema.evidence.id, input.evidenceId));

                if (!evidenceItem) throw new Error("Evidence not found");

                const content = (evidenceItem as any).extractedText || (evidenceItem as any).description || "No extracted content available for this file.";

                const systemPrompt = "You are an expert compliance auditor. Analyze the provided evidence content against the control requirements. Be strict but fair.";
                const userPrompt = `
Control Name: ${input.controlName || 'Unknown'}
Control Description: ${input.controlDescription || 'No description provided'}

Evidence Content/Description:
${content.substring(0, 5000)}

Analyze if this evidence satisfies the control requirements.
Provide a structured JSON response:
{
  "isCompliant": boolean (true if sufficient, false if gaps exist),
  "reasoning": "Concise summary of why it complies or fails",
  "keyFindings": ["List of specific observations", "Positive or negative points"],
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}
`;

                try {
                    const response = await llmService.generate({
                        systemPrompt,
                        userPrompt,
                        temperature: 0.2,
                        jsonMode: true,
                        feature: "evidence_analysis"
                    });

                    let analysis;
                    try {
                        analysis = JSON.parse(response.text);
                    } catch (e) {
                        // Fallback if JSON parsing fails
                        analysis = {
                            isCompliant: false,
                            reasoning: "Failed to parse AI response. " + response.text.substring(0, 100),
                            keyFindings: ["AI Analysis Error"],
                            confidence: "LOW"
                        };
                    }

                    return {
                        analysis,
                        provider: "ComplianceOS AI",
                        model: "Standard"
                    };
                } catch (error: any) {
                    console.error("Evidence analysis failed:", error);
                    // Return a mock failure response instead of crashing
                    return {
                        analysis: {
                            isCompliant: false,
                            reasoning: "AI Service unavailable or failed. Please try again later.",
                            keyFindings: ["Analysis failed"],
                            confidence: "LOW"
                        },
                        provider: "System",
                        model: "Error"
                    };
                }
            }),

        suggestions: t.router({
            // Get suggestions for a specific control
            get: publicProcedure
                .input(z.object({
                    controlId: z.string().optional(),
                    controlName: z.string().optional(),
                    framework: z.string().optional(),
                    category: z.string().optional()
                }))
                .query(async ({ input }: any) => {
                    const dbConn = await getDb();

                    // Fetch all templates
                    const templates = await dbConn.select().from(schema.evidenceTemplates);

                    // Filter templates by matching control pattern
                    const searchText = [
                        input.controlId,
                        input.controlName,
                        input.category
                    ].filter(Boolean).join(' ').toLowerCase();

                    const matched = templates.filter((t: any) => {
                        // Check framework match (if specified)
                        if (t.framework && input.framework && t.framework !== input.framework) {
                            return false;
                        }

                        // Check pattern match (case-insensitive)
                        try {
                            const pattern = new RegExp(t.controlPattern, 'i');
                            return pattern.test(searchText);
                        } catch {
                            // Fallback to simple contains match
                            return searchText.includes(t.controlPattern.toLowerCase());
                        }
                    });

                    // Sort by priority (higher first)
                    return matched.sort((a: any, b: any) => (b.priority || 50) - (a.priority || 50));
                }),

            // List all templates (admin)
            list: publicProcedure.query(async () => {
                const dbConn = await getDb();
                return dbConn.select().from(schema.evidenceTemplates);
            }),

            // Create template
            create: adminProcedure
                .input(z.object({
                    name: z.string(),
                    controlPattern: z.string(),
                    framework: z.string().optional(),
                    category: z.string().optional(),
                    suggestedSources: z.array(z.string()).optional(),
                    sampleDescription: z.string().optional(),
                    integrationType: z.string().optional(),
                    priority: z.number().optional(),
                }))
                .mutation(async ({ input }: any) => {
                    const dbConn = await getDb();

                    const [template] = await dbConn.insert(schema.evidenceTemplates).values({
                        ...input,
                    }).returning();

                    return template;
                }),

            // Delete template
            delete: adminProcedure
                .input(z.object({ id: z.number() }))
                .mutation(async ({ input }: any) => {
                    const dbConn = await getDb();

                    await dbConn.delete(schema.evidenceTemplates)
                        .where(eq(schema.evidenceTemplates.id, input.id));

                    return { success: true };
                }),

            // Seed common templates
            seed: adminProcedure.mutation(async () => {
                const dbConn = await getDb();

                const commonTemplates = [
                    {
                        name: "Access Control Evidence",
                        controlPattern: "access.*control|AC-|A\\.9|CC6",
                        suggestedSources: ["User access review logs", "Role matrix spreadsheet", "IAM policy screenshots"],
                        sampleDescription: "Screenshot of IAM policy showing least privilege access configuration",
                        integrationType: "file",
                        priority: 80
                    },
                    {
                        name: "Encryption Evidence",
                        controlPattern: "encrypt|cryptograph|SC-|A\\.10|CC6\\.1",
                        suggestedSources: ["TLS certificate export", "Encryption configuration screenshots", "Key management policy"],
                        sampleDescription: "Export of SSL/TLS certificate showing AES-256 encryption",
                        integrationType: "file",
                        priority: 75
                    },
                    {
                        name: "Logging & Monitoring",
                        controlPattern: "log|monitor|audit.*trail|AU-|A\\.12|CC7",
                        suggestedSources: ["CloudWatch/SIEM screenshot", "Audit log export", "Alert configuration"],
                        sampleDescription: "Screenshot of SIEM dashboard showing security event monitoring",
                        integrationType: "api",
                        priority: 70
                    },
                    {
                        name: "Backup Evidence",
                        controlPattern: "backup|recover|continuity|CP-|A\\.12\\.3",
                        suggestedSources: ["Backup job logs", "Recovery test results", "Backup policy document"],
                        sampleDescription: "Backup job completion logs showing daily automated backups",
                        integrationType: "api",
                        priority: 65
                    },
                    {
                        name: "Vulnerability Management",
                        controlPattern: "vulnerab|scan|patch|RA-5|SI-|A\\.12\\.6",
                        suggestedSources: ["Vulnerability scan report", "Patch management logs", "Remediation tickets"],
                        sampleDescription: "Quarterly vulnerability scan report from Qualys/Nessus",
                        integrationType: "file",
                        priority: 80
                    },
                    {
                        name: "Security Training",
                        controlPattern: "train|awareness|AT-|A\\.7\\.2",
                        suggestedSources: ["Training completion reports", "LMS screenshots", "Signed acknowledgements"],
                        sampleDescription: "Training platform export showing employee completion rates",
                        integrationType: "file",
                        priority: 50
                    },
                    {
                        name: "Change Management",
                        controlPattern: "change.*manage|CM-|A\\.12\\.1|CC8",
                        suggestedSources: ["Change tickets (Jira/ServiceNow)", "CAB meeting minutes", "Approval workflows"],
                        sampleDescription: "Sample change ticket showing approval workflow and testing evidence",
                        integrationType: "api",
                        priority: 60
                    },
                    {
                        name: "Incident Response",
                        controlPattern: "incident|IR-|A\\.16|CC7\\.4",
                        suggestedSources: ["Incident tickets", "Post-mortem reports", "Runbook documentation"],
                        sampleDescription: "Incident response playbook and sample incident ticket",
                        integrationType: "file",
                        priority: 70
                    }
                ];

                let inserted = 0;
                for (const t of commonTemplates) {
                    try {
                        await dbConn.insert(schema.evidenceTemplates).values(t);
                        inserted++;
                    } catch {
                        // Skip duplicates
                    }
                }

                return { inserted };
            }),
        }),

        addComment: protectedProcedure.input(z.object({
            evidenceId: z.number(),
            content: z.string()
        })).mutation(async ({ input, ctx }: any) => {
            const dbConn = await getDb();
            const [comment] = await dbConn.insert(schema.evidenceComments).values({
                evidenceId: input.evidenceId,
                userId: ctx.user.id,
                content: input.content
            } as any).returning();
            return comment;
        }),

        getComments: protectedProcedure.input(z.object({
            evidenceId: z.number()
        })).query(async ({ input }: any) => {
            const dbConn = await getDb();
            const comments = await dbConn.select({
                id: schema.evidenceComments.id,
                content: schema.evidenceComments.content,
                createdAt: schema.evidenceComments.createdAt,
                userId: schema.evidenceComments.userId,
                userName: schema.users.name,
                userEmail: schema.users.email
            })
                .from(schema.evidenceComments)
                .leftJoin(schema.users, eq(schema.evidenceComments.userId, schema.users.id))
                .where(eq(schema.evidenceComments.evidenceId, input.evidenceId))
                .orderBy(desc(schema.evidenceComments.createdAt));
            return comments;
        }),

        getAllComments: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input, ctx }: any) => {
            const dbConn = await getDb();

            // Get all evidence IDs for this client
            const clientEvidence = await dbConn.select({ id: schema.evidence.id }).from(schema.evidence)
                .where(eq(schema.evidence.clientId, input.clientId));

            const evidenceIds = clientEvidence.map((e: any) => e.id);

            if (evidenceIds.length === 0) return [];

            const comments = await dbConn.select({
                id: schema.evidenceComments.id,
                content: schema.evidenceComments.content,
                createdAt: schema.evidenceComments.createdAt,
                userName: schema.users.name,
                userEmail: schema.users.email,
                evidenceId: schema.evidenceComments.evidenceId,
                evidenceTitle: schema.evidence.evidenceId
            })
                .from(schema.evidenceComments)
                .innerJoin(schema.evidence, eq(schema.evidenceComments.evidenceId, schema.evidence.id))
                .leftJoin(schema.users, eq(schema.evidenceComments.userId, schema.users.id))
                .where(inArray(schema.evidenceComments.evidenceId, evidenceIds))
                .orderBy(desc(schema.evidenceComments.createdAt))
                .limit(50);

            return comments;
        })
    });
};

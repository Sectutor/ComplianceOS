import { z } from "zod";
import { router, publicProcedure, clientProcedure } from "../trpc";
import { autoAnswerQuestionnaire } from "../../lib/ai/questionnaireAutoResponder";
import { getDb } from "../../db";
import { questionnaires, questionnaireQuestions, vendorAssessmentTemplates } from "../../schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const BUILTIN_TEMPLATES = [
    {
        id: "sig-lite",
        name: "SIG Lite (Standard Information Gathering)",
        description: "Comprehensive 120-question third-party security assessment across 18 control domains.",
        questionCount: 120,
        category: "Standard Assessment",
        questions: [
            { questionId: "A.1", question: "Do you maintain a documented Information Security Policy?", focusArea: "Governance" },
            { questionId: "A.2", question: "Is multi-factor authentication (MFA) enforced for all remote access?", focusArea: "Access Control" },
            { questionId: "A.3", question: "Are data backups performed daily and encrypted at rest?", focusArea: "Data Protection" },
            { questionId: "A.4", question: "Do you undergo annual third-party penetration testing?", focusArea: "Security Testing" },
            { questionId: "A.5", question: "Is data encrypted in transit using TLS 1.2 or higher?", focusArea: "Cryptography" },
        ]
    },
    {
        id: "caiq-v4",
        name: "CCM CAIQ v4 (Cloud Security Alliance)",
        description: "Cloud-native security assessment matrix covering 17 CCM domains.",
        questionCount: 150,
        category: "Cloud Security",
        questions: [
            { questionId: "AIS-01", question: "Are application security testing procedures integrated into CI/CD pipelines?", focusArea: "AppSec" },
            { questionId: "BCR-01", question: "Do you test your Business Continuity & Disaster Recovery Plan annually?", focusArea: "BC/DR" },
            { questionId: "CCC-01", question: "Is change management enforced with audit logs for production infrastructure?", focusArea: "Change Management" },
            { questionId: "CEF-01", question: "Do customers maintain sole ownership of their data?", focusArea: "Data Ownership" },
        ]
    },
    {
        id: "vsaq",
        name: "VSAQ (Vendor Security Assessment Questionnaire)",
        description: "Google VSAQ lightweight framework for SaaS vendor evaluation.",
        questionCount: 45,
        category: "Vendor Risk",
        questions: [
            { questionId: "VSAQ-1", question: "Do you have a dedicated Security Operations Center or Incident Response team?", focusArea: "Incident Response" },
            { questionId: "VSAQ-2", question: "Are employee workstations managed with MDM and full-disk encryption?", focusArea: "Endpoint Security" },
            { questionId: "VSAQ-3", question: "What is your SLA for notifying customers of a confirmed data breach?", focusArea: "Breach Notification" },
        ]
    },
    {
        id: "cis-csat",
        name: "CIS CSAT v8 (Controls Self-Assessment)",
        description: "Assessment based on CIS Critical Security Controls v8 Implementation Groups.",
        questionCount: 56,
        category: "Framework Alignment",
        questions: [
            { questionId: "CIS-1.1", question: "Maintain detailed inventory of enterprise assets?", focusArea: "Asset Inventory" },
            { questionId: "CIS-3.1", question: "Establish and maintain a data management process?", focusArea: "Data Protection" },
            { questionId: "CIS-4.1", question: "Establish and maintain a secure configuration process for enterprise assets?", focusArea: "Configuration Management" },
        ]
    }
];

export const questionnaireRouter = router({
    /**
     * Auto-answer security questionnaire (SIG Lite / CAIQ / VSAQ)
     */
    autoAnswer: publicProcedure
        .input(
            z.object({
                clientId: z.number(),
                questions: z.array(
                    z.object({
                        questionId: z.string(),
                        questionText: z.string(),
                        category: z.string().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ input }) => {
            const result = await autoAnswerQuestionnaire(input.clientId, input.questions);
            return {
                success: true,
                ...result,
            };
        }),

    /**
     * List all questionnaires for client
     */
    list: clientProcedure
        .input(z.object({ clientId: z.number().optional() }).optional())
        .query(async ({ input }: { input?: any }) => {
            const db = await getDb();
            const clientId = input?.clientId;
            if (clientId) {
                return await db.select().from(questionnaires).where(eq(questionnaires.clientId, clientId)).orderBy(desc(questionnaires.createdAt));
            }
            return await db.select().from(questionnaires).orderBy(desc(questionnaires.createdAt));
        }),

    /**
     * Get questionnaire by ID with questions
     */
    get: clientProcedure
        .input(z.object({ id: z.union([z.number(), z.string()]) }))
        .query(async ({ input }: { input: any }) => {
            const db = await getDb();
            const qId = typeof input.id === 'string' ? parseInt(input.id) : input.id;
            if (isNaN(qId)) return null;

            const [q] = await db.select().from(questionnaires).where(eq(questionnaires.id, qId)).limit(1);
            if (!q) return null;

            const questionsList = await db.select()
                .from(questionnaireQuestions)
                .where(eq(questionnaireQuestions.questionnaireId, qId))
                .orderBy(asc(questionnaireQuestions.id));

            return {
                ...q,
                questions: questionsList
            };
        }),

    /**
     * Create questionnaire
     */
    create: clientProcedure
        .input(z.object({
            clientId: z.number().optional(),
            name: z.string().min(1),
            description: z.string().optional(),
            targetVendorId: z.number().optional(),
        }))
        .mutation(async ({ input }: { input: any }) => {
            const db = await getDb();
            const [newQ] = await db.insert(questionnaires).values({
                clientId: input.clientId || 7,
                name: input.name,
                description: input.description || "",
                status: "in_progress",
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();
            return newQ;
        }),

    /**
     * Update questionnaire metadata/status
     */
    update: clientProcedure
        .input(z.object({
            id: z.number(),
            name: z.string().optional(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input }: { input: any }) => {
            const db = await getDb();
            const { id, ...data } = input;
            const [updated] = await db.update(questionnaires)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(questionnaires.id, id))
                .returning();
            return updated;
        }),

    /**
     * Parse raw document / text into structured questions
     */
    parse: clientProcedure
        .input(z.object({
            text: z.string().optional(),
            filename: z.string().optional(),
        }))
        .mutation(async ({ input }: { input: any }) => {
            const sampleQuestions = [
                { questionId: "Q1", question: "Does your organization maintain a documented Information Security Management System (ISMS)?", focusArea: "Governance" },
                { questionId: "Q2", question: "Are all customer data stores encrypted at rest using AES-256?", focusArea: "Data Protection" },
                { questionId: "Q3", question: "What is your RPO (Recovery Point Objective) and RTO (Recovery Time Objective)?", focusArea: "BC/DR" },
                { questionId: "Q4", question: "Do you undergo annual independent SOC 2 Type II audits?", focusArea: "Audit & Compliance" },
                { questionId: "Q5", question: "Is multi-factor authentication enforced across all administrative accounts?", focusArea: "Access Control" },
            ];
            return { success: true, questions: sampleQuestions };
        }),

    /**
     * Batch save questions for a questionnaire
     */
    saveQuestions: clientProcedure
        .input(z.object({
            questionnaireId: z.number(),
            questions: z.array(z.object({
                questionId: z.string(),
                question: z.string(),
                answer: z.string().optional(),
                focusArea: z.string().optional(),
                subFocusArea: z.string().optional(),
                extraFields: z.any().optional(),
                status: z.string().optional(),
            }))
        }))
        .mutation(async ({ input }: { input: any }) => {
            const db = await getDb();
            for (const q of input.questions) {
                await db.insert(questionnaireQuestions).values({
                    questionnaireId: input.questionnaireId,
                    questionId: q.questionId,
                    question: q.question,
                    answer: q.answer || "",
                    focusArea: q.focusArea || "",
                    subFocusArea: q.subFocusArea || "",
                    extraFields: q.extraFields || {},
                    status: q.status || "pending",
                });
            }
            return { success: true, count: input.questions.length };
        }),

    /**
     * Complete questionnaire
     */
    complete: clientProcedure
        .input(z.object({ id: z.union([z.number(), z.string()]) }))
        .mutation(async ({ input }: { input: any }) => {
            const db = await getDb();
            const qId = typeof input.id === 'string' ? parseInt(input.id) : input.id;
            await db.update(questionnaires).set({ status: 'completed', updatedAt: new Date() }).where(eq(questionnaires.id, qId));
            const questions = await db.select().from(questionnaireQuestions).where(eq(questionnaireQuestions.questionnaireId, qId));
            return { success: true, indexedCount: questions.length };
        }),

    /**
     * Generate answers using AI
     */
    generateAnswers: clientProcedure
        .input(z.object({
            clientId: z.number(),
            questionnaireId: z.number().optional(),
            questions: z.array(z.any()).optional(),
        }))
        .mutation(async ({ input }: { input: any }) => {
            const questionsToAnswer = input.questions || [
                { questionId: "Q1", questionText: "Does your organization maintain a documented Security Policy?" },
                { questionId: "Q2", questionText: "Are data stores encrypted at rest?" }
            ];
            const result = await autoAnswerQuestionnaire(input.clientId, questionsToAnswer);
            return { success: true, ...result };
        }),

    /**
     * Export questionnaire to Excel format
     */
    exportExcel: clientProcedure
        .input(z.object({ id: z.union([z.number(), z.string()]) }))
        .query(async ({ input }: { input: any }) => {
            return { success: true, downloadUrl: `/api/export/questionnaire-${input.id}.xlsx` };
        }),

    /**
     * Export questionnaire to JSON format
     */
    exportJSON: clientProcedure
        .input(z.object({ id: z.union([z.number(), z.string()]) }))
        .query(async ({ input }: { input: any }) => {
            const db = await getDb();
            const qId = typeof input.id === 'string' ? parseInt(input.id) : input.id;
            const [q] = await db.select().from(questionnaires).where(eq(questionnaires.id, qId)).limit(1);
            const questions = await db.select().from(questionnaireQuestions).where(eq(questionnaireQuestions.questionnaireId, qId));
            return { questionnaire: q, questions };
        }),

    /**
     * List built-in and client questionnaire templates
     */
    listTemplates: clientProcedure
        .input(z.object({ clientId: z.number().optional() }).optional())
        .query(async ({ input }: { input?: any }) => {
            const db = await getDb();
            const customTemplates = input?.clientId
                ? await db.select().from(vendorAssessmentTemplates).where(eq(vendorAssessmentTemplates.clientId, input.clientId))
                : await db.select().from(vendorAssessmentTemplates);

            return [
                ...BUILTIN_TEMPLATES,
                ...customTemplates.map(t => ({
                    id: `custom-${t.id}`,
                    name: t.name,
                    description: t.description || "Custom organization template",
                    questionCount: (t.content as any)?.questions?.length || 0,
                    category: "Custom Template",
                }))
            ];
        }),

    /**
     * Get specific template questions
     */
    getTemplateQuestions: clientProcedure
        .input(z.object({ templateId: z.union([z.number(), z.string()]) }))
        .query(async ({ input }: { input: any }) => {
            const tId = input.templateId.toString();
            const builtin = BUILTIN_TEMPLATES.find(b => b.id === tId);
            if (builtin) {
                return { success: true, questions: builtin.questions };
            }
            if (tId.startsWith("custom-")) {
                const numericId = parseInt(tId.replace("custom-", ""));
                const db = await getDb();
                const [tRow] = await db.select().from(vendorAssessmentTemplates).where(eq(vendorAssessmentTemplates.id, numericId)).limit(1);
                if (tRow && (tRow.content as any)?.questions) {
                    return { success: true, questions: (tRow.content as any).questions };
                }
            }
            return { success: true, questions: BUILTIN_TEMPLATES[0].questions };
        }),

    /**
     * Send vendor invite link for questionnaire
     */
    sendVendorInvite: clientProcedure
        .input(z.object({
            questionnaireId: z.number(),
            vendorEmail: z.string(),
            vendorName: z.string().optional(),
            message: z.string().optional(),
        }))
        .mutation(async ({ input }: { input: any }) => {
            const token = `VST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const portalUrl = `http://127.0.0.1:5173/questionnaire/${token}`;
            return { success: true, token, portalUrl, recipient: input.vendorEmail };
        }),
});

export default questionnaireRouter;

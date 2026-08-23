import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, t, publicProcedure, clientProcedure } from "../trpc";
import { autoAnswerQuestionnaire } from "../../lib/ai/questionnaireAutoResponder";
import { getDb } from "../../db";
import { questionnaires, questionnaireQuestions, vendorAssessmentTemplates } from "../../schema";
import { eq, desc, asc } from "drizzle-orm";
import { BUILTIN_TEMPLATES } from "../../lib/questionnaire/templates";
import {
    scoreQuestionnaire,
    summarizeScore,
    type QuestionnaireAnswer,
} from "../../lib/questionnaire/questionnaireScoring";

// Re-export for any consumer that imported the built-in templates from the router.
export { BUILTIN_TEMPLATES } from "../../lib/questionnaire/templates";

/**
 * Factory for the questionnaire router.
 *
 * Mirrors the `createVendorRiskRouter(t, clientProcedure)` pattern so the
 * router can be instantiated with a test tRPC harness in unit tests.
 */
export function createQuestionnaireRouter(t: any, clientProcedure: any, publicProcedure: any) {
    return t.router({
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
                direction: z.enum(["inbound", "outbound"]).optional(),
                senderName: z.string().optional(),
                productName: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
                const db = await getDb();
                // Resolve tenant from input, else the request context — never a
                // hardcoded id (that leaked questionnaires into client 7).
                const clientId = input.clientId ?? ctx?.clientId;
                if (!clientId) {
                    throw new TRPCError({ code: 'BAD_REQUEST', message: 'clientId is required' });
                }
                const [newQ] = await db.insert(questionnaires).values({
                    clientId,
                    name: input.name,
                    description: input.description || "",
                    direction: input.direction ?? "inbound",
                    senderName: input.senderName,
                    productName: input.productName,
                    status: "in_progress",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any).returning();
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
         * Parse raw document / text into structured questions.
         *
         * NOT IMPLEMENTED: real document parsing (PDF/XLSX/CSV extraction) is not
         * wired up yet. The input contract accepts what the UI sends so uploads
         * are not silently discarded by validation, but the response is clearly
         * flagged as sample data — callers must not present it as parsed content.
         */
        parse: clientProcedure
            .input(z.object({
                text: z.string().optional(),
                filename: z.string().optional(),
                fileBase64: z.string().optional(),
                fileType: z.enum(["pdf", "xlsx", "csv", "docx", "txt"]).optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const sampleQuestions = [
                    { questionId: "Q1", question: "Does your organization maintain a documented Information Security Management System (ISMS)?", focusArea: "Governance" },
                    { questionId: "Q2", question: "Are all customer data stores encrypted at rest using AES-256?", focusArea: "Data Protection" },
                    { questionId: "Q3", question: "What is your RPO (Recovery Point Objective) and RTO (Recovery Time Objective)?", focusArea: "BC/DR" },
                    { questionId: "Q4", question: "Do you undergo annual independent SOC 2 Type II audits?", focusArea: "Audit & Compliance" },
                    { questionId: "Q5", question: "Is multi-factor authentication enforced across all administrative accounts?", focusArea: "Access Control" },
                ];
                return {
                    success: true,
                    parsed: false,
                    source: "sample",
                    notice: input.fileBase64
                        ? "Document parsing is not implemented; returning sample questions. The uploaded file was not analysed."
                        : "Document parsing is not implemented; returning sample questions.",
                    receivedFilename: input.filename ?? null,
                    receivedFileType: input.fileType ?? null,
                    questions: sampleQuestions,
                };
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
                    ...BUILTIN_TEMPLATES.map(t => ({
                        ...t,
                        questionCount: t.questions.length, // always derived, never hardcoded
                    })),
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
                // Callers use either `questionnaireId` or `id` — accept both so the
                // invite is not generated against an undefined questionnaire.
                questionnaireId: z.number().optional(),
                id: z.number().optional(),
                clientId: z.number().optional(),
                vendorEmail: z.string(),
                vendorName: z.string().optional(),
                message: z.string().optional(),
                expiresInDays: z.number().min(1).max(365).optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const questionnaireId = input.questionnaireId ?? input.id;
                if (!questionnaireId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'questionnaireId (or id) is required',
                    });
                }

                const token = `VST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const expiresInDays = input.expiresInDays ?? 30;
                const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

                // Persist the token so the vendor portal link actually resolves.
                const db = await getDb();
                await db.update(questionnaires)
                    .set({
                        vendorToken: token,
                        vendorEmail: input.vendorEmail,
                        vendorName: input.vendorName,
                        vendorLinkExpiresAt: expiresAt,
                        updatedAt: new Date(),
                    } as any)
                    .where(eq(questionnaires.id, questionnaireId));

                const baseUrl = process.env.APP_BASE_URL
                    || process.env.VITE_APP_URL
                    || 'http://127.0.0.1:5173';
                const portalUrl = `${baseUrl.replace(/\/+$/, '')}/questionnaire/${token}`;

                return {
                    success: true,
                    token,
                    portalUrl,
                    recipient: input.vendorEmail,
                    questionnaireId,
                    expiresAt,
                };
            }),

        /**
         * Score a persisted questionnaire (client-scoped).
         *
         * Reads the questionnaire + answers and runs the deterministic scoring
         * engine. Never throws on DB/read failures: falls back to an empty score.
         * Returns null when the questionnaire does not exist (like `get`).
         */
        score: clientProcedure
            .input(z.object({ id: z.union([z.number(), z.string()]) }))
            .query(async ({ input }: { input: any }) => {
                const qId = typeof input.id === 'string' ? parseInt(input.id) : input.id;
                if (isNaN(qId)) {
                    const empty = scoreQuestionnaire([]);
                    return { questionnaireId: input.id, score: empty, summary: summarizeScore(empty) };
                }
                try {
                    const db = await getDb();
                    const [q] = await db.select().from(questionnaires).where(eq(questionnaires.id, qId)).limit(1);
                    if (!q) return null;

                    const rows = await db.select()
                        .from(questionnaireQuestions)
                        .where(eq(questionnaireQuestions.questionnaireId, qId));

                    const questions: QuestionnaireAnswer[] = rows.map(r => ({
                        questionId: r.questionId ?? String(r.id),
                        question: r.question,
                        focusArea: r.focusArea,
                        subFocusArea: r.subFocusArea,
                        answer: r.answer,
                        status: r.status,
                    }));

                    const score = scoreQuestionnaire(questions);
                    return { questionnaireId: qId, score, summary: summarizeScore(score) };
                } catch (err) {
                    console.error("[questionnaire.score] failed:", err);
                    const empty = scoreQuestionnaire([]);
                    return { questionnaireId: qId, score: empty, summary: summarizeScore(empty) };
                }
            }),

        /**
         * Score an arbitrary set of answers without touching the database.
         * Pure passthrough into the scoring engine; never throws.
         */
        scoreAnswers: clientProcedure
            .input(z.object({
                questions: z.array(z.object({
                    questionId: z.string(),
                    question: z.string().optional(),
                    focusArea: z.string().nullable().optional(),
                    subFocusArea: z.string().nullable().optional(),
                    answer: z.string().nullable().optional(),
                    status: z.string().nullable().optional(),
                })),
            }))
            .query(({ input }) => {
                const score = scoreQuestionnaire(input.questions);
                return { score, summary: summarizeScore(score) };
            }),
    });
}

/**
 * Default router instance (named export preserved so `routers.ts` keeps
 * working unchanged).
 */
export const questionnaireRouter = createQuestionnaireRouter(t, clientProcedure, publicProcedure);

export default questionnaireRouter;

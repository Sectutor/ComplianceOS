import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { router, t, publicProcedure, clientProcedure, PLATFORM_ADMIN_ROLES } from "../trpc";
import { autoAnswerQuestionnaire } from "../../lib/ai/questionnaireAutoResponder";
import { llmAnswerQuestionnaire } from "../../lib/ai/questionnaireLlmResponder";
import { getDb } from "../../db";
import {
    questionnaires,
    questionnaireQuestions,
    vendorAssessmentTemplates,
} from "../../schema";
import { and, eq, desc, asc, inArray, ne } from "drizzle-orm";
import { BUILTIN_TEMPLATES } from "../../lib/questionnaire/templates";
import {
    scoreQuestionnaire,
    summarizeScore,
    classifyAnswer,
    type QuestionnaireAnswer,
} from "../../lib/questionnaire/questionnaireScoring";
import {
    parseDocumentBuffer,
    parseTextQuestions,
    populateWorkbookInPlace,
} from "../../lib/questionnaire/excelPopulator";
import {
    MASTER_LIBRARY_QUESTIONNAIRE_NAME,
    normalizeQuestionText,
} from "../../lib/questionnaire/answerLibrary";
import { sendEmail } from "../../lib/email/transporter";
import * as XLSX from "xlsx";

// Re-export for any consumer that imported the built-in templates from the router.
export { BUILTIN_TEMPLATES } from "../../lib/questionnaire/templates";

const QUESTIONNAIRE_STATUSES = [
    "open",
    "in_progress",
    "completed",
    "archived",
    "vendor_pending",
    "pending_review",
] as const;

/** Questionnaires returnable by a single list call (hard cap against unbounded reads). */
const MAX_LIST_LIMIT = 500;

type Ctx = { clientId?: number; user?: { role?: string } | null } | undefined;

function isPlatformAdmin(ctx: Ctx): boolean {
    return PLATFORM_ADMIN_ROLES.includes(ctx?.user?.role || "");
}

/**
 * Tenant ownership guard. `ctx.clientId` is resolved by checkClientAccess
 * (input.clientId ?? membership). When it is known and differs from the row's
 * tenant — and the caller is not a platform admin — the access is cross-tenant
 * and must fail. Unknown ctx (unit-test harnesses) skips the check.
 */
function assertQuestionnaireAccess(ctx: Ctx, row: { clientId: number } | null | undefined): void {
    if (!row) return;
    if (isPlatformAdmin(ctx)) return;
    if (ctx?.clientId != null && row.clientId !== ctx.clientId) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "This questionnaire belongs to a different workspace.",
        });
    }
}

/** Load one questionnaire row (null when missing) after the id is parsed. */
async function loadQuestionnaire(db: any, qId: number) {
    const [row] = await db.select().from(questionnaires).where(eq(questionnaires.id, qId)).limit(1);
    return row ?? null;
}

/** Recompute completion % from non-empty answers and persist it. */
async function recomputeProgress(db: any, qId: number): Promise<number> {
    const rows = await db
        .select({ answer: questionnaireQuestions.answer })
        .from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.questionnaireId, qId));
    const total = rows.length;
    const answered = rows.filter(r => (r.answer || "").trim().length > 0).length;
    const progress = total === 0 ? 0 : Math.round((answered / total) * 100);
    await db
        .update(questionnaires)
        .set({ progress, updatedAt: new Date() })
        .where(eq(questionnaires.id, qId));
    return progress;
}

function parseId(id: number | string): number {
    const qId = typeof id === "string" ? parseInt(id, 10) : id;
    if (isNaN(qId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid questionnaire id" });
    return qId;
}

/**
 * Find (or lazily create) the per-client system questionnaire that stores
 * hand-curated Master Answer Profile entries. It is a completed inbound
 * questionnaire, so findLibraryMatches picks its entries up automatically —
 * with precedence over questionnaire-derived answers.
 */
async function ensureLibraryQuestionnaire(db: any, clientId: number) {
    const [existing] = await db
        .select()
        .from(questionnaires)
        .where(
            and(
                eq(questionnaires.clientId, clientId),
                eq(questionnaires.name, MASTER_LIBRARY_QUESTIONNAIRE_NAME)
            )
        )
        .limit(1);
    if (existing) return existing;

    const [created] = await db
        .insert(questionnaires)
        .values({
            clientId,
            name: MASTER_LIBRARY_QUESTIONNAIRE_NAME,
            description: "Master Answer Profile — curated company answers reused across questionnaires.",
            direction: "inbound",
            status: "completed",
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)
        .returning();
    return created;
}

/**
 * Factory for the questionnaire router.
 *
 * Mirrors the `createVendorRiskRouter(t, clientProcedure)` pattern so the
 * router can be instantiated with a test tRPC harness in unit tests.
 * `publicProcedure` backs the token-authenticated vendor portal procedures
 * (getByVendorToken / submitVendorResponses).
 */
export function createQuestionnaireRouter(t: any, clientProcedure: any, publicProcedure: any) {
    return t.router({
        /**
         * Auto-answer security questionnaire (SIG Lite / CAIQ / VSAQ).
         * Tenant-scoped: this triggers billable LLM spend, so it must never
         * be callable without authentication and client membership.
         * The rules engine runs in "review" mode — it returns honest
         * "Needs Review" placeholders, never fabricated control assertions.
         */
        autoAnswer: clientProcedure
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
         * List questionnaires for a tenant, optionally filtered by direction.
         * Tenant-scoped: falls back to ctx.clientId resolved by the access
         * middleware; never returns other tenants' rows.
         */
        list: clientProcedure
            .input(
                z.object({
                    clientId: z.number().optional(),
                    direction: z.enum(["inbound", "outbound"]).optional(),
                    limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
                }).optional()
            )
            .query(async ({ input, ctx }: { input?: any; ctx?: Ctx }) => {
                const db = await getDb();
                const clientId = input?.clientId ?? ctx?.clientId;
                if (!clientId) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "clientId is required" });
                }
                const conditions = [eq(questionnaires.clientId, clientId)];
                if (input?.direction) {
                    conditions.push(eq(questionnaires.direction, input.direction));
                }
                return await db
                    .select()
                    .from(questionnaires)
                    .where(and(...conditions))
                    .orderBy(desc(questionnaires.createdAt))
                    .limit(input?.limit ?? MAX_LIST_LIMIT);
            }),

        /**
         * Per-direction counts for dashboard tab badges.
         */
        counts: clientProcedure
            .input(z.object({ clientId: z.number().optional() }).optional())
            .query(async ({ input, ctx }: { input?: any; ctx?: Ctx }) => {
                const db = await getDb();
                const clientId = input?.clientId ?? ctx?.clientId;
                if (!clientId) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "clientId is required" });
                }
                const rows = await db
                    .select({ direction: questionnaires.direction })
                    .from(questionnaires)
                    .where(eq(questionnaires.clientId, clientId));
                const counts = { inbound: 0, outbound: 0, total: rows.length };
                for (const r of rows) {
                    if (r.direction === "outbound") counts.outbound++;
                    else counts.inbound++;
                }
                return counts;
            }),

        /**
         * Get questionnaire by ID with questions (tenant-checked).
         */
        get: clientProcedure
            .input(z.object({
                id: z.union([z.number(), z.string()]),
                clientId: z.number().optional(),
            }))
            .query(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const qId = parseId(input.id);

                const q = await loadQuestionnaire(db, qId);
                if (!q) return null;
                assertQuestionnaireAccess(ctx, q);

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
                vendorName: z.string().optional(),
                vendorEmail: z.string().optional(),
                dueDate: z.string().datetime().nullable().optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
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
                    vendorName: input.vendorName,
                    vendorEmail: input.vendorEmail,
                    dueDate: input.dueDate ? new Date(input.dueDate) : null,
                    status: "in_progress",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any).returning();
                return newQ;
            }),

        /**
         * Update questionnaire metadata (name, status, workflow fields).
         */
        update: clientProcedure
            .input(z.object({
                id: z.number(),
                clientId: z.number().optional(),
                name: z.string().optional(),
                description: z.string().optional(),
                status: z.enum(QUESTIONNAIRE_STATUSES).optional(),
                senderName: z.string().nullable().optional(),
                productName: z.string().nullable().optional(),
                vendorName: z.string().nullable().optional(),
                vendorEmail: z.string().nullable().optional(),
                dueDate: z.string().datetime().nullable().optional(),
                priority: z.enum(["high", "medium", "low"]).optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const qId = parseId(input.id);
                const q = await loadQuestionnaire(db, qId);
                if (!q) return null;
                assertQuestionnaireAccess(ctx, q);

                const { id, clientId: _ignored, dueDate, ...rest } = input;
                const data: Record<string, unknown> = { ...rest, updatedAt: new Date() };
                // Drop undefined optionals so we never overwrite values with undefined.
                for (const key of Object.keys(data)) {
                    if (data[key] === undefined) delete data[key];
                }
                if (dueDate !== undefined) {
                    data.dueDate = dueDate === null ? null : new Date(dueDate);
                }

                const [updated] = await db.update(questionnaires)
                    .set(data)
                    .where(eq(questionnaires.id, qId))
                    .returning();
                return updated;
            }),

        /**
         * Delete a questionnaire and its questions (cascade).
         */
        delete: clientProcedure
            .input(z.object({
                id: z.union([z.number(), z.string()]),
                clientId: z.number().optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const qId = parseId(input.id);
                const q = await loadQuestionnaire(db, qId);
                if (!q) return { success: false, deleted: 0 };
                assertQuestionnaireAccess(ctx, q);

                await db.delete(questionnaireQuestions).where(eq(questionnaireQuestions.questionnaireId, qId));
                await db.delete(questionnaires).where(eq(questionnaires.id, qId));
                return { success: true, deleted: 1 };
            }),

        /**
         * Parse raw document / text / Excel into structured questions.
         * Returns an empty question set (parsed: false) when extraction fails —
         * we never silently substitute fabricated sample questions.
         */
        parse: clientProcedure
            .input(z.object({
                text: z.string().optional(),
                filename: z.string().optional(),
                fileBase64: z.string().optional(),
                fileType: z.enum(["pdf", "xlsx", "csv", "docx", "txt"]).optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                let parsedQuestions: any[] = [];
                let sheetName: string | undefined;

                if (input.fileBase64) {
                    const buf = Buffer.from(input.fileBase64, 'base64');
                    const res = parseDocumentBuffer(buf, input.filename || 'questionnaire.xlsx');
                    parsedQuestions = res.questions;
                    sheetName = res.sheetName;
                } else if (input.text) {
                    parsedQuestions = parseTextQuestions(input.text);
                }

                if (parsedQuestions.length > 0) {
                    return {
                        success: true,
                        parsed: true,
                        source: "document",
                        receivedFilename: input.filename ?? null,
                        receivedFileType: input.fileType ?? null,
                        sheetName,
                        totalCount: parsedQuestions.length,
                        questions: parsedQuestions,
                    };
                }

                return {
                    success: true,
                    parsed: false,
                    source: "none",
                    notice:
                        "Could not extract questions from the input. Try the In-Place Excel Populator, or paste the question text directly.",
                    receivedFilename: input.filename ?? null,
                    receivedFileType: input.fileType ?? null,
                    questions: [],
                };
            }),

        /**
         * In-Place Excel Populator:
         * Populates an uploaded .xlsx workbook in-place preserving all styling, formulas and sheets.
         * Responses are explicitly framed as unverified AI drafts.
         */
        populateWorkbook: clientProcedure
            .input(z.object({
                fileBase64: z.string(),
                filename: z.string().optional(),
                sheetName: z.string().optional(),
                maxQuestions: z.number().optional(),
                context: z.object({
                    companyName: z.string().optional(),
                    cloudProvider: z.string().optional(),
                    idp: z.string().optional(),
                    codeHost: z.string().optional(),
                    siemTool: z.string().optional(),
                    pentestFrequency: z.string().optional(),
                }).optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                try {
                    const result = populateWorkbookInPlace(
                        input.fileBase64,
                        input.context || {},
                        {
                            maxQuestions: input.maxQuestions,
                            sheetName: input.sheetName,
                        }
                    );
                    return result;
                } catch (err: any) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `Failed to populate Excel workbook: ${err.message}`,
                    });
                }
            }),

        /**
         * Batch save questions for a questionnaire (idempotent upsert).
         *
         * Rows are matched on (questionnaireId, questionId) when questionId is
         * present — repeated saves UPDATE instead of duplicating; rows without
         * a questionId are always appended. Fields not present in the payload
         * (comment, assignee, approval, …) are left untouched.
         */
        saveQuestions: clientProcedure
            .input(z.object({
                questionnaireId: z.number(),
                clientId: z.number().optional(),
                questions: z.array(z.object({
                    questionId: z.string().optional(),
                    question: z.string(),
                    answer: z.string().optional(),
                    comment: z.string().optional(),
                    focusArea: z.string().optional(),
                    subFocusArea: z.string().optional(),
                    extraFields: z.any().optional(),
                    status: z.string().optional(),
                    confidence: z.number().optional(),
                    sources: z.array(z.any()).optional(),
                }))
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const q = await loadQuestionnaire(db, input.questionnaireId);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
                }
                assertQuestionnaireAccess(ctx, q);

                const existing = await db
                    .select({ id: questionnaireQuestions.id, questionId: questionnaireQuestions.questionId })
                    .from(questionnaireQuestions)
                    .where(eq(questionnaireQuestions.questionnaireId, input.questionnaireId));

                // Map non-empty questionIds to their row id for the update path.
                const existingByQuestionId = new Map<string, number>();
                for (const row of existing) {
                    if (row.questionId && !existingByQuestionId.has(row.questionId)) {
                        existingByQuestionId.set(row.questionId, row.id);
                    }
                }

                const toInsert: any[] = [];
                let updated = 0;

                for (const q of input.questions) {
                    const rowId = q.questionId ? existingByQuestionId.get(q.questionId) : undefined;
                    if (rowId) {
                        const patch: Record<string, unknown> = { question: q.question };
                        if (q.answer !== undefined) patch.answer = q.answer;
                        if (q.comment !== undefined) patch.comment = q.comment;
                        if (q.focusArea !== undefined) patch.focusArea = q.focusArea || "";
                        if (q.subFocusArea !== undefined) patch.subFocusArea = q.subFocusArea || "";
                        if (q.extraFields !== undefined) patch.extraFields = q.extraFields || {};
                        if (q.status !== undefined) patch.status = q.status;
                        if (q.confidence !== undefined) patch.confidence = q.confidence;
                        if (q.sources !== undefined) patch.sources = q.sources;
                        await db.update(questionnaireQuestions).set(patch).where(eq(questionnaireQuestions.id, rowId));
                        updated++;
                    } else {
                        toInsert.push({
                            questionnaireId: input.questionnaireId,
                            questionId: q.questionId || "",
                            question: q.question,
                            answer: q.answer || "",
                            comment: q.comment || "",
                            focusArea: q.focusArea || "",
                            subFocusArea: q.subFocusArea || "",
                            extraFields: q.extraFields || {},
                            status: q.status || "pending",
                            confidence: q.confidence ?? null,
                            sources: q.sources || [],
                        });
                    }
                }

                if (toInsert.length > 0) {
                    await db.insert(questionnaireQuestions).values(toInsert);
                }

                const progress = await recomputeProgress(db, input.questionnaireId);
                return {
                    success: true,
                    count: input.questions.length,
                    inserted: toInsert.length,
                    updated,
                    progress,
                };
            }),

        /**
         * Complete questionnaire: locks status, recomputes progress, and makes
         * the non-empty answers available to the answer library (completed
         * questionnaires are the library — no separate indexing step).
         */
        complete: clientProcedure
            .input(z.object({
                id: z.union([z.number(), z.string()]),
                clientId: z.number().optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const qId = parseId(input.id);
                const q = await loadQuestionnaire(db, qId);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
                }
                assertQuestionnaireAccess(ctx, q);

                await db.update(questionnaires)
                    .set({ status: 'completed', updatedAt: new Date() })
                    .where(eq(questionnaires.id, qId));
                const progress = await recomputeProgress(db, qId);
                const questions = await db.select().from(questionnaireQuestions).where(eq(questionnaireQuestions.questionnaireId, qId));
                const answered = questions.filter(qq => (qq.answer || "").trim().length > 0).length;
                return {
                    success: true,
                    indexedCount: answered,
                    libraryCount: answered,
                    progress,
                };
            }),

        /**
         * Generate answers using AI.
         *
         * engine=auto (default): answer library first, then the LLM in
         * batches; questions the LLM cannot support come back as honest
         * "Needs Review" placeholders. engine=rules: honest placeholders only.
         */
        generateAnswers: clientProcedure
            .input(z.object({
                clientId: z.number(),
                questionnaireId: z.number().optional(),
                questions: z.array(z.any()).optional(),
                engine: z.enum(["llm", "rules", "auto"]).default("auto"),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                let questionsToAnswer = input.questions;

                // Default: pull questions from the stored questionnaire
                if (!questionsToAnswer && input.questionnaireId) {
                    const qId = input.questionnaireId;
                    const stored = await db
                        .select()
                        .from(questionnaireQuestions)
                        .where(eq(questionnaireQuestions.questionnaireId, qId));
                    questionsToAnswer = stored.map((q: any) => ({
                        questionId: q.questionId || String(q.id),
                        questionText: q.question || q.questionId,
                        category: q.focusArea || undefined,
                    }));
                }

                const safeQuestions = (questionsToAnswer || []).filter(
                    (q: any) => q && (q.questionText || q.question)
                );
                if (safeQuestions.length === 0) {
                    return {
                        success: true,
                        answeredQuestions: [],
                        overallConfidence: 0,
                        engine: input.engine,
                        notice: "No questions to answer.",
                    };
                }

                // engine=auto: answer library + LLM; honest placeholders on gaps.
                if (input.engine === "llm" || input.engine === "auto") {
                    const result = await llmAnswerQuestionnaire(input.clientId, safeQuestions);
                    return { success: true, ...result };
                }

                const result = await autoAnswerQuestionnaire(input.clientId, safeQuestions);
                return { success: true, ...result, engine: "rules" };
            }),

        /**
         * Export a questionnaire as a formatted .xlsx workbook (base64).
         */
        exportWorkbook: clientProcedure
            .input(z.object({
                id: z.union([z.number(), z.string()]),
                clientId: z.number().optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const qId = parseId(input.id);
                const q = await loadQuestionnaire(db, qId);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
                }
                assertQuestionnaireAccess(ctx, q);

                const questions = await db
                    .select()
                    .from(questionnaireQuestions)
                    .where(eq(questionnaireQuestions.questionnaireId, qId))
                    .orderBy(asc(questionnaireQuestions.id));

                const header = ["ID", "Focus Area", "Sub-Focus Area", "Question", "Answer", "Status", "Confidence"];
                const rows = questions.map(row => [
                    row.questionId || `Q${row.id}`,
                    row.focusArea || "",
                    row.subFocusArea || "",
                    row.question,
                    row.answer || "",
                    row.status || "pending",
                    typeof row.confidence === "number" ? `${row.confidence}%` : "",
                ]);

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
                ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 70 }, { wch: 70 }, { wch: 12 }, { wch: 12 }];
                XLSX.utils.book_append_sheet(wb, ws, "Questionnaire");

                const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
                const safeName = (q.name || `questionnaire-${qId}`).replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_");
                return {
                    success: true,
                    filename: `${safeName || `questionnaire_${qId}`}.xlsx`,
                    base64: buffer.toString("base64"),
                    questionCount: questions.length,
                };
            }),

        /**
         * Export questionnaire to JSON format
         */
        exportJSON: clientProcedure
            .input(z.object({
                id: z.union([z.number(), z.string()]),
                clientId: z.number().optional(),
            }))
            .query(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const qId = parseId(input.id);
                const q = await loadQuestionnaire(db, qId);
                if (!q) return { questionnaire: null, questions: [] };
                assertQuestionnaireAccess(ctx, q);
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
         * Get specific template questions. Unknown template ids fail loudly —
         * we never silently substitute a different template's questions.
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
                    const numericId = parseInt(tId.replace("custom-", ""), 10);
                    if (!isNaN(numericId)) {
                        const db = await getDb();
                        const [tRow] = await db.select().from(vendorAssessmentTemplates).where(eq(vendorAssessmentTemplates.id, numericId)).limit(1);
                        if (tRow && (tRow.content as any)?.questions) {
                            return { success: true, questions: (tRow.content as any).questions };
                        }
                    }
                }
                throw new TRPCError({ code: "NOT_FOUND", message: `Unknown questionnaire template: ${tId}` });
            }),

        /**
         * Send vendor invite link for questionnaire: persists a
         * cryptographically random token and emails the portal link.
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
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const questionnaireId = input.questionnaireId ?? input.id;
                if (!questionnaireId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'questionnaireId (or id) is required',
                    });
                }

                const db = await getDb();
                const q = await loadQuestionnaire(db, questionnaireId);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
                }
                assertQuestionnaireAccess(ctx, q);

                const token = `vst_${randomBytes(24).toString("hex")}`;
                const expiresInDays = input.expiresInDays ?? 30;
                const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

                // Persist the token so the vendor portal link actually resolves.
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

                // Deliver the link — the invite only works if the vendor gets it.
                let emailSent = false;
                let emailError: string | undefined;
                try {
                    const result = await sendEmail({
                        to: input.vendorEmail,
                        subject: `Security questionnaire: ${q.name}`,
                        html: `
                            <p>Hi ${input.vendorName || "there"},</p>
                            <p>${input.message || "Please complete our vendor security assessment."}</p>
                            <p><strong>Questionnaire:</strong> ${q.name}</p>
                            <p><strong>Due date:</strong> ${q.dueDate ? new Date(q.dueDate).toLocaleDateString() : "Not specified"}</p>
                            <p><a href="${portalUrl}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">Open security questionnaire</a></p>
                            <p style="color:#6b7280;font-size:12px">This link expires on ${expiresAt.toLocaleDateString()}. You can save progress and return using the same link until you submit.</p>
                        `,
                        clientId: input.clientId ?? q.clientId,
                    });
                    emailSent = !!result?.success;
                    if (!emailSent && result?.error) {
                        emailError = typeof result.error === "string" ? result.error : result.error?.message || "Email delivery failed";
                    }
                } catch (err: any) {
                    emailError = err?.message || "Email delivery failed";
                }

                return {
                    success: true,
                    token,
                    portalUrl,
                    recipient: input.vendorEmail,
                    questionnaireId,
                    expiresAt,
                    emailSent,
                    emailError,
                };
            }),

        /**
         * Vendor portal: fetch a questionnaire by its unguessable token.
         * Public (token IS the credential) — no client membership required.
         */
        getByVendorToken: publicProcedure
            .input(z.object({ token: z.string().min(10) }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                const [q] = await db
                    .select()
                    .from(questionnaires)
                    .where(eq(questionnaires.vendorToken, input.token))
                    .limit(1);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "This security assessment link is invalid." });
                }
                if (q.vendorLinkExpiresAt && new Date(q.vendorLinkExpiresAt) < new Date()) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "This security assessment link has expired." });
                }

                const questionsList = await db
                    .select({
                        id: questionnaireQuestions.id,
                        questionId: questionnaireQuestions.questionId,
                        category: questionnaireQuestions.category,
                        question: questionnaireQuestions.question,
                        answer: questionnaireQuestions.answer,
                        comment: questionnaireQuestions.comment,
                    })
                    .from(questionnaireQuestions)
                    .where(eq(questionnaireQuestions.questionnaireId, q.id))
                    .orderBy(asc(questionnaireQuestions.id));

                return {
                    id: q.id,
                    name: q.name,
                    senderName: q.senderName,
                    productName: q.productName,
                    vendorEmail: q.vendorEmail,
                    vendorName: q.vendorName,
                    dueDate: q.dueDate,
                    status: q.status,
                    direction: q.direction,
                    questions: questionsList,
                };
            }),

        /**
         * Vendor portal: save draft answers or submit the assessment.
         * Public (token IS the credential). Draft saves set status
         * vendor_pending; submit locks the questionnaire as pending_review.
         */
        submitVendorResponses: publicProcedure
            .input(z.object({
                token: z.string().min(10),
                responses: z.array(z.object({
                    id: z.number(),
                    answer: z.string().optional(),
                    comment: z.string().optional(),
                })),
                submit: z.boolean().optional().default(false),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                const [q] = await db
                    .select()
                    .from(questionnaires)
                    .where(eq(questionnaires.vendorToken, input.token))
                    .limit(1);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "This security assessment link is invalid." });
                }
                if (q.vendorLinkExpiresAt && new Date(q.vendorLinkExpiresAt) < new Date()) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "This security assessment link has expired." });
                }
                if (q.status === "completed" || q.status === "pending_review") {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "This assessment has already been submitted." });
                }

                let savedCount = 0;
                for (const r of input.responses) {
                    const patch: Record<string, unknown> = {};
                    if (r.answer !== undefined) patch.answer = r.answer;
                    if (r.comment !== undefined) patch.comment = r.comment;
                    if (Object.keys(patch).length === 0) continue;
                    const result = await db
                        .update(questionnaireQuestions)
                        .set(patch)
                        .where(and(eq(questionnaireQuestions.id, r.id), eq(questionnaireQuestions.questionnaireId, q.id)))
                        .returning({ id: questionnaireQuestions.id });
                    savedCount += result.length;
                }

                const nextStatus = input.submit ? "pending_review" : "vendor_pending";
                await db
                    .update(questionnaires)
                    .set({ status: nextStatus, updatedAt: new Date() })
                    .where(eq(questionnaires.id, q.id));
                const progress = await recomputeProgress(db, q.id);

                return { success: true, savedCount, progress, status: nextStatus };
            }),

        /**
         * Reviewer workflow (outbound assessments): approve / flag / reject a
         * single vendor answer, with an optional reviewer comment, priority
         * and remediation deadline.
         */
        reviewQuestion: clientProcedure
            .input(z.object({
                questionnaireId: z.number(),
                clientId: z.number().optional(),
                rowId: z.number(),
                status: z.enum(["pending", "answered", "drafted", "approved", "flagged", "needs_review"]),
                comment: z.string().nullable().optional(),
                priority: z.enum(["high", "medium", "low"]).nullable().optional(),
                remediationDeadline: z.string().datetime().nullable().optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const q = await loadQuestionnaire(db, input.questionnaireId);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
                }
                assertQuestionnaireAccess(ctx, q);

                const patch: Record<string, unknown> = { status: input.status };
                if (input.comment !== undefined) patch.comment = input.comment;
                if (input.priority !== undefined) patch.priority = input.priority;
                if (input.remediationDeadline !== undefined) {
                    patch.remediationDeadline = input.remediationDeadline === null
                        ? null
                        : new Date(input.remediationDeadline);
                }
                if (input.status === "approved") {
                    patch.approvedBy = ctx?.user?.id ?? null;
                    patch.approvedAt = new Date();
                }

                const [updated] = await db
                    .update(questionnaireQuestions)
                    .set(patch)
                    .where(
                        and(
                            eq(questionnaireQuestions.id, input.rowId),
                            eq(questionnaireQuestions.questionnaireId, input.questionnaireId)
                        )
                    )
                    .returning();
                if (!updated) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Question row not found" });
                }
                return { success: true, question: updated };
            }),

        /**
         * Findings for an outbound assessment: answers that classify as
         * failed, or rows flagged / marked needs_review by a reviewer, with
         * priority and remediation deadline for follow-up.
         */
        getFindings: clientProcedure
            .input(z.object({
                id: z.union([z.number(), z.string()]),
                clientId: z.number().optional(),
            }))
            .query(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const qId = parseId(input.id);
                const q = await loadQuestionnaire(db, qId);
                if (!q) return { findings: [], summary: { total: 0, failed: 0, flagged: 0 } };
                assertQuestionnaireAccess(ctx, q);

                const rows = await db
                    .select()
                    .from(questionnaireQuestions)
                    .where(eq(questionnaireQuestions.questionnaireId, qId))
                    .orderBy(asc(questionnaireQuestions.id));

                const findings = rows
                    .map((r: any) => ({
                        rowId: r.id,
                        questionId: r.questionId || `Q${r.id}`,
                        question: r.question,
                        answer: r.answer || "",
                        comment: r.comment || "",
                        status: r.status || "pending",
                        classification: classifyAnswer(r.answer ?? null, r.status ?? null),
                        priority: (r.priority as string) || "medium",
                        remediationDeadline: r.remediationDeadline ?? null,
                    }))
                    .filter((r) => r.classification === "fail" || r.status === "flagged" || r.status === "needs_review");

                return {
                    findings,
                    summary: {
                        total: rows.length,
                        failed: findings.filter((f) => f.classification === "fail").length,
                        flagged: findings.filter((f) => f.status === "flagged" || f.status === "needs_review").length,
                    },
                };
            }),

        /**
         * Vendor reminder: re-emails the stored portal link WITHOUT
         * regenerating the token (the original link keeps working). If the
         * link has expired (or is about to), the expiry is extended.
         */
        sendVendorReminder: clientProcedure
            .input(z.object({
                questionnaireId: z.number().optional(),
                id: z.number().optional(),
                clientId: z.number().optional(),
                expiresInDays: z.number().min(1).max(365).optional(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const questionnaireId = input.questionnaireId ?? input.id;
                if (!questionnaireId) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "questionnaireId (or id) is required" });
                }
                const db = await getDb();
                const q = await loadQuestionnaire(db, questionnaireId);
                if (!q) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Questionnaire not found" });
                }
                assertQuestionnaireAccess(ctx, q);
                if (!q.vendorToken || !q.vendorEmail) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "No vendor invite exists yet — send an invite first.",
                    });
                }

                // Extend the deadline when the link is expired or expiring within 2 days.
                const expiresInDays = input.expiresInDays ?? 7;
                const minExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                const currentExpiry = q.vendorLinkExpiresAt ? new Date(q.vendorLinkExpiresAt) : null;
                const expiresAt =
                    currentExpiry && currentExpiry > minExpiry
                        ? currentExpiry
                        : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
                if (expiresAt !== currentExpiry) {
                    await db.update(questionnaires)
                        .set({ vendorLinkExpiresAt: expiresAt, updatedAt: new Date() } as any)
                        .where(eq(questionnaires.id, questionnaireId));
                }

                const baseUrl = process.env.APP_BASE_URL
                    || process.env.VITE_APP_URL
                    || 'http://127.0.0.1:5173';
                const portalUrl = `${baseUrl.replace(/\/+$/, '')}/questionnaire/${q.vendorToken}`;

                let emailSent = false;
                let emailError: string | undefined;
                try {
                    const result = await sendEmail({
                        to: q.vendorEmail,
                        subject: `Reminder: security questionnaire "${q.name}" is pending`,
                        html: `
                            <p>Hi ${q.vendorName || "there"},</p>
                            <p>This is a friendly reminder that the security questionnaire <strong>${q.name}</strong> is still pending.</p>
                            ${q.dueDate ? `<p><strong>Due date:</strong> ${new Date(q.dueDate).toLocaleDateString()}</p>` : ""}
                            <p><a href="${portalUrl}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">Continue the questionnaire</a></p>
                            <p style="color:#6b7280;font-size:12px">Your saved progress is preserved. This link expires on ${expiresAt.toLocaleDateString()}.</p>
                        `,
                        clientId: input.clientId ?? q.clientId,
                    });
                    emailSent = !!result?.success;
                    if (!emailSent && result?.error) {
                        emailError = typeof result.error === "string" ? result.error : result.error?.message || "Email delivery failed";
                    }
                } catch (err: any) {
                    emailError = err?.message || "Email delivery failed";
                }

                return { success: true, emailSent, emailError, portalUrl, recipient: q.vendorEmail, expiresAt };
            }),

        /**
         * Master Answer Profile — merged view of hand-curated entries and
         * answers aggregated from completed inbound questionnaires.
         */
        libraryList: clientProcedure
            .input(z.object({ clientId: z.number().optional() }).optional())
            .query(async ({ input, ctx }: { input?: any; ctx?: Ctx }) => {
                const db = await getDb();
                const clientId = input?.clientId ?? ctx?.clientId;
                if (!clientId) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "clientId is required" });
                }

                const libraryQ = await ensureLibraryQuestionnaire(db, clientId);

                const curatedRows = await db
                    .select()
                    .from(questionnaireQuestions)
                    .where(eq(questionnaireQuestions.questionnaireId, libraryQ.id))
                    .orderBy(asc(questionnaireQuestions.id));
                const curated = curatedRows.map((r: any) => ({
                    rowId: r.id,
                    questionId: r.questionId,
                    question: r.question,
                    answer: r.answer || "",
                    focusArea: r.focusArea || "",
                }));

                // Derived: answers from completed inbound questionnaires
                // (excluding the library system questionnaire itself).
                const completed = await db
                    .select({ id: questionnaires.id, name: questionnaires.name })
                    .from(questionnaires)
                    .where(
                        and(
                            eq(questionnaires.clientId, clientId),
                            eq(questionnaires.direction, "inbound"),
                            eq(questionnaires.status, "completed"),
                            ne(questionnaires.id, libraryQ.id)
                        )
                    )
                    .orderBy(desc(questionnaires.updatedAt))
                    .limit(50);

                const derivedMap = new Map<
                    string,
                    { question: string; answer: string; focusArea: string; occurrences: number; sources: Set<string>; lastSourceId: number }
                >();
                if (completed.length > 0) {
                    const rows = await db
                        .select({
                            questionnaireId: questionnaireQuestions.questionnaireId,
                            question: questionnaireQuestions.question,
                            answer: questionnaireQuestions.answer,
                            focusArea: questionnaireQuestions.focusArea,
                        })
                        .from(questionnaireQuestions)
                        .where(
                            inArray(
                                questionnaireQuestions.questionnaireId,
                                completed.map((c) => c.id)
                            )
                        )
                        .limit(5000);

                    const nameById = new Map<number, string>(
                        completed.map((c) => [Number(c.id), String(c.name ?? "")] as const)
                    );
                    // Rows arrive questionnaire-newest-first (completed is ordered by
                    // updatedAt desc); the first occurrence of a normalized question
                    // is therefore the most recent answer.
                    for (const r of rows) {
                        const answerText = String(r.answer ?? "");
                        const questionText = String(r.question ?? "");
                        if (!answerText.trim()) continue;
                        const key = normalizeQuestionText(questionText);
                        if (!key) continue;
                        const sourceName = nameById.get(Number(r.questionnaireId)) || `#${r.questionnaireId}`;
                        const existing = derivedMap.get(key);
                        if (existing) {
                            existing.occurrences++;
                            existing.sources.add(sourceName);
                        } else {
                            derivedMap.set(key, {
                                question: questionText,
                                answer: answerText,
                                focusArea: String(r.focusArea ?? ""),
                                occurrences: 1,
                                sources: new Set([sourceName]),
                                lastSourceId: Number(r.questionnaireId),
                            });
                        }
                    }
                }

                const derived = Array.from(derivedMap.values())
                    .map((d) => ({
                        question: d.question,
                        answer: d.answer,
                        focusArea: d.focusArea,
                        occurrences: d.occurrences,
                        sources: Array.from(d.sources).slice(0, 3),
                        sourceQuestionnaireId: d.lastSourceId,
                    }))
                    .sort((a, b) => b.occurrences - a.occurrences)
                    .slice(0, 200);

                return {
                    curated,
                    derived,
                    libraryQuestionnaireId: libraryQ.id,
                };
            }),

        /**
         * Master Answer Profile — create or update a curated answer.
         * Entries live in the per-client library questionnaire and are
         * matched FIRST by findLibraryMatches (precedence over derived).
         */
        librarySaveEntry: clientProcedure
            .input(z.object({
                clientId: z.number().optional(),
                question: z.string().min(1),
                answer: z.string().min(1),
                focusArea: z.string().optional(),
                rowId: z.number().optional(), // update an existing curated row
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const clientId = input.clientId ?? ctx?.clientId;
                if (!clientId) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "clientId is required" });
                }
                const libraryQ = await ensureLibraryQuestionnaire(db, clientId);

                let saved;
                if (input.rowId) {
                    const [updated] = await db
                        .update(questionnaireQuestions)
                        .set({
                            question: input.question,
                            answer: input.answer,
                            focusArea: input.focusArea || "",
                            status: "approved",
                            updatedAt: new Date(),
                        } as any)
                        .where(
                            and(
                                eq(questionnaireQuestions.id, input.rowId),
                                eq(questionnaireQuestions.questionnaireId, libraryQ.id)
                            )
                        )
                        .returning();
                    if (!updated) {
                        throw new TRPCError({ code: "NOT_FOUND", message: "Library entry not found" });
                    }
                    saved = updated;
                } else {
                    const [inserted] = await db
                        .insert(questionnaireQuestions)
                        .values({
                            questionnaireId: libraryQ.id,
                            questionId: `LIB-${randomBytes(4).toString("hex")}`,
                            question: input.question,
                            answer: input.answer,
                            focusArea: input.focusArea || "",
                            status: "approved",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        } as any)
                        .returning();
                    saved = inserted;
                }

                return {
                    success: true,
                    entry: {
                        rowId: saved.id,
                        questionId: saved.questionId,
                        question: saved.question,
                        answer: saved.answer,
                        focusArea: saved.focusArea || "",
                    },
                };
            }),

        /**
         * Master Answer Profile — delete a curated entry.
         */
        libraryDeleteEntry: clientProcedure
            .input(z.object({
                clientId: z.number().optional(),
                rowId: z.number(),
            }))
            .mutation(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const clientId = input.clientId ?? ctx?.clientId;
                if (!clientId) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "clientId is required" });
                }
                const libraryQ = await ensureLibraryQuestionnaire(db, clientId);
                const deleted = await db
                    .delete(questionnaireQuestions)
                    .where(
                        and(
                            eq(questionnaireQuestions.id, input.rowId),
                            eq(questionnaireQuestions.questionnaireId, libraryQ.id)
                        )
                    )
                    .returning({ id: questionnaireQuestions.id });
                return { success: true, deleted: deleted.length };
            }),

        /**
         * Score a persisted questionnaire (client-scoped).
         *
         * Reads the questionnaire + answers and runs the deterministic scoring
         * engine. Never throws on DB/read failures: falls back to an empty score.
         * Returns null when the questionnaire does not exist (like `get`).
         */
        score: clientProcedure
            .input(z.object({
                id: z.union([z.number(), z.string()]),
                clientId: z.number().optional(),
            }))
            .query(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                let qId: number;
                try {
                    qId = parseId(input.id);
                } catch {
                    const empty = scoreQuestionnaire([]);
                    return { questionnaireId: input.id, score: empty, summary: summarizeScore(empty) };
                }
                try {
                    const db = await getDb();
                    const q = await loadQuestionnaire(db, qId);
                    if (!q) return null;
                    assertQuestionnaireAccess(ctx, q);

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
                    if (err instanceof TRPCError) throw err;
                    console.error("[questionnaire.score] failed:", err);
                    const empty = scoreQuestionnaire([]);
                    return { questionnaireId: qId, score: empty, summary: summarizeScore(empty) };
                }
            }),

        /**
         * Batched readiness scores for a whole list view — one round-trip
         * instead of one per row.
         */
        scoreAll: clientProcedure
            .input(z.object({
                clientId: z.number().optional(),
                direction: z.enum(["inbound", "outbound"]).optional(),
                ids: z.array(z.number()).optional(),
            }))
            .query(async ({ input, ctx }: { input: any; ctx?: Ctx }) => {
                const db = await getDb();
                const clientId = input?.clientId ?? ctx?.clientId;

                let targets: { id: number }[] = [];
                if (input?.ids?.length) {
                    const conditions = [inArray(questionnaires.id, input.ids)];
                    // Tenant filter applies whenever we know the tenant; platform
                    // admins without an explicit clientId may score any id.
                    if (clientId) conditions.push(eq(questionnaires.clientId, clientId));
                    targets = await db
                        .select({ id: questionnaires.id })
                        .from(questionnaires)
                        .where(and(...conditions));
                } else {
                    if (!clientId) {
                        throw new TRPCError({ code: "BAD_REQUEST", message: "clientId is required" });
                    }
                    const conditions = [eq(questionnaires.clientId, clientId)];
                    if (input?.direction) conditions.push(eq(questionnaires.direction, input.direction));
                    targets = await db
                        .select({ id: questionnaires.id })
                        .from(questionnaires)
                        .where(and(...conditions))
                        .limit(MAX_LIST_LIMIT);
                }

                if (targets.length === 0) return { scores: [] };

                const questionRows = await db
                    .select({
                        questionnaireId: questionnaireQuestions.questionnaireId,
                        questionId: questionnaireQuestions.questionId,
                        question: questionnaireQuestions.question,
                        focusArea: questionnaireQuestions.focusArea,
                        subFocusArea: questionnaireQuestions.subFocusArea,
                        answer: questionnaireQuestions.answer,
                        status: questionnaireQuestions.status,
                    })
                    .from(questionnaireQuestions)
                    .where(inArray(questionnaireQuestions.questionnaireId, targets.map(t => t.id)));

                const grouped = new Map<number, QuestionnaireAnswer[]>();
                for (const r of questionRows) {
                    const list = grouped.get(r.questionnaireId) || [];
                    list.push({
                        questionId: r.questionId ?? String(r.questionnaireId),
                        question: r.question,
                        focusArea: r.focusArea,
                        subFocusArea: r.subFocusArea,
                        answer: r.answer,
                        status: r.status,
                    });
                    grouped.set(r.questionnaireId, list);
                }

                const scores = targets.map(t => {
                    const score = scoreQuestionnaire(grouped.get(t.id) || []);
                    return { questionnaireId: t.id, score, summary: summarizeScore(score) };
                });
                return { scores };
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

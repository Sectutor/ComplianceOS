import { z } from "zod";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, desc, and, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Evidence-files router - attach / list / link / remove file records that
 * back an evidence item.
 *
 * Cycle 36 hardening (contract gate):
 * - Reusable zod input schemas/types are exported below (house pattern, see
 *   evidenceRepository.ts). Each procedure's `.input(...)` derives from a
 *   single shared shape; the `create`/`delete` chunks pass those shapes INTO
 *   a literal z.object(...) call so validation stays byte-for-byte equivalent.
 * - Failures never escape as raw DB errors: DB-touching bodies are wrapped
 *   and rethrown as INTERNAL_SERVER_ERROR with `cause` (trustCenter.ts
 *   precedent); intentional business-rule failures use NOT_FOUND / CONFLICT.
 * - Every multi-row read carries an explicit bound; nothing is ever logged
 *   (no secrets, no file contents, no fileKeys).
 */

/** Hard cap for multi-row reads so no procedure streams unbounded result sets. */
const EVIDENCE_FILES_LIST_LIMIT = 100;

// ---------------------------------------------------------------------------
// Shared input shapes + exported schemas/types (consumed by the UI contract
// layer and QA tests). Every procedure input derives from exactly one of
// these shapes - no duplicated field definitions.
// ---------------------------------------------------------------------------

/** Valid id of a single evidence_files row. */
export const evidenceFileIdSchema = z.number();

/** Input shape for `list` - files attached to one evidence record. */
export const evidenceFilesListShape = {
    evidenceId: z.number(),
};

/** Input schema for `list` (exported for tests / UI / QA). */
export const evidenceFilesListInputSchema = z.object(evidenceFilesListShape);
export type EvidenceFilesListInput = z.infer<typeof evidenceFilesListInputSchema>;

/** Input shape for `create` - register a newly uploaded file on an evidence record. */
export const evidenceFilesCreateShape = {
    evidenceId: z.number(),
    filename: z.string(),
    fileKey: z.string(),
    url: z.string(),
    originalFilename: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
};

/** Input schema for `create` (exported for tests / UI / QA). */
export const evidenceFilesCreateInputSchema = z.object(evidenceFilesCreateShape);
export type EvidenceFilesCreateInput = z.infer<typeof evidenceFilesCreateInputSchema>;

/** Input shape for `listAll` - client-wide file library picker (bounded read). */
export const evidenceFilesListAllShape = {
    clientId: z.number(),
    search: z.string().optional(),
};

/** Input schema for `listAll` (exported for tests / UI / QA). */
export const evidenceFilesListAllInputSchema = z.object(evidenceFilesListAllShape);
export type EvidenceFilesListAllInput = z.infer<typeof evidenceFilesListAllInputSchema>;

/** Input shape for `linkExisting` - copy an existing file onto another evidence record. */
export const evidenceFilesLinkExistingShape = {
    targetEvidenceId: z.number(),
    sourceFileId: z.number(),
};

/** Input schema for `linkExisting` (exported for tests / UI / QA). */
export const evidenceFilesLinkExistingInputSchema = z.object(evidenceFilesLinkExistingShape);
export type EvidenceFilesLinkExistingInput = z.infer<typeof evidenceFilesLinkExistingInputSchema>;

/** Input schema for `delete` (exported for tests / UI / QA). */
export const evidenceFilesDeleteInputSchema = z.object({ id: evidenceFileIdSchema });
export type EvidenceFilesDeleteInput = z.infer<typeof evidenceFilesDeleteInputSchema>;

/** Input shape for `registerQuickUpload` - generic evidence container + first file. */
export const evidenceFilesQuickUploadShape = {
    clientId: z.number(),
    title: z.string(),
    filename: z.string(),
    fileKey: z.string(),
    url: z.string(),
    contentType: z.string().optional(),
    size: z.number().optional(),
};

/** Input schema for `registerQuickUpload` (exported for tests / UI / QA). */
export const evidenceFilesQuickUploadInputSchema = z.object(evidenceFilesQuickUploadShape);
export type EvidenceFilesQuickUploadInput = z.infer<typeof evidenceFilesQuickUploadInputSchema>;

/** Rethrow intentional TRPCErrors untouched; wrap anything else as INTERNAL_SERVER_ERROR. */
const rethrowAsInternal = (message: string) => (err: unknown): never => {
    if (err instanceof TRPCError) throw err;
    throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message,
        cause: err,
    });
};

export const createEvidenceFilesRouter = (
    t: any,
    adminProcedure: any,
    publicProcedure: any
) => {
    return t.router({
        list: publicProcedure
            .input(evidenceFilesListInputSchema)
            .query(async ({ input }: any) => {
                try {
                    const dbConn = await getDb();
                    return await dbConn.select().from(schema.evidenceFiles)
                        .where(eq(schema.evidenceFiles.evidenceId, input.evidenceId))
                        .orderBy(desc(schema.evidenceFiles.createdAt))
                        .limit(EVIDENCE_FILES_LIST_LIMIT);
                } catch (err) {
                    rethrowAsInternal("Failed to list evidence files")(err);
                }
            }),

        create: adminProcedure
            .input(z.object(evidenceFilesCreateShape))
            .mutation(async ({ input, ctx }: any) => {
                try {
                    const dbConn = await getDb();
                    const [file] = await dbConn.insert(schema.evidenceFiles).values({
                        evidenceId: input.evidenceId,
                        filename: input.originalFilename || input.filename,
                        fileKey: input.fileKey,
                        fileUrl: input.url,
                        contentType: input.mimeType,
                        fileSize: input.size,
                        uploadedBy: ctx.user?.id,
                    }).returning();
                    return file;
                } catch (err) {
                    rethrowAsInternal("Failed to attach file to evidence")(err);
                }
            }),

        // List all files for a client (library picker). Joined with the
        // evidence table to filter by client; bounded read (.limit(50)).
        listAll: publicProcedure
            .input(evidenceFilesListAllInputSchema)
            .query(async ({ input }: any) => {
                try {
                    const dbConn = await getDb();
                    const files = await dbConn.select({
                        id: schema.evidenceFiles.id,
                        filename: schema.evidenceFiles.filename,
                        fileUrl: schema.evidenceFiles.fileUrl,
                        fileKey: schema.evidenceFiles.fileKey,
                        contentType: schema.evidenceFiles.contentType,
                        fileSize: schema.evidenceFiles.fileSize,
                        createdAt: schema.evidenceFiles.createdAt,
                        evidenceTitle: schema.evidence.description
                    })
                        .from(schema.evidenceFiles)
                        .innerJoin(schema.evidence, eq(schema.evidenceFiles.evidenceId, schema.evidence.id))
                        .where(and(
                            eq(schema.evidence.clientId, input.clientId),
                            input.search ? like(schema.evidenceFiles.filename, `%${input.search}%`) : undefined
                        ))
                        .orderBy(desc(schema.evidenceFiles.createdAt))
                        .limit(50);

                    return files;
                } catch (err) {
                    rethrowAsInternal("Failed to list evidence files for client")(err);
                }
            }),

        linkExisting: adminProcedure
            .input(evidenceFilesLinkExistingInputSchema)
            .mutation(async ({ input, ctx }: any) => {
                try {
                    const dbConn = await getDb();

                    // 1. Get source file
                    const [sourceFile] = await dbConn.select()
                        .from(schema.evidenceFiles)
                        .where(eq(schema.evidenceFiles.id, input.sourceFileId));

                    if (!sourceFile) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "Source file not found",
                        });
                    }

                    // 2. Check if already linked (fileKey is stable per file content).
                    const existingLinks = await dbConn.select()
                        .from(schema.evidenceFiles)
                        .where(and(
                            eq(schema.evidenceFiles.evidenceId, input.targetEvidenceId),
                            eq(schema.evidenceFiles.fileKey, sourceFile.fileKey)
                        ))
                        .limit(1);

                    if (existingLinks.length > 0) {
                        throw new TRPCError({
                            code: "CONFLICT",
                            message: "This file is already attached to this request.",
                        });
                    }

                    // 3. Create copy linked to new evidence
                    const [newFile] = await dbConn.insert(schema.evidenceFiles).values({
                        evidenceId: input.targetEvidenceId,
                        filename: sourceFile.filename,
                        fileKey: sourceFile.fileKey,
                        fileUrl: sourceFile.fileUrl,
                        contentType: sourceFile.contentType,
                        fileSize: sourceFile.fileSize,
                        uploadedBy: ctx.user?.id,
                    }).returning();

                    return newFile;
                } catch (err) {
                    rethrowAsInternal("Failed to link existing file")(err);
                }
            }),

        delete: publicProcedure
            .input(z.object({ id: evidenceFileIdSchema }))
            .mutation(async ({ input }: any) => {
                try {
                    const dbConn = await getDb();
                    await dbConn.delete(schema.evidenceFiles)
                        .where(eq(schema.evidenceFiles.id, input.id));
                    return { success: true };
                } catch (err) {
                    rethrowAsInternal("Failed to delete evidence file")(err);
                }
            }),

        registerQuickUpload: publicProcedure
            .input(evidenceFilesQuickUploadInputSchema)
            .mutation(async ({ input, ctx }: any) => {
                try {
                    const dbConn = await getDb();

                    // 1. Create a generic evidence container
                    const [evidence] = await dbConn.insert(schema.evidence).values({
                        clientId: input.clientId,
                        clientControlId: 0, // Unlinked
                        evidenceId: `UPLOAD-${Date.now()}`,
                        description: input.title,
                        status: 'collected',
                        framework: 'General',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    } as any).returning();

                    // 2. Create the file record
                    const [file] = await dbConn.insert(schema.evidenceFiles).values({
                        evidenceId: evidence.id,
                        filename: input.filename,
                        fileKey: input.fileKey,
                        fileUrl: input.url,
                        contentType: input.contentType,
                        fileSize: input.size,
                        uploadedBy: ctx.user?.id,
                    } as any).returning();

                    // 3. Return combined shape for UI
                    return {
                        id: file.id,
                        filename: file.filename,
                        fileUrl: file.fileUrl,
                        fileKey: file.fileKey,
                        contentType: file.contentType,
                        fileSize: file.fileSize,
                        createdAt: file.createdAt,
                        evidenceTitle: evidence.description
                    };
                } catch (err) {
                    rethrowAsInternal("Failed to register quick upload")(err);
                }
            }),
    });
};

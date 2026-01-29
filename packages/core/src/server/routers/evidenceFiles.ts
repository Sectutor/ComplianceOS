
import { z } from "zod";
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, desc } from "drizzle-orm";

export const createEvidenceFilesRouter = (
    t: any,
    adminProcedure: any,
    publicProcedure: any
) => {
    return t.router({
        list: publicProcedure
            .input(z.object({
                evidenceId: z.number()
            }))
            .query(async ({ input }: any) => {
                const dbConn = await getDb();
                return dbConn.select().from(schema.evidenceFiles)
                    .where(eq(schema.evidenceFiles.evidenceId, input.evidenceId))
                    .orderBy(desc(schema.evidenceFiles.createdAt));
            }),

        create: adminProcedure
            .input(z.object({
                evidenceId: z.number(),
                filename: z.string(),
                fileKey: z.string(),
                url: z.string(),
                originalFilename: z.string().optional(),
                mimeType: z.string().optional(),
                size: z.number().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
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
            }),

        delete: adminProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const dbConn = await getDb();
                await dbConn.delete(schema.evidenceFiles)
                    .where(eq(schema.evidenceFiles.id, input.id));
                return { success: true };
            }),
    });
};

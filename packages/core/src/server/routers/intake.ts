import { z } from "zod";
import * as db from "../../db";
import { intakeItems, evidence, clients } from "../../schema";
import { eq, desc } from "drizzle-orm";
import { classifyIntakeItem } from "../../lib/ai/intake-triage";

export const createIntakeRouter = (t: any, clientProcedure: any) => {
    return t.router({
        list: clientProcedure
            .input(z.object({
                clientId: z.number()
            }))
            .query(async ({ input }: any) => {
                const d = await db.getDb();
                return await d.select()
                    .from(intakeItems)
                    .where(eq(intakeItems.clientId, input.clientId))
                    .orderBy(desc(intakeItems.createdAt));
            }),

        listAll: clientProcedure // Ideally this would be adminProcedure/advisorProcedure
            .query(async () => {
                const d = await db.getDb();
                return await d.select({
                    id: intakeItems.id,
                    filename: intakeItems.filename,
                    status: intakeItems.status,
                    classification: intakeItems.classification,
                    createdAt: intakeItems.createdAt,
                    clientName: clients.name,
                    clientId: clients.id
                })
                    .from(intakeItems)
                    .innerJoin(clients, eq(intakeItems.clientId, clients.id))
                    .orderBy(desc(intakeItems.createdAt));
            }),

        create: clientProcedure
            .input(z.object({
                clientId: z.number(),
                filename: z.string(),
                fileUrl: z.string(),
                fileBase64: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const d = await db.getDb();

                let fileBuffer: Buffer | undefined;
                if (input.fileBase64) {
                    fileBuffer = Buffer.from(input.fileBase64, 'base64');
                }

                // 1. Initial Insert
                const [item] = await d.insert(intakeItems).values({
                    clientId: input.clientId,
                    filename: input.filename,
                    fileUrl: input.fileUrl,
                    uploadedBy: ctx.user?.id,
                    status: 'pending'
                }).returning();

                // 2. Perform AI Triage
                try {
                    const aiResult = await classifyIntakeItem(input.filename, input.clientId, fileBuffer);
                    const [updatedItem] = await d.update(intakeItems)
                        .set({
                            classification: aiResult.classification,
                            confidence: aiResult.confidence,
                            details: aiResult,
                            status: 'classified',
                            updatedAt: new Date()
                        })
                        .where(eq(intakeItems.id, item.id))
                        .returning();
                    return updatedItem;
                } catch (e) {
                    console.error("AI Triage failed during creation:", e);
                    return item; // Return it as pending if AI fails
                }
            }),

        triage: clientProcedure
            .input(z.object({
                id: z.number(),
                classification: z.string(),
                details: z.any().optional()
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                const [item] = await d.update(intakeItems)
                    .set({
                        classification: input.classification,
                        details: input.details,
                        status: 'classified',
                        updatedAt: new Date()
                    })
                    .where(eq(intakeItems.id, input.id))
                    .returning();
                return item;
            }),

        mapToEvidence: clientProcedure
            .input(z.object({
                intakeItemId: z.number(),
                clientControlId: z.number(),
                title: z.string(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const d = await db.getDb();

                // 1. Create the real evidence record
                const [intakeItem] = await d.select().from(intakeItems).where(eq(intakeItems.id, input.intakeItemId));
                if (!intakeItem) throw new Error("Intake item not found");

                const [newEvidence] = await d.insert(evidence).values({
                    clientId: intakeItem.clientId,
                    clientControlId: input.clientControlId,
                    title: input.title,
                    status: 'collected',
                    source: 'intake',
                    userId: ctx.user?.id
                }).returning();

                // 2. Link them
                await d.update(intakeItems)
                    .set({
                        status: 'mapped',
                        mappedEvidenceId: newEvidence.id,
                        updatedAt: new Date()
                    })
                    .where(eq(intakeItems.id, input.intakeItemId));

                return newEvidence;
            })
    });
};

import { z } from "zod";
import { router, clientProcedure } from "../trpc";
import * as db from "../../db";
import { sammMaturityAssessments } from "../../schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const createSammRouter = (t: any, clientProcedure: any) => {
    return t.router({
        getMaturity: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: { input: { clientId: number } }) => {
                const dbConn = await db.getDb();
                const scores = await dbConn.select().from(sammMaturityAssessments)
                    .where(eq(sammMaturityAssessments.clientId, input.clientId));

                return scores;
            }),

        updateMaturity: clientProcedure
            .input(z.object({
                clientId: z.number(),
                practiceId: z.string(),
                maturityLevel: z.number().min(0).max(3).optional(),
                targetLevel: z.number().min(0).max(3).optional(),
                evidenceLinks: z.array(z.number()).optional(),
                notes: z.string().optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const dbConn = await db.getDb();
                const { clientId, practiceId, ...updates } = input;

                // Check if existing
                const existing = await dbConn.select().from(sammMaturityAssessments)
                    .where(and(
                        eq(sammMaturityAssessments.clientId, clientId),
                        eq(sammMaturityAssessments.practiceId, practiceId)
                    ))
                    .limit(1);

                if (existing.length > 0) {
                    await dbConn.update(sammMaturityAssessments)
                        .set({ ...updates, updatedAt: new Date() })
                        .where(eq(sammMaturityAssessments.id, existing[0].id));
                    return { success: true, id: existing[0].id };
                } else {
                    const [inserted] = await dbConn.insert(sammMaturityAssessments).values({
                        clientId,
                        practiceId,
                        maturityLevel: updates.maturityLevel ?? 0,
                        targetLevel: updates.targetLevel ?? 1,
                        evidenceLinks: updates.evidenceLinks ?? [],
                        notes: updates.notes ?? "",
                    }).returning();
                    return { success: true, id: inserted.id };
                }
            }),

        getGuidance: clientProcedure
            .input(z.object({
                clientId: z.number(),
                practiceId: z.string(),
            }))
            .query(async ({ input }: { input: { clientId: number, practiceId: string } }) => {
                // Placeholder for AI guidance logic
                // In a real implementation, this would call llmService.generate
                return {
                    guidance: `AI guidance for ${input.practiceId} based on your current policies...`,
                    suggestions: [
                        "Implement automated secure code review",
                        "Establish a clear vulnerability disclosure policy",
                    ]
                };
            }),
    });
};

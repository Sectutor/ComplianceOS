import { z } from "zod";
import { getDb } from "../../db";
import { checklistStates } from "../../schema";
import { eq, and } from "drizzle-orm";

export const createChecklistRouter = (t: any, clientProcedure: any) => t.router({
    get: clientProcedure
        .input(z.object({
            clientId: z.number(),
            checklistId: z.string()
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const [state] = await db
                .select()
                .from(checklistStates)
                .where(and(
                    eq(checklistStates.clientId, input.clientId),
                    eq(checklistStates.checklistId, input.checklistId)
                ))
                .limit(1);

            return state || null;
        }),

    update: clientProcedure
        .input(z.object({
            clientId: z.number(),
            checklistId: z.string(),
            items: z.record(z.boolean())
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            const [existing] = await db
                .select()
                .from(checklistStates)
                .where(and(
                    eq(checklistStates.clientId, input.clientId),
                    eq(checklistStates.checklistId, input.checklistId)
                ))
                .limit(1);

            if (existing) {
                return await db
                    .update(checklistStates)
                    .set({
                        items: input.items,
                        updatedAt: new Date()
                    })
                    .where(eq(checklistStates.id, existing.id))
                    .returning();
            } else {
                return await db
                    .insert(checklistStates)
                    .values({
                        clientId: input.clientId,
                        checklistId: input.checklistId,
                        items: input.items
                    })
                    .returning();
            }
        })
});


import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { policyTemplates } from "../../schema";
import { getDb } from "../../db";
import { eq, desc } from "drizzle-orm";

export const createPolicyTemplatesRouter = (t: any, publicProcedure: any) => {
    return t.router({
        list: publicProcedure
            .query(async () => {
                const db = await getDb();
                return await db.select().from(policyTemplates);
            }),

        get: publicProcedure
            .input(z.object({ templateId: z.string() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const [template] = await db.select().from(policyTemplates)
                    .where(eq(policyTemplates.templateId, input.templateId));

                if (!template) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
                }
                return template;
            }),
    });
};

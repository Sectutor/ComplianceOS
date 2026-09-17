import { z } from "zod";
import { personalAccessTokens } from "../../schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "../../db";
import crypto from "crypto";

export const createTokensRouter = (t: any, protectedProcedure: any) => t.router({
    list: protectedProcedure.query(async ({ ctx }: any) => {
        const db = await getDb();
        return db.select({
            id: personalAccessTokens.id,
            name: personalAccessTokens.name,
            prefix: personalAccessTokens.prefix,
            lastUsedAt: personalAccessTokens.lastUsedAt,
            createdAt: personalAccessTokens.createdAt,
            expiresAt: personalAccessTokens.expiresAt,
        })
            .from(personalAccessTokens)
            .where(eq(personalAccessTokens.userId, ctx.user.id));
    }),

    generate: protectedProcedure
        .input(z.object({
            name: z.string().min(1).max(100),
            expiresInDays: z.number().optional().default(365)
        }))
        .mutation(async ({ ctx, input }: any) => {
            const db = await getDb();
            
            // Generate a secure random token
            const secret = crypto.randomBytes(24).toString('hex');
            const rawToken = `cos_${secret}`;
            const prefix = rawToken.substring(0, 8);
            
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

            const [newPat] = await db.insert(personalAccessTokens).values({
                userId: ctx.user.id,
                name: input.name,
                token: rawToken, // Simple storage for now
                prefix,
                expiresAt,
            }).returning();

            return {
                id: newPat.id,
                token: rawToken, // This is returned ONLY ONCE
                prefix: newPat.prefix,
                expiresAt: newPat.expiresAt,
            };
        }),

    revoke: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }: any) => {
            const db = await getDb();
            await db.delete(personalAccessTokens)
                .where(and(
                    eq(personalAccessTokens.id, input.id),
                    eq(personalAccessTokens.userId, ctx.user.id)
                ));
            return { success: true };
        }),
});

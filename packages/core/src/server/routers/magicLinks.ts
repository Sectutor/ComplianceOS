import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and } from "drizzle-orm";
import * as crypto from "crypto";

import * as db from "../../db";
import { magicLinks, waitingList } from "../../schema";
import { router, adminProcedure, publicProcedure } from "../trpc";

export const magicLinksRouter = router({
    create: adminProcedure
        .input(z.object({
            label: z.string().optional(),
            email: z.string().email().optional(),
            role: z.string().default("viewer"),
            planTier: z.string().default("free"),
            maxClients: z.number().default(2),
            accessDurationType: z.enum(["lifetime", "limited"]).default("lifetime"),
            accessDurationDays: z.number().optional(),
            waitlistId: z.number().optional(),
            expiresInDays: z.number().default(7),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const dbConn = await db.getDb();
            const token = crypto.randomUUID();

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

            const [newLink] = await dbConn.insert(magicLinks).values({
                token,
                label: input.label,
                email: input.email,
                role: input.role,
                planTier: input.planTier,
                maxClients: input.maxClients,
                accessDurationType: input.accessDurationType,
                accessDurationDays: input.accessDurationDays,
                waitlistId: input.waitlistId,
                createdById: ctx.user.id,
                expiresAt,
            }).returning();

            // If waitlistId is provided, update waitlist status
            if (input.waitlistId) {
                await dbConn.update(waitingList)
                    .set({ status: 'invited' })
                    .where(eq(waitingList.id, input.waitlistId));
            }

            return newLink;
        }),

    list: adminProcedure
        .query(async () => {
            const dbConn = await db.getDb();
            return await dbConn.select().from(magicLinks).orderBy(desc(magicLinks.createdAt));
        }),

    get: publicProcedure
        .input(z.object({ token: z.string() }))
        .query(async ({ input }: any) => {
            const dbConn = await db.getDb();
            const [link] = await dbConn.select()
                .from(magicLinks)
                .where(eq(magicLinks.token, input.token))
                .limit(1);

            if (!link) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired magic link" });
            }

            if (link.status !== 'active') {
                throw new TRPCError({ code: "BAD_REQUEST", message: "This magic link has already been used or revoked" });
            }

            if (link.expiresAt && new Date() > link.expiresAt) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "This magic link has expired" });
            }

            return link;
        }),

    revoke: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }: any) => {
            const dbConn = await db.getDb();
            await dbConn.update(magicLinks)
                .set({ status: 'revoked' })
                .where(eq(magicLinks.id, input.id));
            return { success: true };
        }),

    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }: any) => {
            const dbConn = await db.getDb();
            await dbConn.delete(magicLinks).where(eq(magicLinks.id, input.id));
            return { success: true };
        }),
});

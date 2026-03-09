/**
 * Vendors Module - Router
 * 
 * This module handles vendor management and assessments.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure } from "../../server/trpc";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";

import { vendors, vendorAssessments, vendorContacts, vendorContracts } from "../../schema";

export const vendorsRouter = router({
    /**
     * List vendors for a client
     */
    list: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const vendorRows = await db.select().from(vendors).where(eq(vendors.clientId, input.clientId)).orderBy(asc(vendors.name));
            // Transform to expected format: { vendor: { ... } }
            return vendorRows.map((vendor: typeof vendors.$inferSelect) => ({ vendor }));
        }),

    /**
     * Get vendor
     */
    get: clientProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const [vendor] = await db.select().from(vendors).where(eq(vendors.id, input.id)).limit(1);
            return vendor;
        }),

    /**
     * Create vendor
     */
    create: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            name: z.string().min(1),
            description: z.string().optional(),
            category: z.string().optional(),
            website: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const [vendor] = await db.insert(vendors).values(input).returning();
            return vendor;
        }),

    /**
     * Update vendor
     */
    update: clientEditorProcedure
        .input(z.object({
            id: z.number(),
            clientId: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            category: z.string().optional(),
            website: z.string().optional(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const { clientId, ...updateData } = input;
            const [updated] = await db.update(vendors).set(updateData).where(and(eq(vendors.id, input.id), eq(vendors.clientId, clientId))).returning();
            if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
            return updated;
        }),

    /**
     * Delete vendor
     */
    delete: clientEditorProcedure
        .input(z.object({ id: z.number(), clientId: z.number() }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            await db.delete(vendors).where(and(eq(vendors.id, input.id), eq(vendors.clientId, input.clientId)));
            return { success: true };
        }),

    // Vendor Assessments
    listAssessments: clientProcedure
        .input(z.object({ clientId: z.number(), vendorId: z.number().optional() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            let query = db.select().from(vendorAssessments).where(eq(vendorAssessments.clientId, input.clientId));
            return query;
        }),

    createAssessment: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            vendorId: z.number(),
            type: z.string(),
            status: z.string().default('pending'),
            dueDate: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const [assessment] = await db.insert(vendorAssessments).values({
                ...input,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
            }).returning();
            return assessment;
        }),

    // Vendor Contacts
    listContacts: clientProcedure
        .input(z.object({ vendorId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            return db.select().from(vendorContacts).where(eq(vendorContacts.vendorId, input.vendorId));
        }),

    createContact: clientEditorProcedure
        .input(z.object({
            vendorId: z.number(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
            phone: z.string().optional(),
            role: z.string().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();
            const [contact] = await db.insert(vendorContacts).values(input).returning();
            return contact;
        }),

    // Vendor Contracts
    listContracts: clientProcedure
        .input(z.object({ vendorId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            return db.select().from(vendorContracts).where(eq(vendorContracts.vendorId, input.vendorId));
        }),
});

export default vendorsRouter;

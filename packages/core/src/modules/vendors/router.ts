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
     * List vendors for a client (alias for listVendors)
     * This is used by QuestionnaireWorkspace and other components
     */
    listVendors: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const vendorRows = await db.select().from(vendors).where(eq(vendors.clientId, input.clientId)).orderBy(asc(vendors.name));
            return vendorRows;
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

    /**
     * Get vendor statistics
     */
    getStats: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            const clientId = input.clientId;

            // Get vendor counts by status
            const allVendors = await db.select().from(vendors).where(eq(vendors.clientId, clientId));

            const stats = {
                total: allVendors.length,
                byStatus: {
                    active: allVendors.filter(v => v.status === 'active').length,
                    inactive: allVendors.filter(v => v.status === 'inactive').length,
                    pending: allVendors.filter(v => v.status === 'pending').length,
                },
                categories: {} as Record<string, number>,
            };

            // Count by category
            for (const vendor of allVendors) {
                const cat = vendor.category || 'uncategorized';
                stats.categories[cat] = (stats.categories[cat] || 0) + 1;
            }

            return stats;
        }),

    /**
     * List vendor DPAs (Data Processing Agreements)
     */
    listDpas: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }: any) => {
            const db = await getDb();
            // Get all vendors with their contracts that have DPA flag
            const vendorRows = await db.select().from(vendors).where(eq(vendors.clientId, input.clientId));

            // Get all contracts
            const contracts = await db.select().from(vendorContracts).where(
                inArray(vendorContracts.vendorId, vendorRows.map(v => v.id))
            );

            // Map vendors with their DPAs
            return vendorRows.map(vendor => {
                const vendorContracts = contracts.filter(c => c.vendorId === vendor.id);
                return {
                    id: vendor.id,
                    name: vendor.name,
                    dpaStatus: vendorContracts.length > 0 ? 'has_contracts' : 'no_contracts',
                    dpaExpiryDate: vendorContracts[0]?.endDate || null,
                    contracts: vendorContracts.length
                };
            });
        }),
});

export default vendorsRouter;


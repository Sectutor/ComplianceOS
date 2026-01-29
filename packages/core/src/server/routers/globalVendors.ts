import { z } from "zod";
import { getDb } from "../../db";
import { globalVendors, vendors } from "../../schema";
import { eq, ilike, or, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const createGlobalVendorsRouter = (t: any, clientProcedure: any) => {
    return t.router({
        list: clientProcedure
            .input(z.object({
                search: z.string().optional(),
                limit: z.number().default(50),
                offset: z.number().default(0),
            }))
            .query(async ({ input }) => {
                const db = await getDb();
                let query = db.select().from(globalVendors);

                if (input.search) {
                    query = query.where(
                        or(
                            ilike(globalVendors.name, `%${input.search}%`),
                            ilike(globalVendors.website, `%${input.search}%`)
                        )
                    ) as any;
                }

                return await query
                    .limit(input.limit)
                    .offset(input.offset)
                    .orderBy(globalVendors.name);
            }),

        import: clientProcedure
            .input(z.object({
                clientId: z.number(),
                globalVendorId: z.number()
            }))
            .mutation(async ({ input }) => {
                const db = await getDb();
                
                // 1. Get global vendor details
                const [globalVendor] = await db.select()
                    .from(globalVendors)
                    .where(eq(globalVendors.id, input.globalVendorId))
                    .limit(1);

                if (!globalVendor) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Global vendor not found" });
                }

                // 2. Check if already exists in organization
                const existing = await db.select()
                    .from(vendors)
                    .where(and(eq(vendors.clientId, input.clientId), eq(vendors.website, globalVendor.website)))
                    .limit(1);

                if (existing.length > 0) {
                    return existing[0];
                }

                // 3. Create organization vendor
                const [newVendor] = await db.insert(vendors).values({
                    clientId: input.clientId,
                    name: globalVendor.name,
                    website: globalVendor.website,
                    trustCenterUrl: globalVendor.trustCenterUrl,
                    category: "SaaS", // Default
                    status: "Active",
                    reviewStatus: "active", // Directly mark as active since it's from global database
                    source: "Global Catalog",
                    discoveryDate: new Date(),
                    criticality: "Medium",
                    dataAccess: "Internal"
                }).returning();

                // 4. Trigger AI VRM Agent analysis if we didn't have data yet
                if (newVendor.trustCenterUrl) {
                    (async () => {
                        try {
                            const { vrmAgent } = await import('../../lib/ai/vrm-agent');
                            await vrmAgent.analyzeTrustCenter(newVendor.id, newVendor.trustCenterUrl);
                        } catch (e) {
                            console.error("Post-import analysis failed:", e);
                        }
                    })();
                }

                return newVendor;
            }),
    });
};

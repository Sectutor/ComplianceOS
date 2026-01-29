import { z } from "zod";
import { getDb } from "../../db";
import { vendors } from "../../schema";
import { eq, and, desc } from "drizzle-orm";
import { vrmAgent } from "../../lib/ai/vrm-agent";

export const createSubprocessorsRouter = (t: any, clientProcedure: any, publicProcedure: any) => {
    return t.router({
        // List all subprocessors for a client
        list: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                return await db.select()
                    .from(vendors)
                    .where(and(
                        eq(vendors.clientId, input.clientId),
                        eq(vendors.isSubprocessor, true)
                    ))
                    .orderBy(desc(vendors.updatedAt));
            }),

        // Get recursive map (Tree structure) for visualization
        getMap: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                const allVendors = await db.select()
                    .from(vendors)
                    .where(eq(vendors.clientId, input.clientId));

                // Structure data for the UI tree view
                // We map top-level vendors and their specific sub-sub-processors from the JSON field
                return allVendors.filter(v => v.isSubprocessor || (v.recursiveSubprocessors && (v.recursiveSubprocessors as any[]).length > 0))
                    .map(v => ({
                        id: v.id,
                        name: v.name,
                        isSubprocessor: v.isSubprocessor,
                        dataLocation: v.dataLocation,
                        transferMechanism: v.transferMechanism,
                        children: v.recursiveSubprocessors || []
                    }));
            }),

        // Manually trigger analysis
        analyze: clientProcedure
            .input(z.object({
                vendorId: z.number(),
                url: z.string().url()
            }))
            .mutation(async ({ input }: { input: any }) => {
                return await vrmAgent.analyzeTrustCenter(input.vendorId, input.url);
            }),

        // Public Access for Embed
        publicExport: publicProcedure
            .input(z.object({
                clientId: z.number(),
                // In a real app, we'd validate a public key/token here
                limit: z.number().optional()
            }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();

                const subs = await db.select({
                    name: vendors.name,
                    category: vendors.category,
                    dataLocation: vendors.dataLocation,
                    transferMechanism: vendors.transferMechanism,
                    updatedAt: vendors.updatedAt
                })
                    .from(vendors)
                    .where(and(
                        eq(vendors.clientId, input.clientId),
                        eq(vendors.isSubprocessor, true)
                    ));

                // Calculate latest update
                let latestDate = new Date(0);
                subs.forEach(s => {
                    if (s.updatedAt && new Date(s.updatedAt) > latestDate) latestDate = new Date(s.updatedAt);
                });

                return {
                    lastUpdated: latestDate.getTime() === 0 ? new Date() : latestDate,
                    subprocessors: subs
                };
            })
    });
};

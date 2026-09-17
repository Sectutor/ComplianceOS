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
            .query(async ({ input }: { input: { search?: string, limit: number, offset: number } }) => {
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
            .mutation(async ({ input }: { input: { clientId: number, globalVendorId: number } }) => {
                console.log("Starting globalVendors.import", input);
                const db = await getDb();

                try {
                    // 1. Get global vendor details
                    console.log("Fetching global vendor...");
                    const [globalVendor] = await db.select()
                        .from(globalVendors)
                        .where(eq(globalVendors.id, input.globalVendorId))
                        .limit(1);

                    if (!globalVendor) {
                        console.error("Global vendor not found");
                        throw new TRPCError({ code: "NOT_FOUND", message: "Global vendor not found" });
                    }
                    console.log("Found global vendor:", globalVendor);

                    // 2. Check if already exists in organization
                    console.log("Checking for existing vendor...");
                    const existing = await db.select()
                        .from(vendors)
                        .where(and(eq(vendors.clientId, input.clientId), eq(vendors.website, globalVendor.website)))
                        .limit(1);

                    if (existing.length > 0) {
                        console.log("Vendor already exists:", existing[0]);
                        return existing[0];
                    }

                    // 3. Create organization vendor
                    console.log("Creating new vendor...");
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
                    console.log("Created new vendor:", newVendor);

                    // 4. Trigger AI VRM Agent analysis if we didn't have data yet
                    if (newVendor.trustCenterUrl) {
                        (async () => {
                            try {
                                console.log("Triggering VRM Agent...");
                                const { vrmAgent } = await import('../../lib/ai/vrm-agent');
                                await vrmAgent.analyzeTrustCenter(newVendor.id, newVendor.trustCenterUrl);
                            } catch (e) {
                                console.error("Post-import analysis failed:", e);
                            }
                        })();
                    }

                    return newVendor;
                } catch (error) {
                    console.error("Error in globalVendors.import:", error);
                    throw error;
                }
            }),

        create: clientProcedure
            .input(z.object({
                name: z.string().min(1, "Vendor name is required"),
                website: z.string().optional(),
                trustCenterUrl: z.string().optional(),
                platform: z.string().optional(),
            }))
            .mutation(async ({ input }: { input: { name: string; website?: string; trustCenterUrl?: string; platform?: string } }) => {
                const db = await getDb();

                let cleanWebsite = input.website?.trim() || "";
                if (cleanWebsite && !cleanWebsite.startsWith("http://") && !cleanWebsite.startsWith("https://")) {
                    cleanWebsite = `https://${cleanWebsite}`;
                }

                let cleanTrustCenter = input.trustCenterUrl?.trim() || "";
                if (cleanTrustCenter && !cleanTrustCenter.startsWith("http://") && !cleanTrustCenter.startsWith("https://")) {
                    cleanTrustCenter = `https://${cleanTrustCenter}`;
                }

                let domain = "";
                if (cleanWebsite) {
                    try {
                        domain = new URL(cleanWebsite).hostname;
                    } catch (e) {
                        domain = cleanWebsite.replace(/^https?:\/\//, "").split("/")[0];
                    }
                }

                const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "";

                const [newGlobalVendor] = await db.insert(globalVendors).values({
                    name: input.name.trim(),
                    website: cleanWebsite || null,
                    trustCenterUrl: cleanTrustCenter || null,
                    platform: input.platform?.trim() || "SaaS",
                    faviconUrl: faviconUrl || null,
                }).returning();

                return newGlobalVendor;
            }),

        syncFromTrustLists: clientProcedure
            .mutation(async () => {
                console.log("[GlobalVendors] Syncing from TrustLists Open Source Database...");
                const db = await getDb();
                const { TRUSTLISTS_OPEN_SOURCE_DB } = await import("../../data/trustlistsVendors");

                let addedCount = 0;
                let updatedCount = 0;

                for (const item of TRUSTLISTS_OPEN_SOURCE_DB) {
                    const existing = await db.select()
                        .from(globalVendors)
                        .where(or(eq(globalVendors.name, item.name), eq(globalVendors.website, item.website)))
                        .limit(1);

                    if (existing.length > 0) {
                        await db.update(globalVendors)
                            .set({
                                website: item.website,
                                trustCenterUrl: item.trustCenterUrl,
                                platform: item.platform,
                                faviconUrl: item.faviconUrl,
                                updatedAt: new Date()
                            })
                            .where(eq(globalVendors.id, existing[0].id));
                        updatedCount++;
                    } else {
                        await db.insert(globalVendors).values({
                            name: item.name,
                            website: item.website,
                            trustCenterUrl: item.trustCenterUrl,
                            platform: item.platform,
                            faviconUrl: item.faviconUrl
                        });
                        addedCount++;
                    }
                }

                return {
                    success: true,
                    totalSynced: TRUSTLISTS_OPEN_SOURCE_DB.length,
                    added: addedCount,
                    updated: updatedCount,
                    message: `Synced ${TRUSTLISTS_OPEN_SOURCE_DB.length} vendors from TrustLists Open Source Database (${addedCount} new added, ${updatedCount} updated).`
                };
            }),
    });
};

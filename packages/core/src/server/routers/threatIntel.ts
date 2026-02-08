import { z } from "zod";
import * as threatIntel from "../../lib/threatIntelligence";
import { eq, desc, sql } from "drizzle-orm";
import * as db from "../../db";
import { TRPCError } from "@trpc/server";

export const createThreatIntelRouter = (t: any, adminProcedure: any, publicProcedure: any, protectedProcedure: any, clientProcedure: any) => t.router({
    // Scan a single asset for CVE matches
    scanAsset: clientProcedure
        .input(z.object({
            clientId: z.number(),
            assetId: z.number(),
        }))
        .mutation(async ({ input }: any) => {
            const dbConn = await db.getDb();
            const { assets } = await import("../../schema");

            const asset = await dbConn.select().from(assets)
                .where(eq(assets.id, input.assetId))
                .limit(1);

            if (!asset[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });

            const suggestions = await threatIntel.scanAssetForCves(asset[0]);
            return { suggestions, scannedAt: new Date() };
        }),

    // Scan all assets for a client
    scanAllAssets: clientProcedure
        .input(z.object({ clientId: z.number() }))
        .mutation(async ({ input }: any) => {
            const results = await threatIntel.scanAllAssetsForClient(input.clientId);
            return { results, scannedAt: new Date() };
        }),

    // Get CVE suggestions for an asset (from cache)
    getAssetSuggestions: clientProcedure
        .input(z.object({ assetId: z.number() }))
        .query(async ({ input }: any) => {
            const suggestions = await threatIntel.getAssetCveSuggestions(input.assetId);
            return suggestions;
        }),

    // Get CVE details (from cache or fetch)
    getCveDetails: publicProcedure
        .input(z.object({ cveId: z.string() }))
        .query(async ({ input }: any) => {
            const dbConn = await db.getDb();
            const { nvdCveCache } = await import("../../schema");

            const cached = await dbConn.select().from(nvdCveCache)
                .where(eq(nvdCveCache.cveId, input.cveId))
                .limit(1);

            if (cached[0]) {
                return cached[0];
            }

            const nvdResult = await threatIntel.getCveById(input.cveId);
            if (nvdResult?.vulnerabilities?.[0]) {
                await threatIntel.cacheCveData(nvdResult.vulnerabilities[0].cve);
                const newCached = await dbConn.select().from(nvdCveCache)
                    .where(eq(nvdCveCache.cveId, input.cveId))
                    .limit(1);
                return newCached[0] || null;
            }

            return null;
        }),

    // Lookup a CVE by ID (mutation for Vulnerability Editor)
    lookupCve: publicProcedure
        .input(z.object({ cveId: z.string() }))
        .mutation(async ({ input }: any) => {
            const dbConn = await db.getDb();
            const { nvdCveCache } = await import("../../schema");

            if (dbConn) {
                const cached = await dbConn.select().from(nvdCveCache)
                    .where(eq(nvdCveCache.cveId, input.cveId))
                    .limit(1);

                if (cached[0]) {
                    return { cve: cached[0], source: 'cache' };
                }
            }

            const nvdResult = await threatIntel.getCveById(input.cveId);
            if (nvdResult?.vulnerabilities?.[0]) {
                const cve = nvdResult.vulnerabilities[0].cve;

                if (dbConn) {
                    await threatIntel.cacheCveData(cve);
                }

                const cvssV31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
                const cvssV2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData;
                const cvssScore = cvssV31?.baseScore?.toString() || cvssV2?.baseScore?.toString() || null;

                return {
                    cve: {
                        cveId: cve.id,
                        description: cve.descriptions.find((d: any) => d.lang === 'en')?.value || cve.descriptions[0]?.value || '',
                        cvssScore,
                        cvssVector: cvssV31?.vectorString || cvssV2?.vectorString || null,
                    },
                    source: 'nvd'
                };
            }

            return { cve: null, source: 'not_found' };
        }),

    // Scan a single vendor for CVE matches
    scanVendor: clientProcedure
        .input(z.object({
            clientId: z.number(),
            vendorId: z.number(),
        }))
        .mutation(async ({ input }: any) => {
            const suggestions = await threatIntel.scanVendorForCves(input.vendorId);
            return { suggestions, scannedAt: new Date() };
        }),

    // Get CVE suggestions for a vendor (from cache)
    getVendorSuggestions: clientProcedure
        .input(z.object({ vendorId: z.number() }))
        .query(async ({ input }: any) => {
            const suggestions = await threatIntel.getVendorCveSuggestions(input.vendorId);
            return suggestions;
        }),

    // Sync CISA KEV catalog
    syncKevCatalog: adminProcedure
        .mutation(async () => {
            const count = await threatIntel.syncCisaKevCatalog();
            return { synced: count, syncedAt: new Date() };
        }),

    // Get KEV catalog stats
    getKevStats: publicProcedure
        .query(async () => {
            const dbConn = await db.getDb();
            const { cisaKevCache, threatIntelSyncLog } = await import("../../schema");

            const countResult = await dbConn.select({ count: sql<number>`count(*)` })
                .from(cisaKevCache);

            const lastSync = await dbConn.select().from(threatIntelSyncLog)
                .where(eq(threatIntelSyncLog.source, 'cisa_kev'))
                .orderBy(desc(threatIntelSyncLog.completedAt))
                .limit(1);

            return {
                total: countResult[0]?.count || 0,
                lastSync: lastSync[0]?.completedAt || null,
            };
        }),

    // Update match status (accept/dismiss/import)
    updateMatchStatus: clientProcedure
        .input(z.object({
            matchId: z.number(),
            status: z.enum(['accepted', 'dismissed', 'imported']),
        }))
        .mutation(async ({ input, ctx }: any) => {
            await threatIntel.updateMatchStatus(input.matchId, input.status, ctx.user?.id);
            return { success: true };
        }),

    // Import CVE as vulnerability
    importCveAsVulnerability: clientProcedure
        .input(z.object({
            clientId: z.number(),
            assetId: z.number(),
            cveId: z.string(),
            matchId: z.number().optional(),
        }))
        .mutation(async ({ input }: any) => {
            const dbConn = await db.getDb();
            const { nvdCveCache, vulnerabilities, assetCveMatches } = await import("../../schema");

            const cached = await dbConn.select().from(nvdCveCache)
                .where(eq(nvdCveCache.cveId, input.cveId))
                .limit(1);

            if (!cached[0]) {
                throw new TRPCError({ code: "NOT_FOUND", message: "CVE not found in cache" });
            }

            const cve = cached[0];
            const isKev = await threatIntel.isInKevCatalog(input.cveId);

            const cvssNum = parseFloat(cve.cvssScore || '0');
            const cvssInt = Math.round(cvssNum * 10);

            const [newVuln] = await dbConn.insert(vulnerabilities).values({
                clientId: input.clientId,
                vulnerabilityId: input.cveId,
                name: `${input.cveId}: ${cve.description?.substring(0, 100)}...`,
                description: cve.description,
                cveId: input.cveId,
                severity: cvssNum >= 9 ? 'Critical' :
                    cvssNum >= 7 ? 'High' :
                        cvssNum >= 4 ? 'Medium' : 'Low',
                cvssScore: cvssInt,
                affectedAssets: [],
                source: 'NVD',
                status: 'open',
                discoveryDate: new Date(),
            }).returning();

            if (input.matchId) {
                await dbConn.update(assetCveMatches)
                    .set({
                        status: 'imported',
                        importedVulnerabilityId: newVuln.id,
                        reviewedAt: new Date(),
                    })
                    .where(eq(assetCveMatches.id, input.matchId));
            }

            return { vulnerability: newVuln, isKev };
        }),
});

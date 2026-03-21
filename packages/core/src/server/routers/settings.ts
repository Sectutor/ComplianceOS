import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { clientSettings } from "../../schema_client_settings";

// Default settings structure (matches premium version defaults)
const defaultBrandingOverrides = {
    appName: "GRCompliance",
    logoUrl: null,
    primaryColor: "#3B82F6",
    logoSize: 100,
    sidebarBg: "#020617",
    headingFont: "Outfit",
    bodyFont: "Inter",
    portalTitle: "GRCompliance Portal",
    baseFontSize: 16,
};

export const createSettingsRouter = (t: any, protectedProcedure: any) => {
    return t.router({
        // Get client settings for the current client context
        getClientSettings: protectedProcedure
            .input(
                z.object({
                    clientId: z.number().optional(),
                }).optional()
            )
            .query(async ({ ctx, input }: any) => {
                const clientId = input?.clientId ?? ctx.clientId;
                if (!clientId) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Client ID is required",
                    });
                }

                try {
                    const db = await getDb();
                    const rows = await db
                        .select()
                        .from(clientSettings)
                        .where(eq(clientSettings.clientId, clientId))
                        .limit(1);

                    if (!rows[0]) {
                        return {
                            id: 0,
                            clientId,
                            brandingOverrides: null,
                            featureFlags: null,
                            customSettings: null,
                            version: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        };
                    }

                    return rows[0];
                } catch (err: any) {
                    // Table may not exist yet (migration pending) — return defaults gracefully
                    if (err?.message?.includes('relation') || err?.message?.includes('does not exist') || err?.code === '42P01') {
                        console.warn('[Settings] client_settings table not found — run migration 002_create_client_settings.sql');
                        return {
                            id: 0,
                            clientId,
                            brandingOverrides: null,
                            featureFlags: null,
                            customSettings: null,
                            version: 1,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        };
                    }
                    throw err;
                }
            }),

        // Update client settings (upsert)
        updateClientSettings: protectedProcedure
            .input(
                z.object({
                    clientId: z.number().optional(),
                    brandingOverrides: z.record(z.any()).optional(),
                    featureFlags: z.record(z.any()).optional(),
                    customSettings: z.record(z.any()).optional(),
                    version: z.number().optional(),
                })
            )
            .mutation(async ({ ctx, input }: any) => {
                const clientId = input?.clientId ?? ctx.clientId;
                if (!clientId) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Client ID is required",
                    });
                }

                try {
                    const db = await getDb();
                    const existingRows = await db
                        .select()
                        .from(clientSettings)
                        .where(eq(clientSettings.clientId, clientId))
                        .limit(1);

                    const existing = existingRows[0];
                    const now = new Date();

                    if (!existing) {
                        const inserted = await db.insert(clientSettings).values({
                            clientId,
                            brandingOverrides: input.brandingOverrides ?? null,
                            featureFlags: input.featureFlags ?? null,
                            customSettings: input.customSettings ?? null,
                            version: input.version ?? 1,
                            createdAt: now,
                            updatedAt: now,
                        }).returning();
                        return inserted[0];
                    }

                    const updated = await db.update(clientSettings)
                        .set({
                            brandingOverrides: input.brandingOverrides !== undefined
                                ? input.brandingOverrides
                                : existing.brandingOverrides,
                            featureFlags: input.featureFlags !== undefined
                                ? input.featureFlags
                                : existing.featureFlags,
                            customSettings: input.customSettings !== undefined
                                ? input.customSettings
                                : existing.customSettings,
                            version: input.version ?? existing.version,
                            updatedAt: now,
                        })
                        .where(eq(clientSettings.id, existing.id))
                        .returning();
                    return updated[0];
                } catch (err: any) {
                    if (err?.message?.includes('relation') || err?.message?.includes('does not exist') || err?.code === '42P01') {
                        console.warn('[Settings] client_settings table not found — skipping save, run migration 002_create_client_settings.sql');
                        return { clientId, brandingOverrides: input.brandingOverrides ?? null };
                    }
                    throw err;
                }
            }),

        // Reset client settings to defaults
        resetClientSettings: protectedProcedure
            .mutation(async ({ ctx }: any) => {
                if (!ctx.clientId) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Client ID is required",
                    });
                }

                const db = await getDb();
                const now = new Date();

                const updated = await db.update(clientSettings)
                    .set({
                        brandingOverrides: null,
                        featureFlags: null,
                        customSettings: null,
                        version: 1,
                        updatedAt: now,
                    })
                    .where(eq(clientSettings.clientId, ctx.clientId))
                    .returning();

                if (updated.length === 0) {
                    const inserted = await db.insert(clientSettings).values({
                        clientId: ctx.clientId,
                        brandingOverrides: null,
                        featureFlags: null,
                        customSettings: null,
                        version: 1,
                        createdAt: now,
                        updatedAt: now,
                    }).returning();
                    return inserted[0];
                }

                return updated[0];
            }),
    });
};

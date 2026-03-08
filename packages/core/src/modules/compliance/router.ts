/**
 * Compliance Module - Router
 * 
 * This module handles compliance requirements, controls, and framework management.
 * Extracted from monolithic routers.ts as part of modularization.
 * 
 * NOTE: This is a foundational module. The full implementation should be
 * migrated from server/routers/compliance.ts progressively.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure, protectedProcedure, publicProcedure } from "../../server/trpc";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";
import { logActivity } from "../../lib/audit";

// Import schema from main schema (to be split in Phase 4)
import {
    clients,
    controls,
    clientControls,
    complianceRequirements,
    controlMappings,
    controlPolicyMappings,
    frameworkMappings
} from "../../schema";

export const complianceRouter = router({
    // =========================================================================
    // Nested Router: Client Controls (migrated from server/routers/compliance.ts)
    // =========================================================================
    clientControls: router({
        /**
         * List all client controls with control details
         */
        list: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                // Import the db function
                const { getClientControls } = await import('../../db');
                return await getClientControls(input.clientId);
            }),

        /**
         * Get a single client control by ID
         */
        get: publicProcedure
            .input(z.object({ id: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const [control] = await db.select()
                    .from(clientControls)
                    .where(eq(clientControls.id, input.id))
                    .limit(1);
                if (!control) throw new TRPCError({ code: "NOT_FOUND" });
                return control;
            }),

        /**
         * Create a custom client control
         */
        createCustom: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                name: z.string(),
                description: z.string().optional(),
                status: z.string().default('not_implemented'),
                applicability: z.string().default('applicable'),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const [control] = await db.insert(clientControls)
                    .values({
                        clientId: input.clientId,
                        name: input.name,
                        description: input.description,
                        status: input.status,
                        applicability: input.applicability,
                        isCustom: true,
                    })
                    .returning();
                return control;
            }),

        /**
         * Create a new client control from a master control
         */
        create: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                controlId: z.number(),
                status: z.string().default('not_implemented'),
                applicability: z.string().default('applicable'),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const [control] = await db.insert(clientControls)
                    .values({
                        clientId: input.clientId,
                        controlId: input.controlId,
                        status: input.status,
                        applicability: input.applicability,
                    })
                    .returning();
                return control;
            }),

        /**
         * Update a client control
         */
        update: clientEditorProcedure
            .input(z.object({
                id: z.number(),
                name: z.string().optional(),
                description: z.string().optional(),
                status: z.string().optional(),
                applicability: z.string().optional(),
                implementationNotes: z.string().optional(),
                evidenceLocation: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const { id, ...updateData } = input;
                const [updated] = await db.update(clientControls)
                    .set({ ...updateData, updatedAt: new Date() })
                    .where(eq(clientControls.id, id))
                    .returning();
                if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
                return updated;
            }),

        /**
         * Delete a client control (admin only)
         */
        delete: adminProcedure
            .input(z.object({ id: z.number() }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.delete(clientControls).where(eq(clientControls.id, input.id));
                return { success: true };
            }),

        /**
         * Bulk assign controls to a client (admin only)
         */
        bulkAssign: adminProcedure
            .input(z.object({
                clientId: z.number(),
                controlIds: z.array(z.number()),
                status: z.string().default('not_implemented'),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const { clientId, controlIds, status } = input;

                // Check existing assignments
                const existing = await db.select({ controlId: clientControls.controlId })
                    .from(clientControls)
                    .where(and(
                        eq(clientControls.clientId, clientId),
                        inArray(clientControls.controlId, controlIds)
                    ));
                const existingIds = existing.map((e: any) => e.controlId);
                const newControlIds = controlIds.filter((id: number) => !existingIds.includes(id));

                if (newControlIds.length === 0) {
                    return { success: true, count: 0 };
                }

                const newControls = newControlIds.map((controlId: number) => ({
                    clientId,
                    controlId,
                    status,
                    applicability: 'applicable',
                }));

                await db.insert(clientControls).values(newControls);
                return { success: true, count: newControls.length };
            }),

        /**
         * Get control mappings for a client control
         */
        getMappings: clientProcedure
            .input(z.object({ controlId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                return await db.select()
                    .from(controlMappings)
                    .where(eq(controlMappings.sourceControlId, input.controlId));
            }),

        /**
         * Sync control status from source to target controls (admin only)
         */
        sync: adminProcedure
            .input(z.object({ sourceClientControlId: z.number() }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();

                // 1. Get Source Control
                const [source] = await db.select()
                    .from(clientControls)
                    .where(eq(clientControls.id, input.sourceClientControlId))
                    .limit(1);
                if (!source) throw new TRPCError({ code: "NOT_FOUND" });

                // 2. Find Mappings for this Control
                const mappings = await db.select({ targetControlId: controlMappings.targetControlId })
                    .from(controlMappings)
                    .where(eq(controlMappings.sourceControlId, source.controlId));

                if (mappings.length === 0) return { syncedCount: 0 };

                const targetGlobalIds = mappings.map((m: any) => m.targetControlId);

                // 3. Find Target Client Controls to Update
                const targets = await db.select({ id: clientControls.id })
                    .from(clientControls)
                    .where(and(
                        eq(clientControls.clientId, source.clientId),
                        inArray(clientControls.controlId, targetGlobalIds)
                    ));

                if (targets.length === 0) return { syncedCount: 0 };

                const targetClientControlIds = targets.map((t: any) => t.id);

                // 4. Bulk Update
                await db.update(clientControls)
                    .set({
                        status: source.status,
                        applicability: source.applicability,
                        implementationNotes: (source.implementationNotes || "") + `\n(Synced from control ${source.id})`,
                        evidenceLocation: source.evidenceLocation
                    })
                    .where(inArray(clientControls.id, targetClientControlIds));

                return { syncedCount: targets.length };
            }),

        /**
         * Apply a framework baseline to controls (admin only)
         * This creates client controls from baseline controls
         */
        applyBaseline: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                baselineControls: z.array(z.object({
                    controlId: z.number(),
                    status: z.string().default('not_implemented'),
                })),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const db = await getDb();
                const { clientId, baselineControls } = input;

                // Get existing control IDs for this client
                const existing = await db.select({ controlId: clientControls.controlId })
                    .from(clientControls)
                    .where(eq(clientControls.clientId, clientId));
                const existingIds = existing.map((e: any) => e.controlId);

                // Filter out controls that already exist
                const newControls = baselineControls
                    .filter((bc: any) => !existingIds.includes(bc.controlId))
                    .map((bc: any) => ({
                        clientId,
                        controlId: bc.controlId,
                        status: bc.status,
                        applicability: 'applicable',
                    }));

                if (newControls.length === 0) {
                    return { success: true, count: 0 };
                }

                await db.insert(clientControls).values(newControls);
                return { success: true, count: newControls.length };
            }),
    }),

    // =========================================================================
    // Compliance Requirements
    // =========================================================================

    /**
     * List compliance requirements for a client
     */
    listRequirements: clientProcedure
        .input(z.object({
            clientId: z.number(),
            frameworkId: z.number().optional(),
            status: z.string().optional(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            // Build conditions array to properly combine multiple filters
            const conditions = [
                eq(complianceRequirements.clientId, input.clientId)
            ];

            if (input.frameworkId) {
                conditions.push(eq(complianceRequirements.frameworkId, input.frameworkId));
            }

            const query = db.select()
                .from(complianceRequirements)
                .where(and(...conditions));

            return query.orderBy(asc(complianceRequirements.name));
        }),

    /**
     * Get a single compliance requirement
     */
    getRequirement: clientProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [requirement] = await db.select()
                .from(complianceRequirements)
                .where(and(
                    eq(complianceRequirements.id, input.id),
                    eq(complianceRequirements.clientId, input.clientId)
                ))
                .limit(1);

            if (!requirement) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Compliance requirement not found" });
            }

            return requirement;
        }),

    /**
     * Create a new compliance requirement
     */
    createRequirement: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            name: z.string().min(1),
            description: z.string().optional(),
            frameworkId: z.number().optional(),
            category: z.string().optional(),
            status: z.string().default('pending'),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            if (!ctx.user?.id) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
            }

            const [requirement] = await db.insert(complianceRequirements)
                .values({
                    clientId: input.clientId,
                    name: input.name,
                    description: input.description,
                    frameworkId: input.frameworkId,
                    category: input.category,
                    status: input.status,
                })
                .returning();

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "create",
                entityType: "compliance_requirement",
                entityId: requirement.id,
                details: { name: input.name }
            });

            return requirement;
        }),

    /**
     * Update a compliance requirement
     */
    updateRequirement: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            status: z.string().optional(),
            category: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            if (!ctx.user?.id) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
            }

            const [updated] = await db.update(complianceRequirements)
                .set({
                    ...input,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(complianceRequirements.id, input.id),
                    eq(complianceRequirements.clientId, input.clientId)
                ))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "update",
                entityType: "compliance_requirement",
                entityId: updated.id,
                details: { name: updated.name }
            });

            return updated;
        }),

    /**
     * Delete a compliance requirement
     */
    deleteRequirement: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            if (!ctx.user?.id) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
            }

            await db.delete(complianceRequirements)
                .where(and(
                    eq(complianceRequirements.id, input.id),
                    eq(complianceRequirements.clientId, input.clientId)
                ));

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "delete",
                entityType: "compliance_requirement",
                entityId: input.id,
                details: {}
            });

            return { success: true };
        }),

    // =========================================================================
    // Client Controls
    // =========================================================================

    /**
     * List controls for a client
     */
    listControls: clientProcedure
        .input(z.object({
            clientId: z.number(),
            status: z.string().optional(),
            frameworkId: z.number().optional(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            let query = db.select()
                .from(clientControls)
                .where(eq(clientControls.clientId, input.clientId));

            return query.orderBy(asc(clientControls.name));
        }),

    /**
     * Get a single client control
     */
    getControl: clientProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            const [control] = await db.select()
                .from(clientControls)
                .where(and(
                    eq(clientControls.id, input.id),
                    eq(clientControls.clientId, input.clientId)
                ))
                .limit(1);

            if (!control) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Control not found" });
            }

            return control;
        }),

    /**
     * Create a custom control for a client
     */
    createControl: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            name: z.string().min(1),
            description: z.string().optional(),
            status: z.string().default('non-compliant'),
            applicability: z.string().default('applicable'),
            implementationNotes: z.string().optional(),
            evidenceLocation: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            if (!ctx.user?.id) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
            }

            const [control] = await db.insert(clientControls)
                .values({
                    clientId: input.clientId,
                    name: input.name,
                    description: input.description,
                    status: input.status,
                    applicability: input.applicability,
                    implementationNotes: input.implementationNotes,
                    evidenceLocation: input.evidenceLocation,
                    isCustom: true,
                })
                .returning();

            await logActivity({
                clientId: input.clientId,
                userId: ctx.user.id,
                action: "create",
                entityType: "client_control",
                entityId: control.id,
                details: { name: input.name }
            });

            return control;
        }),

    /**
     * Update a client control
     */
    updateControl: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            id: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            status: z.string().optional(),
            applicability: z.string().optional(),
            implementationNotes: z.string().optional(),
            evidenceLocation: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }: any) => {
            const db = await getDb();

            const [updated] = await db.update(clientControls)
                .set({
                    ...input,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(clientControls.id, input.id),
                    eq(clientControls.clientId, input.clientId)
                ))
                .returning();

            if (!updated) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return updated;
        }),

    // =========================================================================
    // Statistics & Dashboard
    // =========================================================================

    /**
     * Get compliance statistics for a client
     */
    getStats: clientProcedure
        .input(z.object({
            clientId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            // Get all controls for this client
            const allControls = await db.select()
                .from(clientControls)
                .where(eq(clientControls.clientId, input.clientId));

            // Get all requirements for this client
            const allRequirements = await db.select()
                .from(complianceRequirements)
                .where(eq(complianceRequirements.clientId, input.clientId));

            // Calculate stats
            const controlStats = {
                total: allControls.length,
                compliant: allControls.filter((c: any) => c.status === 'compliant').length,
                nonCompliant: allControls.filter((c: any) => c.status === 'non-compliant').length,
                partial: allControls.filter((c: any) => c.status === 'partial').length,
                notApplicable: allControls.filter((c: any) => c.status === 'not-applicable').length,
            };

            const requirementStats = {
                total: allRequirements.length,
                compliant: allRequirements.filter((r: any) => r.status === 'compliant').length,
                pending: allRequirements.filter((r: any) => r.status === 'pending').length,
                nonCompliant: allRequirements.filter((r: any) => r.status === 'non-compliant').length,
            };

            // Calculate overall score
            const compliantControls = controlStats.compliant + controlStats.notApplicable;
            const totalApplicable = controlStats.total - controlStats.notApplicable;
            const score = totalApplicable > 0 ? Math.round((compliantControls / totalApplicable) * 100) : 0;

            return {
                controls: controlStats,
                requirements: requirementStats,
                score,
                lastUpdated: new Date(),
            };
        }),

    // =========================================================================
    // Framework Mappings
    // =========================================================================

    /**
     * Get control mappings for a control
     */
    getControlMappings: clientProcedure
        .input(z.object({
            controlId: z.number(),
        }))
        .query(async ({ input }: any) => {
            const db = await getDb();

            return await db.select()
                .from(controlMappings)
                .where(eq(controlMappings.sourceControlId, input.controlId));
        }),

    /**
     * Map a control to a framework control
     */
    mapControl: clientEditorProcedure
        .input(z.object({
            clientId: z.number(),
            sourceControlId: z.number(),
            targetControlId: z.number(),
            mappingType: z.string().default('manual'),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            const [mapping] = await db.insert(controlMappings)
                .values({
                    sourceControlId: input.sourceControlId,
                    targetControlId: input.targetControlId,
                    mappingType: input.mappingType,
                })
                .returning();

            return mapping;
        }),

    /**
     * Remove a control mapping
     */
    unmapControl: clientEditorProcedure
        .input(z.object({
            mappingId: z.number(),
        }))
        .mutation(async ({ input }: any) => {
            const db = await getDb();

            await db.delete(controlMappings)
                .where(eq(controlMappings.id, input.mappingId));

            return { success: true };
        }),
});

export default complianceRouter;


import { z } from "zod";
import { complianceRequirements, onboardingTemplates, onboardingAssignments, employeeTrainingRecords, employeeAcknowledgments, employeeSecuritySetup, employees } from "../../schema";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../db";

/**
 * Additional onboarding procedures: templates, assignments, bulk import, analytics.
 * Merged into the main onboarding router via spread in the appRouter registration.
 */
export const createOnboardingExtrasRouter = (t: any, clientProcedure: any, clientEditorProcedure: any) => {
    return t.router({
        /**
         * List onboarding templates
         */
        listTemplates: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                return await db.select()
                    .from(onboardingTemplates)
                    .where(and(
                        eq(onboardingTemplates.clientId, input.clientId),
                        eq(onboardingTemplates.isActive, true)
                    ))
                    .orderBy(onboardingTemplates.name);
            }),

        /**
         * Create onboarding template
         */
        createTemplate: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                name: z.string().min(1),
                description: z.string().optional(),
                roleType: z.string().default('general'),
                requirementKeys: z.array(z.string()),
                trainingModuleIds: z.array(z.number()).optional().default([]),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const [tmpl] = await db.insert(onboardingTemplates)
                    .values({
                        clientId: input.clientId,
                        name: input.name,
                        description: input.description,
                        roleType: input.roleType,
                        requirementKeys: JSON.stringify(input.requirementKeys),
                        trainingModuleIds: JSON.stringify(input.trainingModuleIds),
                    })
                    .returning();
                return tmpl;
            }),

        /**
         * Update onboarding template
         */
        updateTemplate: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                id: z.number(),
                name: z.string().optional(),
                description: z.string().optional(),
                roleType: z.string().optional(),
                requirementKeys: z.array(z.string()).optional(),
                trainingModuleIds: z.array(z.number()).optional(),
                isActive: z.boolean().optional(),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const updateData: any = { updatedAt: new Date() };
                if (input.name !== undefined) updateData.name = input.name;
                if (input.description !== undefined) updateData.description = input.description;
                if (input.roleType !== undefined) updateData.roleType = input.roleType;
                if (input.requirementKeys !== undefined) updateData.requirementKeys = JSON.stringify(input.requirementKeys);
                if (input.trainingModuleIds !== undefined) updateData.trainingModuleIds = JSON.stringify(input.trainingModuleIds);
                if (input.isActive !== undefined) updateData.isActive = input.isActive;

                const [updated] = await db.update(onboardingTemplates)
                    .set(updateData)
                    .where(and(
                        eq(onboardingTemplates.id, input.id),
                        eq(onboardingTemplates.clientId, input.clientId)
                    ))
                    .returning();
                return updated;
            }),

        /**
         * Delete onboarding template (soft delete)
         */
        deleteTemplate: clientEditorProcedure
            .input(z.object({ clientId: z.number(), id: z.number() }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                await db.update(onboardingTemplates)
                    .set({ isActive: false, updatedAt: new Date() })
                    .where(and(
                        eq(onboardingTemplates.id, input.id),
                        eq(onboardingTemplates.clientId, input.clientId)
                    ));
                return { success: true };
            }),

        /**
         * Assign onboarding template to employee
         */
        assignToEmployee: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                employeeId: z.number(),
                templateId: z.number(),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const [assignment] = await db.insert(onboardingAssignments)
                    .values({
                        clientId: input.clientId,
                        employeeId: input.employeeId,
                        templateId: input.templateId,
                        status: 'assigned',
                        startedAt: new Date(),
                    })
                    .returning();
                return assignment;
            }),

        /**
         * Get employee onboarding assignment
         */
        getAssignment: clientProcedure
            .input(z.object({
                clientId: z.number(),
                employeeId: z.number(),
            }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const [assignment] = await db.select()
                    .from(onboardingAssignments)
                    .where(and(
                        eq(onboardingAssignments.clientId, input.clientId),
                        eq(onboardingAssignments.employeeId, input.employeeId)
                    ))
                    .orderBy(desc(onboardingAssignments.createdAt))
                    .limit(1);
                return assignment || null;
            }),

        /**
         * Bulk import requirements
         */
        bulkImportRequirements: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                requirements: z.array(z.object({
                    key: z.string().min(1),
                    title: z.string().min(1),
                    description: z.string().optional(),
                    isMandatory: z.boolean().default(true),
                    category: z.string().default('General'),
                    estimatedTimeMinutes: z.number().default(5),
                    documentType: z.string().default('acknowledgment'),
                })),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const last = await db.select({ displayOrder: complianceRequirements.displayOrder })
                    .from(complianceRequirements)
                    .where(eq(complianceRequirements.clientId, input.clientId))
                    .orderBy(desc(complianceRequirements.displayOrder))
                    .limit(1);
                let nextOrder = (last[0]?.displayOrder || 0) + 1;

                const results = [];
                for (const req of input.requirements) {
                    const [created] = await db.insert(complianceRequirements)
                        .values({
                            clientId: input.clientId,
                            key: req.key,
                            title: req.title,
                            description: req.description,
                            isMandatory: req.isMandatory,
                            category: req.category,
                            estimatedTimeMinutes: req.estimatedTimeMinutes,
                            documentType: req.documentType,
                            displayOrder: nextOrder,
                        })
                        .returning();
                    results.push(created);
                    nextOrder++;
                }
                return { imported: results.length, requirements: results };
            }),

        /**
         * Reorder requirements
         */
        reorderRequirements: clientEditorProcedure
            .input(z.object({
                clientId: z.number(),
                requirementIds: z.array(z.number()),
            }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                for (let i = 0; i < input.requirementIds.length; i++) {
                    await db.update(complianceRequirements)
                        .set({ displayOrder: i + 1, updatedAt: new Date() })
                        .where(and(
                            eq(complianceRequirements.id, input.requirementIds[i]),
                            eq(complianceRequirements.clientId, input.clientId)
                        ));
                }
                return { success: true, reordered: input.requirementIds.length };
            }),

        /**
         * Get onboarding analytics
         */
        getAnalytics: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const db = await getDb();
                const requirements = await db.select()
                    .from(complianceRequirements)
                    .where(and(
                        eq(complianceRequirements.clientId, input.clientId),
                        eq(complianceRequirements.isActive, true)
                    ));
                const allEmployees = await db.select()
                    .from(employees)
                    .where(eq(employees.clientId, input.clientId));
                const acknowledgments = await db.select()
                    .from(employeeAcknowledgments)
                    .where(eq(employeeAcknowledgments.clientId, input.clientId));
                const trainingRecords = await db.select()
                    .from(employeeTrainingRecords)
                    .where(eq(employeeTrainingRecords.clientId, input.clientId));
                const securitySetups = await db.select()
                    .from(employeeSecuritySetup)
                    .where(eq(employeeSecuritySetup.clientId, input.clientId));

                return {
                    totalRequirements: requirements.length,
                    mandatoryRequirements: requirements.filter((r: any) => r.isMandatory).length,
                    totalEmployees: allEmployees.length,
                    totalAcknowledgments: acknowledgments.length,
                    totalTrainingCompleted: trainingRecords.length,
                    securitySetupsComplete: securitySetups.filter((s: any) => s.mfaEnrolled && s.passwordManagerSetup && s.securityQuestionsSet).length,
                    estimatedTotalMinutes: requirements.reduce((sum: number, r: any) => sum + (r.estimatedTimeMinutes || 5), 0),
                };
            }),
    });
};

import { z } from "zod";
import * as crypto from "crypto";
import * as db from "../../db";
import { intakeItems, evidence, clients, clientPolicies, evidenceFiles, clientControls, controls } from "../../schema";
import { eq, desc, and, or } from "drizzle-orm";
import { classifyIntakeItem } from "../../lib/ai/intake-triage";

export const createIntakeRouter = (t: any, clientProcedure: any) => {
    return t.router({
        list: clientProcedure
            .input(z.object({
                clientId: z.number()
            }))
            .query(async ({ input }: any) => {
                const d = await db.getDb();
                return await d.select()
                    .from(intakeItems)
                    .where(eq(intakeItems.clientId, input.clientId))
                    .orderBy(desc(intakeItems.createdAt));
            }),

        listAll: clientProcedure // Ideally this would be adminProcedure/advisorProcedure
            .query(async () => {
                const d = await db.getDb();
                return await d.select({
                    id: intakeItems.id,
                    filename: intakeItems.filename,
                    status: intakeItems.status,
                    classification: intakeItems.classification,
                    createdAt: intakeItems.createdAt,
                    clientName: clients.name,
                    clientId: clients.id
                })
                    .from(intakeItems)
                    .innerJoin(clients, eq(intakeItems.clientId, clients.id))
                    .orderBy(desc(intakeItems.createdAt));
            }),

        create: clientProcedure
            .input(z.object({
                clientId: z.number(),
                filename: z.string(),
                fileUrl: z.string(),
                fileKey: z.string().optional(),
                fileBase64: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const d = await db.getDb();

                let fileBuffer: Buffer | undefined;
                if (input.fileBase64) {
                    fileBuffer = Buffer.from(input.fileBase64, 'base64');
                }

                // 1. Initial Insert
                const [item] = await d.insert(intakeItems).values({
                    clientId: input.clientId,
                    filename: input.filename,
                    fileUrl: input.fileUrl,
                    fileKey: input.fileKey,
                    uploadedBy: ctx.user?.id,
                    status: 'pending'
                }).returning();

                // 2. Perform AI Triage
                try {
                    const aiResult = await classifyIntakeItem(input.filename, input.clientId, fileBuffer);
                    const [updatedItem] = await d.update(intakeItems)
                        .set({
                            classification: aiResult.classification,
                            confidence: aiResult.confidence,
                            details: aiResult,
                            status: 'classified',
                            updatedAt: new Date()
                        })
                        .where(eq(intakeItems.id, item.id))
                        .returning();
                    return updatedItem;
                } catch (e) {
                    console.error("AI Triage failed during creation:", e);
                    return item; // Return it as pending if AI fails
                }
            }),

        triage: clientProcedure
            .input(z.object({
                id: z.number(),
                classification: z.string(),
                details: z.any().optional()
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                const [item] = await d.update(intakeItems)
                    .set({
                        classification: input.classification,
                        details: input.details,
                        status: 'classified',
                        updatedAt: new Date()
                    })
                    .where(eq(intakeItems.id, input.id))
                    .returning();
                return item;
            }),

        mapToEvidence: clientProcedure
            .input(z.object({
                intakeItemId: z.number(),
                clientControlId: z.number(),
                title: z.string(),
                evidenceId: z.number().optional() // New optional ID
            }))
            .mutation(async ({ input, ctx }: any) => {
                const d = await db.getDb();

                const [intakeItem] = await d.select().from(intakeItems).where(eq(intakeItems.id, input.intakeItemId));
                if (!intakeItem) throw new Error("Intake item not found");

                let existingRequest;

                // STRATEGY:
                // 1. If evidenceId is provided (Direct Map), use it.
                // 2. If valid clientControlId provided (classic logic), look up pending request for that control.

                if (input.evidenceId) {
                    const [req] = await d.select().from(evidence).where(eq(evidence.id, input.evidenceId));
                    if (req) existingRequest = req;
                }

                // Fallback to searching by control if no direct ID or if direct ID was invalid
                if (!existingRequest && input.clientControlId > 0) {
                    const [req] = await d.select()
                        .from(evidence)
                        .where(and(
                            eq(evidence.clientId, intakeItem.clientId),
                            eq(evidence.clientControlId, input.clientControlId),
                            eq(evidence.status, 'pending')
                        ))
                        .limit(1);
                    if (req) existingRequest = req;
                }

                // If we STILL don't have a request, and clientControlId is 0, we can't proceed with Creation
                if (!existingRequest && (!input.clientControlId || input.clientControlId === 0)) {
                    throw new Error("Cannot map evidence: No existing request selected and no valid Control linked.");
                }

                if (!existingRequest) {
                    // Check Client Control validity ONLY if we are creating new evidence
                    const [clientControl] = await d.select().from(clientControls).where(eq(clientControls.id, input.clientControlId));
                    if (!clientControl) throw new Error("Client control not found");
                    const [control] = await d.select().from(controls).where(eq(controls.id, clientControl.controlId)); // Only need control name if creating new
                }

                let evidenceRecordId;

                if (existingRequest) {
                    // Update existing placeholder
                    await d.update(evidence)
                        .set({
                            status: 'collected',
                            updatedAt: new Date(),
                            description: existingRequest.description || input.title
                        })
                        .where(eq(evidence.id, existingRequest.id));

                    evidenceRecordId = existingRequest.id;
                } else {
                    // Create NEW unsolicited evidence (Classic Path)
                    const [clientControl] = await d.select().from(clientControls).where(eq(clientControls.id, input.clientControlId));
                    const [control] = await d.select().from(controls).where(eq(controls.id, clientControl!.controlId));

                    const [newEvidence] = await d.insert(evidence).values({
                        clientId: intakeItem.clientId,
                        clientControlId: clientControl!.id,
                        evidenceId: `IE-${Date.now()}`,
                        description: `Evidence for ${control!.name}`,
                        status: 'collected',
                        source: 'intake',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    } as any).returning();

                    evidenceRecordId = newEvidence.id;
                }
                // 3. Create or Link File Record
                await d.insert(evidenceFiles).values({
                    evidenceId: evidenceRecordId,
                    filename: intakeItem.filename,
                    fileUrl: intakeItem.fileUrl,
                    fileKey: intakeItem.fileKey || 'legacy_migration_missing_key',
                    fileSize: 0,
                    status: 'active',
                    createdAt: new Date()
                });

                // 4. Link them on the intake item
                await d.update(intakeItems)
                    .set({
                        status: 'mapped',
                        mappedEvidenceId: evidenceRecordId,
                        updatedAt: new Date()
                    })
                    .where(eq(intakeItems.id, input.intakeItemId));

                return { success: true, evidenceId: evidenceRecordId };
            }),

        createFromPolicy: clientProcedure
            .input(z.object({
                clientId: z.number(),
                policyId: z.number()
            }))
            .mutation(async ({ input, ctx }: any) => {
                const d = await db.getDb();

                // 1. Get Policy
                const policy = await d.query.clientPolicies.findFirst({
                    where: eq(clientPolicies.id, input.policyId)
                });

                if (!policy) throw new Error("Policy not found");
                if (policy.clientId !== input.clientId) throw new Error("Policy does not belong to client");

                // 2. Create Intake Item
                const [item] = await d.insert(intakeItems).values({
                    clientId: input.clientId,
                    filename: `Policy: ${policy.name}`,
                    fileUrl: `/clients/${input.clientId}/policies/${input.policyId}`, // Deep link to policy
                    uploadedBy: ctx.user?.id,
                    status: 'classified',
                    classification: 'Policy Document',
                    confidence: 100,
                    details: {
                        source: 'policy_editor',
                        policyId: input.policyId,
                        version: policy.version,
                        auto_generated: true
                    }
                }).returning();

                return item;
            }),

        delete: clientProcedure
            .input(z.object({
                id: z.number()
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                await d.delete(intakeItems).where(eq(intakeItems.id, input.id));
                return { success: true };
            })
    });
};

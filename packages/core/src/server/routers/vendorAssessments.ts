
// Remove the incorrect import
import { z } from "zod";
// import { router, clientProcedure, publicProcedure } from "../trpc"; // Deleted
import { getDb } from "../../db"; // Adjust path as needed
import {
    vendorAssessmentTemplates,
    vendorAssessmentRequests,
    vendors,
    vendorAssessments,
    vendorDataRequests
} from "../../schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export const createVendorAssessmentsRouter = (t: any, clientProcedure: any, publicProcedure: any) => {
    return t.router({
        // Template Management
        createTemplate: clientProcedure
            .input(z.object({
                clientId: z.number(),
                name: z.string(),
                description: z.string().optional(),
                content: z.any(), // JSON content for questions
            }))
            .mutation(async ({ input, ctx }: { ctx: any, input: any }) => {
                const db = await getDb();
                const [template] = await db.insert(vendorAssessmentTemplates).values({
                    clientId: input.clientId,
                    name: input.name,
                    description: input.description,
                    content: input.content,
                    createdBy: ctx.user?.id,
                }).returning();
                return template;
            }),

        listTemplates: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                return await db.select().from(vendorAssessmentTemplates)
                    .where(eq(vendorAssessmentTemplates.clientId, input.clientId));
            }),

        updateTemplate: clientProcedure
            .input(z.object({
                id: z.number(),
                name: z.string().optional(),
                description: z.string().optional(),
                content: z.any().optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                const { id, ...data } = input;
                const [template] = await db.update(vendorAssessmentTemplates)
                    .set({ ...data, updatedAt: new Date() })
                    .where(eq(vendorAssessmentTemplates.id, id))
                    .returning();
                return template;
            }),

        getTemplate: clientProcedure
            .input(z.object({
                id: z.number(),
            }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                const [template] = await db.select().from(vendorAssessmentTemplates)
                    .where(eq(vendorAssessmentTemplates.id, input.id));
                return template;
            }),

        // Assessment Requests
        sendAssessment: clientProcedure
            .input(z.object({
                clientId: z.number(),
                vendorId: z.number(),
                templateId: z.number(),
                recipientEmail: z.string().email(),
                dueDate: z.string().optional(), // ISO date string
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                // 1. Generate a secure token
                const token = crypto.randomBytes(32).toString("hex");

                // 2. Create the request
                const [request] = await db.insert(vendorAssessmentRequests).values({
                    clientId: input.clientId,
                    vendorId: input.vendorId,
                    templateId: input.templateId,
                    token: token,
                    recipientEmail: input.recipientEmail,
                    status: "sent",
                    sentAt: new Date(),
                    expiresAt: input.dueDate ? new Date(input.dueDate) : undefined,
                }).returning();

                // 3. Mock Email Sending (Log for now)
                console.log(`[Email Sent] To: ${input.recipientEmail}, Link: /portal/assessment/${token}`);

                return request;
            }),

        // Public Access (for Vendors)
        getPublicAssessment: publicProcedure
            .input(z.object({
                token: z.string(),
            }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                const request = await db.query.vendorAssessmentRequests.findFirst({
                    where: eq(vendorAssessmentRequests.token, input.token),
                    with: {
                        // Join with template to get questions
                        // Note: Drizzle relations might not be set up in schema.ts yet for this, 
                        // so we might need a manual join or two queries.
                        // Let's rely on two queries for safety if relations aren't explicit.
                    }
                });

                if (!request) {
                    throw new Error("Invalid or expired assessment token.");
                }

                // Fetch template details
                const template = await db.query.vendorAssessmentTemplates.findFirst({
                    where: eq(vendorAssessmentTemplates.id, request.templateId)
                });

                const vendor = await db.query.vendors.findFirst({
                    where: eq(vendors.id, request.vendorId)
                });

                return {
                    request,
                    template,
                    vendorName: vendor?.name
                };
            }),

        submitAssessment: publicProcedure
            .input(z.object({
                token: z.string(),
                responses: z.any(), // JSON structure of answers
                status: z.enum(["in_progress", "submitted"]),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                const request = await db.query.vendorAssessmentRequests.findFirst({
                    where: eq(vendorAssessmentRequests.token, input.token),
                });

                if (!request) {
                    throw new Error("Invalid token.");
                }

                if (request.status === "completed" || request.status === "submitted") {
                    // Allow updates if just submitted? Maybe not.
                    // For now, let's allow re-submission if it's not "locked"
                }

                const updateData: any = {
                    responses: input.responses,
                    status: input.status,
                    updatedAt: new Date(),
                };

                if (input.status === "submitted") {
                    updateData.submittedAt = new Date();
                }

                await db.update(vendorAssessmentRequests)
                    .set(updateData)
                    .where(eq(vendorAssessmentRequests.id, request.id));

                return { success: true };
            }),

        // Consolidated Data Requests (Vanta Style)
        sendConsolidatedRequest: clientProcedure
            .input(z.object({
                clientId: z.number(),
                vendorId: z.number(),
                recipientEmail: z.string().email(),
                message: z.string().optional(),
                items: z.array(z.object({
                    type: z.enum(['questionnaire', 'document']),
                    id: z.number().optional(), // Template ID for questionnaire
                    name: z.string(),
                })),
                dueDate: z.string().optional(),
            }))
            .mutation(async ({ input, ctx }: { ctx: any, input: any }) => {
                const db = await getDb();
                const token = crypto.randomBytes(32).toString("hex");
                
                const instantiatedItems: any[] = [];
                
                for (const item of input.items) {
                    if (item.type === 'questionnaire' && item.id) {
                        const subToken = crypto.randomBytes(32).toString("hex");
                        const [req] = await db.insert(vendorAssessmentRequests).values({
                            clientId: input.clientId,
                            vendorId: input.vendorId,
                            templateId: item.id,
                            token: subToken,
                            recipientEmail: input.recipientEmail,
                            status: "sent",
                            sentAt: new Date(),
                            expiresAt: input.dueDate ? new Date(input.dueDate) : undefined,
                        }).returning();
                        
                        instantiatedItems.push({
                            ...item,
                            status: 'pending',
                            assessmentRequestId: req.id,
                            token: subToken
                        });
                    } else {
                        instantiatedItems.push({
                            ...item,
                            status: 'pending'
                        });
                    }
                }

                const [request] = await db.insert(vendorDataRequests).values({
                    clientId: input.clientId,
                    vendorId: input.vendorId,
                    token: token,
                    recipientEmail: input.recipientEmail,
                    message: input.message,
                    items: instantiatedItems,
                    status: "sent",
                    expiresAt: input.dueDate ? new Date(input.dueDate) : undefined,
                }).returning();

                console.log(`[Consolidated Request Sent] To: ${input.recipientEmail}, Portal Link: /portal/request/${token}`);
                return request;
            }),

        getConsolidatedRequest: publicProcedure
            .input(z.object({ token: z.string() }))
            .query(async ({ input }: { input: any }) => {
                const db = await getDb();
                const vdr = await db.query.vendorDataRequests.findFirst({
                    where: eq(vendorDataRequests.token, input.token),
                });

                if (!vdr) throw new Error("Invalid or expired request link.");

                const vendor = await db.query.vendors.findFirst({
                    where: eq(vendors.id, vdr.vendorId)
                });

                return {
                    request: vdr,
                    vendorName: vendor?.name
                };
            }),

        submitConsolidatedDocument: publicProcedure
            .input(z.object({
                token: z.string(),
                itemName: z.string(),
                fileUrl: z.string()
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                const vdr = await db.query.vendorDataRequests.findFirst({
                    where: eq(vendorDataRequests.token, input.token),
                });

                if (!vdr) throw new Error("Invalid token.");

                const newItems = vdr.items.map((item: any) => {
                    if (item.name === input.itemName && item.type === 'document') {
                        return { ...item, status: 'completed', fileUrl: input.fileUrl, completedAt: new Date().toISOString() };
                    }
                    return item;
                });

                const allItemsProcessed = newItems.every((i: any) => i.status === 'completed');

                await db.update(vendorDataRequests)
                    .set({ 
                        items: newItems, 
                        status: allItemsProcessed ? 'completed' : 'in_progress',
                        updatedAt: new Date() 
                    })
                    .where(eq(vendorDataRequests.id, vdr.id));

                return { success: true };
            }),

        // --- Standard CRUD Procedures (Moved from routers.ts) ---
        list: publicProcedure
            .input(z.object({ vendorId: z.number() }))
            .query(async ({ input }) => {
                const db = await getDb();
                return db.select().from(vendorAssessments).where(eq(vendorAssessments.vendorId, input.vendorId));
            }),

        listAll: publicProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }) => {
                const db = await getDb();
                const results = await db.select({
                    id: vendorAssessments.id,
                    vendorId: vendorAssessments.vendorId,
                    vendorName: vendors.name,
                    vendorCriticality: vendors.criticality,
                    type: vendorAssessments.type,
                    status: vendorAssessments.status,
                    dueDate: vendorAssessments.dueDate,
                    completedDate: vendorAssessments.completedDate,
                    score: vendorAssessments.score,
                })
                    .from(vendorAssessments)
                    .innerJoin(vendors, eq(vendorAssessments.vendorId, vendors.id))
                    .where(eq(vendors.clientId, input.clientId));

                return results;
            }),

        create: clientProcedure
            .input(z.object({
                clientId: z.number(),
                vendorId: z.number(),
                type: z.string(),
                status: z.string().optional(),
                dueDate: z.string().optional(),
                inherentImpact: z.string().optional(),
                inherentLikelihood: z.string().optional(),
                inherentRiskLevel: z.string().optional(),
                residualImpact: z.string().optional(),
                residualLikelihood: z.string().optional(),
                residualRiskLevel: z.string().optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                const { dueDate, ...rest } = input;
                const [assessment] = await db.insert(vendorAssessments).values({
                    ...rest,
                    dueDate: dueDate ? new Date(dueDate) : undefined
                }).returning();
                return assessment;
            }),

        update: clientProcedure
            .input(z.object({
                id: z.number(),
                status: z.string().optional(),
                score: z.number().optional(),
                findings: z.string().optional(),
                documentUrl: z.string().optional(),
                completedDate: z.string().optional(),
                inherentImpact: z.string().optional(),
                inherentLikelihood: z.string().optional(),
                inherentRiskLevel: z.string().optional(),
                residualImpact: z.string().optional(),
                residualLikelihood: z.string().optional(),
                residualRiskLevel: z.string().optional(),
            }))
            .mutation(async ({ input }: { input: any }) => {
                const db = await getDb();
                const { id, completedDate, ...data } = input;
                const [assessment] = await db.update(vendorAssessments).set({
                    ...data,
                    completedDate: completedDate ? new Date(completedDate) : undefined
                }).where(eq(vendorAssessments.id, id)).returning();
                return assessment;
            }),
    });
};

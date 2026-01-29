import { z } from "zod";
import * as db from "../../db";
import { eq, desc } from "drizzle-orm";
import { clients, readinessAssessments } from "../../schema";

export const createReadinessRouter = (t: any, clientProcedure: any) => {
    return t.router({
        // Initialize or Get the current assessment state
        getState: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const dbConn = await db.getDb();

                try {
                    const assessment = await dbConn.query.readinessAssessments.findFirst({
                        where: eq(readinessAssessments.clientId, input.clientId),
                        orderBy: [desc(readinessAssessments.updatedAt)]
                    });

                    if (assessment) {
                        return {
                            id: assessment.id,
                            clientId: assessment.clientId,
                            name: assessment.name,
                            status: assessment.status,
                            currentStep: assessment.currentStep,
                            scopeDetails: assessment.scopeDetails || {},
                            stakeholders: assessment.stakeholders || {},
                            existingPolicies: assessment.existingPolicies || {},
                            businessContext: assessment.businessContext || {},
                            maturityExpectations: assessment.maturityExpectations || {},
                            updatedAt: assessment.updatedAt,
                            createdAt: assessment.createdAt
                        };
                    }

                    // Prefill
                    const client = await dbConn.query.clients.findFirst({
                        where: eq(clients.id, input.clientId)
                    });

                    if (client) {
                        const address = client.headquarters || "";
                        return {
                            id: 0, // Virtual ID
                            clientId: input.clientId,
                            name: `ISO 27001 Readiness - ${client.name}`,
                            status: "draft",
                            currentStep: 1,
                            scopeDetails: {
                                orgBoundaries: client.name,
                                locations: address,
                                technologies: client.industry ? `Industry: ${client.industry}` : ""
                            },
                            stakeholders: {},
                            existingPolicies: {},
                            businessContext: {},
                            maturityExpectations: {},
                            updatedAt: new Date(),
                            createdAt: new Date()
                        };
                    }

                    return null;

                } catch (err) {
                    console.error("ORM Error in getState:", err);
                    throw new Error("Database query failed");
                }
            }),

        createOrUpdate: clientProcedure
            .input(z.object({
                clientId: z.number(),
                step: z.number().optional(),
                data: z.object({
                    scope: z.any().optional(),
                    stakeholders: z.any().optional(),
                    existingPolicies: z.any().optional(),
                    context: z.any().optional(),
                    expectations: z.any().optional(),
                }).optional()
            }))
            .mutation(async ({ input }: any) => {
                const dbConn = await db.getDb();

                const existing = await dbConn.query.readinessAssessments.findFirst({
                    where: eq(readinessAssessments.clientId, input.clientId),
                    orderBy: [desc(readinessAssessments.updatedAt)]
                });

                if (!existing) {
                    // INSERT
                    const name = `ISO 27001 Readiness - ${new Date().getFullYear()}`;
                    const currentStep = input.step || 1;

                    const [newRow] = await dbConn.insert(readinessAssessments).values({
                        clientId: input.clientId,
                        name,
                        currentStep,
                        scopeDetails: input.data?.scope || {},
                        stakeholders: input.data?.stakeholders || {},
                        existingPolicies: input.data?.existingPolicies || {},
                        businessContext: input.data?.context || {},
                        maturityExpectations: input.data?.expectations || {}
                    }).returning();

                    return newRow;
                } else {
                    // UPDATE
                    const [updatedRow] = await dbConn.update(readinessAssessments)
                        .set({
                            currentStep: input.step ?? existing.currentStep,
                            scopeDetails: input.data?.scope ?? existing.scopeDetails,
                            stakeholders: input.data?.stakeholders ?? existing.stakeholders,
                            existingPolicies: input.data?.existingPolicies ?? existing.existingPolicies,
                            businessContext: input.data?.context ?? existing.businessContext,
                            maturityExpectations: input.data?.expectations ?? existing.maturityExpectations,
                            updatedAt: new Date()
                        })
                        .where(eq(readinessAssessments.id, existing.id))
                        .returning();

                    return updatedRow;
                }
            }),
    });
};

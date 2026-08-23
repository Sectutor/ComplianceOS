import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { policyReviews, policyReviewResults } from "../../schema";
import { LLMService } from "../../lib/llm/service";

/**
 * Policy Review router.
 *
 * Backs components/PolicyReviewDialog.tsx: upload a policy document, pick
 * compliance requirements, run an AI gap analysis against them, then apply the
 * recommendations as a new draft policy via clientPolicies.create.
 *
 * The tables (policy_reviews / policy_review_results) and their enums already
 * existed in schema.ts and the database; only this router was missing, so the
 * dialog's buttons did nothing but error.
 */
export const createPolicyReviewRouter = (
    t: any,
    clientProcedure: any,
    protectedProcedure: any
) => {
    const llm = new LLMService();

    return t.router({
        /** Step 1: persist the uploaded policy + chosen requirements. */
        create: clientProcedure
            .input(
                z.object({
                    clientId: z.number(),
                    policyName: z.string().min(1),
                    policyContent: z.string().min(1),
                    selectedRequirements: z.array(z.string()).default([]),
                })
            )
            .mutation(async ({ input }: any) => {
                const db = await getDb();
                const policyReviewId = `PR-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 7)}`;

                const [review] = await db
                    .insert(policyReviews)
                    .values({
                        clientId: input.clientId,
                        policyReviewId,
                        policyName: input.policyName,
                        policyContent: input.policyContent,
                        selectedRequirements: input.selectedRequirements,
                        status: "analyzing",
                    } as any)
                    .returning();

                return review;
            }),

        /** Step 2: AI gap analysis of the stored policy against requirements. */
        analyze: protectedProcedure
            .input(z.object({ policyReviewId: z.string() }))
            .mutation(async ({ input }: any) => {
                const db = await getDb();

                const [review] = await db
                    .select()
                    .from(policyReviews)
                    .where(eq(policyReviews.policyReviewId, input.policyReviewId))
                    .limit(1);
                if (!review) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Policy review not found" });
                }

                const requirements = (review.selectedRequirements as string[]) || [];
                const systemPrompt =
                    "You are a senior compliance auditor. Analyze the given policy document " +
                    "against the listed compliance requirements. Respond ONLY with JSON matching: " +
                    '{"overallScore": number 0-100, "gaps": [{"requirement": string, ' +
                    '"issue": string, "severity": "high"|"medium"|"low"}], ' +
                    '"compliance": [{"requirement": string, "status": "compliant"|"partial"|"non-compliant", ' +
                    '"details": string}], "recommendations": [{"section": string, "current": string, ' +
                    '"improved": string}]}';

                const userPrompt =
                    `Policy name: ${review.policyName}\n\n` +
                    `Requirements to check: ${requirements.join(", ") || "general best practice"}\n\n` +
                    `Policy content:\n${review.policyContent.slice(0, 12000)}`;

                let parsed: any;
                try {
                    const response = await llm.generate(
                        {
                            systemPrompt,
                            userPrompt,
                            feature: "policy_review",
                            maxTokens: 4000,
                            temperature: 0.2,
                        },
                        { endpoint: "analyze_policy" }
                    );
                    const text = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
                    parsed = JSON.parse(text);
                } catch (err: any) {
                    // Mark failed but keep the row so the UI can show state
                    await db
                        .update(policyReviews)
                        .set({ status: "failed", updatedAt: new Date() } as any)
                        .where(eq(policyReviews.id, review.id));
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `Policy analysis failed: ${err.message}`,
                    });
                }

                const [result] = await db
                    .insert(policyReviewResults)
                    .values({
                        policyReviewId: review.id,
                        overallScore: Number(parsed.overallScore) || 0,
                        gaps: parsed.gaps || [],
                        compliance: parsed.compliance || [],
                        recommendations: parsed.recommendations || [],
                    } as any)
                    .returning();

                await db
                    .update(policyReviews)
                    .set({ status: "completed", updatedAt: new Date() } as any)
                    .where(eq(policyReviews.id, review.id));

                return {
                    overallScore: result.overallScore,
                    gaps: result.gaps,
                    compliance: result.compliance,
                    recommendations: result.recommendations,
                };
            }),

        /** Step 3: apply the improved sections as a new draft policy. */
        applyRecommendations: clientProcedure
            .input(
                z.object({
                    clientId: z.number(),
                    policyReviewId: z.string(),
                })
            )
            .mutation(async ({ input }: any) => {
                const db = await getDb();

                const [review] = await db
                    .select()
                    .from(policyReviews)
                    .where(eq(policyReviews.policyReviewId, input.policyReviewId))
                    .limit(1);
                if (!review) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Policy review not found" });
                }

                const [result] = await db
                    .select()
                    .from(policyReviewResults)
                    .where(eq(policyReviewResults.policyReviewId, review.id))
                    .limit(1);
                if (!result) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "No analysis results found" });
                }

                // Rebuild the policy from the recommendation improvements
                const recs = (result.recommendations as any[]) || [];
                let improved = review.policyContent as string;
                for (const rec of recs) {
                    if (rec.section && rec.improved && rec.current && improved.includes(rec.current)) {
                        improved = improved.replace(rec.current, rec.improved);
                    }
                }
                if (improved === review.policyContent && recs.length > 0) {
                    // No direct substitutions matched - append an improved section instead
                    improved += "\n\n" + recs.map((r) => `## ${r.section}\n\n${r.improved}`).join("\n\n");
                }

                await db
                    .update(policyReviews)
                    .set({ status: "applied", updatedAt: new Date() } as any)
                    .where(eq(policyReviews.id, review.id));

                return {
                    success: true,
                    // The dialog toasts result.policyName then invalidates
                    // clientPolicies.list; creating the actual draft is left to the
                    // caller (ClientPoliciesPage passes it straight into create).
                    policyName: `${review.policyName} (Reviewed)`,
                    improvedContent: improved,
                    overallScore: result.overallScore,
                };
            }),
    });
};

export default createPolicyReviewRouter;

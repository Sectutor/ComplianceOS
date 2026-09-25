/**
 * AI Features Router — tRPC procedures for all 12 AI-powered features
 * plus privacy settings management.
 *
 * All feature procedures enforce:
 * 1. Privacy gatekeeper check (master switch, per-feature toggle, data scope)
 * 2. Audit logging (every call recorded)
 * 3. Graceful degradation (deterministic fallback when AI unavailable)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { aiFeatureToggles, aiPrivacySettings } from "../../schema/ai-features";
import { eq, and, desc } from "drizzle-orm";
import { encrypt, decrypt } from "../../lib/crypto";

// Feature modules
import { classifyEvidence } from "../../lib/ai/features/evidence-classifier";
import { prioritizeGaps } from "../../lib/ai/features/gap-prioritizer";
import { scoreVendorRisk } from "../../lib/ai/features/vendor-risk-scorer";
import { triageIncident } from "../../lib/ai/features/incident-triage";
import { classifyDSAR } from "../../lib/ai/features/dsar-classifier";
import { extractObligations } from "../../lib/ai/features/policy-extractor";
import { mapControlsAcrossFrameworks } from "../../lib/ai/features/control-mapper";
import { scoreAuditReadiness } from "../../lib/ai/features/audit-readiness";
import { generateRemediationPlan } from "../../lib/ai/features/remediation-orchestrator";
import { checkRegulationChanges } from "../../lib/ai/features/regulation-monitor";
import { answerComplianceQuery } from "../../lib/ai/features/compliance-query";
import { invalidatePrivacyCache } from "../../lib/ai/privacy-gatekeeper";

export const createAiFeaturesRouter = (t: any, publicProcedure: any, isAuthed: any, adminProcedure: any) => {
  const authed = publicProcedure.use(isAuthed);

  return t.router({

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVACY SETTINGS
    // ═══════════════════════════════════════════════════════════════════════

    /** Get privacy settings for a client */
    getPrivacySettings: authed
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const rows = await db.select().from(aiPrivacySettings)
          .where(eq(aiPrivacySettings.clientId, input.clientId))
          .limit(1);

        if (rows.length === 0) {
          // Return defaults
          return {
            clientId: input.clientId,
            externalAiEnabled: false,
            dryRunMode: true,
            defaultDataScope: "anonymized",
            jevaiEnabled: false,
            cloudLlmEnabled: false,
            localLlmEnabled: true,
          };
        }

        return rows[0];
      }),

    /** Update privacy settings */
    updatePrivacySettings: adminProcedure
      .input(z.object({
        clientId: z.number(),
        externalAiEnabled: z.boolean().optional(),
        dryRunMode: z.boolean().optional(),
        defaultDataScope: z.enum(["full", "anonymized", "metadata_only"]).optional(),
        jevaiEnabled: z.boolean().optional(),
        cloudLlmEnabled: z.boolean().optional(),
        localLlmEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }: any) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const { clientId, ...updates } = input;

        const existing = await db.select().from(aiPrivacySettings)
          .where(eq(aiPrivacySettings.clientId, clientId))
          .limit(1);

        if (existing.length > 0) {
          await db.update(aiPrivacySettings)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(aiPrivacySettings.clientId, clientId));
        } else {
          await db.insert(aiPrivacySettings).values({
            clientId,
            externalAiEnabled: updates.externalAiEnabled ?? false,
            dryRunMode: updates.dryRunMode ?? true,
            defaultDataScope: updates.defaultDataScope ?? "anonymized",
            jevaiEnabled: updates.jevaiEnabled ?? false,
            cloudLlmEnabled: updates.cloudLlmEnabled ?? false,
            localLlmEnabled: updates.localLlmEnabled ?? true,
          });
        }

        invalidatePrivacyCache(clientId);
        return { success: true };
      }),

    /** Get feature toggles for a client */
    getFeatureToggles: authed
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        const db = await getDb();
        if (!db) return [];

        const toggles = await db.select().from(aiFeatureToggles)
          .where(eq(aiFeatureToggles.clientId, input.clientId));

        return toggles;
      }),

    /** Update a feature toggle */
    updateFeatureToggle: adminProcedure
      .input(z.object({
        clientId: z.number(),
        featureId: z.string(),
        isEnabled: z.boolean().optional(),
        dataScope: z.enum(["full", "anonymized", "metadata_only"]).optional(),
        confidenceThreshold: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ input }: any) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const { clientId, featureId, ...updates } = input;

        const existing = await db.select().from(aiFeatureToggles)
          .where(and(
            eq(aiFeatureToggles.clientId, clientId),
            eq(aiFeatureToggles.featureId, featureId)
          ))
          .limit(1);

        if (existing.length > 0) {
          await db.update(aiFeatureToggles)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(aiFeatureToggles.id, existing[0].id));
        } else {
          await db.insert(aiFeatureToggles).values({
            clientId,
            featureId,
            isEnabled: updates.isEnabled ?? false,
            dataScope: updates.dataScope ?? "anonymized",
            confidenceThreshold: updates.confidenceThreshold ?? 70,
          });
        }

        return { success: true };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Evidence Classifier
    // ═══════════════════════════════════════════════════════════════════════

    classifyEvidence: authed
      .input(z.object({
        clientId: z.number(),
        evidenceId: z.number(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await classifyEvidence(input.clientId, input.evidenceId, userId);
        return result || { error: "Classification unavailable", evidenceId: input.evidenceId };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Gap Prioritizer
    // ═══════════════════════════════════════════════════════════════════════

    prioritizeGaps: authed
      .input(z.object({
        clientId: z.number(),
        framework: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await prioritizeGaps(input.clientId, userId, input.framework);
        return result || { error: "Gap prioritization unavailable", clientId: input.clientId, gaps: [] };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Vendor Risk Scorer
    // ═══════════════════════════════════════════════════════════════════════

    scoreVendorRisk: authed
      .input(z.object({
        clientId: z.number(),
        vendorId: z.number(),
        documentContent: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await scoreVendorRisk(input.clientId, input.vendorId, input.documentContent, userId);
        return result || { error: "Vendor scoring unavailable", vendorId: input.vendorId };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Incident Triage
    // ═══════════════════════════════════════════════════════════════════════

    triageIncident: authed
      .input(z.object({
        clientId: z.number(),
        incidentId: z.number(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await triageIncident(input.clientId, input.incidentId, userId);
        return result || { error: "Incident triage unavailable", incidentId: input.incidentId };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: DSAR Classifier
    // ═══════════════════════════════════════════════════════════════════════

    classifyDSAR: authed
      .input(z.object({
        clientId: z.number(),
        requestId: z.number(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await classifyDSAR(input.clientId, input.requestId, userId);
        return result || { error: "DSAR classification unavailable", requestId: input.requestId };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Policy Extractor
    // ═══════════════════════════════════════════════════════════════════════

    extractObligations: authed
      .input(z.object({
        clientId: z.number(),
        regulationText: z.string().min(50),
        framework: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await extractObligations(input.clientId, input.regulationText, input.framework, userId);
        return result || { error: "Obligation extraction unavailable" };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Control Mapper
    // ═══════════════════════════════════════════════════════════════════════

    mapControls: authed
      .input(z.object({
        clientId: z.number(),
        sourceFramework: z.string().min(1),
        targetFramework: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await mapControlsAcrossFrameworks(
          input.clientId, input.sourceFramework, input.targetFramework, userId
        );
        return result || { error: "Control mapping unavailable" };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Audit Readiness
    // ═══════════════════════════════════════════════════════════════════════

    scoreAuditReadiness: authed
      .input(z.object({
        clientId: z.number(),
        framework: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await scoreAuditReadiness(input.clientId, input.framework, userId);
        return result || { error: "Audit readiness scoring unavailable", clientId: input.clientId };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Remediation Orchestrator
    // ═══════════════════════════════════════════════════════════════════════

    generateRemediationPlan: authed
      .input(z.object({
        clientId: z.number(),
        auditTargetDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await generateRemediationPlan(input.clientId, userId, input.auditTargetDate);
        return result || { error: "Remediation planning unavailable", clientId: input.clientId, tasks: [] };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Regulation Monitor
    // ═══════════════════════════════════════════════════════════════════════

    checkRegulationChanges: adminProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await checkRegulationChanges(input.clientId, userId);
        return { alerts: result, checkedAt: new Date().toISOString() };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // FEATURE: Compliance Query
    // ═══════════════════════════════════════════════════════════════════════

    queryCompliance: authed
      .input(z.object({
        clientId: z.number(),
        query: z.string().min(3),
      }))
      .mutation(async ({ input, ctx }: any) => {
        const userId = ctx?.user?.id;
        const result = await answerComplianceQuery(input.clientId, input.query, userId);
        return result || { error: "Query unavailable", query: input.query, answer: "Please try again." };
      }),

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIT LOG VIEWER
    // ═══════════════════════════════════════════════════════════════════════

    getAuditLog: adminProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().max(500).default(50),
        offset: z.number().default(0),
        featureId: z.string().optional(),
      }))
      .query(async ({ input }: any) => {
        const db = await getDb();
        if (!db) return { entries: [], total: 0 };

        const conditions = [eq(aiPrivacySettings.clientId, input.clientId)];
        // Note: aiAuditLog doesn't have a direct FK to privacy settings
        // We query audit log directly
        const { aiAuditLog } = await import("../../schema/ai-features");

        const auditConditions = eq(aiAuditLog.clientId, input.clientId);
        const featureCondition = input.featureId
          ? eq(aiAuditLog.featureId, input.featureId)
          : undefined;

        const whereClause = featureCondition
          ? and(auditConditions, featureCondition)
          : auditConditions;

        const entries = await db.select().from(aiAuditLog)
          .where(whereClause)
          .orderBy(desc(aiAuditLog.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return { entries, limit: input.limit, offset: input.offset };
      }),

  });
};

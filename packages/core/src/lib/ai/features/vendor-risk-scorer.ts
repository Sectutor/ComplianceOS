/**
 * Vendor Risk Scorer — Auto-score vendor security posture from documents.
 *
 * Ingests vendor security documents (SOC 2 reports, security questionnaires,
 * trust center summaries) and produces:
 * - Risk tier (Critical/High/Medium/Low)
 * - Control exceptions/gaps
 * - Recommended review frequency
 * - Approval recommendation
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { vendors } from "../../../schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorRiskResult {
  vendorId: number;
  vendorName: string;
  riskTier: "critical" | "high" | "medium" | "low";
  riskScore: number; // 0-100
  confidence: number;
  keyFindings: Array<{
    category: string;
    finding: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
  }>;
  controlExceptions: Array<{
    control: string;
    exception: string;
    impact: string;
  }>;
  recommendedReviewFrequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  recommendation: "approve" | "approve_with_conditions" | "reject" | "further_review";
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scoring function
// ─────────────────────────────────────────────────────────────────────────────

export async function scoreVendorRisk(
  clientId: number,
  vendorId: number,
  documentContent?: string,
  userId?: number
): Promise<VendorRiskResult | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load vendor record
  const vendorRows = await db.select().from(vendors).where(and(eq(vendors.id, vendorId), eq(vendors.clientId, clientId))).limit(1);
  if (vendorRows.length === 0) return null;
  const vendor = vendorRows[0];

  // 2. Build scoring input
  const data = {
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorCriticality: vendor.criticality,
    vendorServices: vendor.services || "Not specified",
    vendorDataAccess: vendor.dataAccess || "unknown",
    documentContent: documentContent || vendor.securityNotes || "No document provided for analysis",
  };

  // 3. Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "vendor_risk_scorer",
      userId,
      entityType: "vendor",
      entityId: vendorId,
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Classify: what risk tier?
      const tierClassification = await provider.classify(
        `Vendor: ${sanitizedData.vendorName}\nCriticality: ${sanitizedData.vendorCriticality}\nServices: ${sanitizedData.vendorServices}\nData Access: ${sanitizedData.vendorDataAccess}\nSecurity Notes: ${sanitizedData.documentContent?.slice(0, 2000)}`,
        ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"],
        "Classify the vendor's security risk tier based on their criticality, data access, and security posture."
      );

      // Scorer: detailed risk scoring
      const riskScoring = await provider.score(
        `Vendor assessment: ${sanitizedData.vendorName} (Criticality: ${sanitizedData.vendorCriticality})`,
        [
          { id: "certifications", description: "Does the vendor hold current SOC 2, ISO 27001, or equivalent certifications?", weight: 0.2 },
          { id: "data_protection", description: "How well does the vendor protect customer data (encryption, access controls)?", weight: 0.25 },
          { id: "incident_history", description: "Does the vendor have any known security incidents or breaches?", weight: 0.15 },
          { id: "compliance_posture", description: "How mature is the vendor's compliance program?", weight: 0.2 },
          { id: "contractual_protections", description: "Are DPAs, SLAs, and liability clauses in place?", weight: 0.2 },
        ],
        { min: 0, max: 100, labels: ["Critical", "High", "Medium", "Low"] }
      );

      // Extractor: pull out specific findings
      const extraction = await provider.extract(
        `Vendor security assessment for ${sanitizedData.vendorName}: ${sanitizedData.documentContent?.slice(0, 3000)}`,
        {
          certifications: { type: "string[]", description: "List of certifications held", required: false },
          exceptions: { type: "string[]", description: "Control exceptions or gaps noted", required: false },
          lastAuditDate: { type: "string", description: "Date of last audit report", required: false },
          encryptionStandard: { type: "string", description: "Encryption standard used", required: false },
          dataResidency: { type: "string", description: "Where is data stored", required: false },
          breachHistory: { type: "string[]", description: "Any breach history mentioned", required: false },
        }
      );

      return { tierClassification, riskScoring, extraction };
    }
  );

  if (!result.sent && !result.dryRun) return null;
  if (result.dryRun || !result.response) {
    return {
      vendorId,
      vendorName: vendor.name || "Unknown",
      riskTier: (vendor.criticality?.toLowerCase() as any) || "medium",
      riskScore: 50,
      confidence: 0,
      keyFindings: [],
      controlExceptions: [],
      recommendedReviewFrequency: "annual",
      recommendation: "further_review",
      reasoning: result.dryRun ? "Dry-run mode" : "No AI response",
    };
  }

  // 4. Build result
  const { tierClassification, riskScoring, extraction } = result.response;
  const riskScore = 100 - riskScoring.score; // Invert: higher score = lower risk in scorer, but we want higher = more risk

  const tierMap: Record<string, "critical" | "high" | "medium" | "low"> = {
    "Critical Risk": "critical",
    "High Risk": "high",
    "Medium Risk": "medium",
    "Low Risk": "low",
  };

  const keyFindings: VendorRiskResult["keyFindings"] = [];
  if (extraction.extracted.certifications) {
    keyFindings.push({ category: "Certifications", finding: `Holds: ${extraction.extracted.certifications.join(", ")}`, severity: "info" });
  }
  if (extraction.extracted.breachHistory?.length) {
    keyFindings.push({ category: "Incidents", finding: extraction.extracted.breachHistory.join("; "), severity: "high" });
  }
  if (extraction.extracted.exceptions?.length) {
    keyFindings.push({ category: "Gaps", finding: extraction.extracted.exceptions.join("; "), severity: "medium" });
  }

  const reviewFreqMap: Record<string, VendorRiskResult["recommendedReviewFrequency"]> = {
    "critical": "monthly",
    "high": "quarterly",
    "medium": "semi-annual",
    "low": "annual",
  };

  return {
    vendorId,
    vendorName: vendor.name || "Unknown",
    riskTier: tierMap[tierClassification.label] || "medium",
    riskScore: Math.min(100, Math.max(0, riskScore)),
    confidence: tierClassification.confidence,
    keyFindings,
    controlExceptions: (extraction.extracted.exceptions || []).map((e: string) => ({
      control: "General",
      exception: e,
      impact: "Review required",
    })),
    recommendedReviewFrequency: reviewFreqMap[tierMap[tierClassification.label]] || "annual",
    recommendation: riskScore >= 75 ? "reject" : riskScore >= 50 ? "approve_with_conditions" : riskScore >= 25 ? "approve" : "approve",
    reasoning: riskScoring.reasoning || tierClassification.reasoning || "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch score all vendors for a client
// ─────────────────────────────────────────────────────────────────────────────

export async function batchScoreVendors(clientId: number, userId?: number): Promise<VendorRiskResult[]> {
  const db = await getDb();
  if (!db) return [];

  const vendorRows = await db.select().from(vendors).where(eq(vendors.clientId, clientId));
  const results: VendorRiskResult[] = [];

  for (const vendor of vendorRows) {
    try {
      const result = await scoreVendorRisk(clientId, vendor.id, undefined, userId);
      if (result) results.push(result);
    } catch (err: any) {
      console.error(`[VendorRiskScorer] Failed for vendor ${vendor.id}:`, err.message);
    }
  }

  // Sort by risk score descending (most risky first)
  results.sort((a, b) => b.riskScore - a.riskScore);
  return results;
}

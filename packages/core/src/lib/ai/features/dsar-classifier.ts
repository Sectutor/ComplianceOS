/**
 * DSAR Classifier — Auto-classify and route Data Subject Access Requests.
 *
 * When a DSAR is received, this module:
 * 1. Classifies the request type (access, deletion, portability, rectification)
 * 2. Identifies relevant processing activities from ROPA
 * 3. Estimates complexity and SLA risk
 * 4. Routes to the appropriate fulfillment workflow
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { dsarRequests, processingActivities } from "../../../schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DSARClassification {
  requestId: number;
  requestType: "access" | "deletion" | "portability" | "rectification" | "restriction" | "objection";
  confidence: number;
  complexity: "simple" | "moderate" | "complex";
  slaDays: number;
  slaRisk: "on_track" | "at_risk" | "breached";
  relevantProcessingActivities: Array<{
    id: number;
    name: string;
    dataCategories: string[];
    retentionPeriod: string;
  }>;
  dataSources: string[];
  responseTemplate: string;
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DSAR SLA rules by regulation (hardcoded — these are legal deadlines)
// ─────────────────────────────────────────────────────────────────────────────

const DSAR_SLAS: Record<string, number> = {
  GDPR: 30, // 30 days, extendable to 60
  UK_GDPR: 30,
  CCPA: 45,
  LGPD: 15,
  POPIA: 30,
  PIPEDA: 30,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main classification function
// ─────────────────────────────────────────────────────────────────────────────

export async function classifyDSAR(
  clientId: number,
  requestId: number,
  userId?: number
): Promise<DSARClassification | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load the DSAR
  const dsarRows = await db.select().from(dsarRequests).where(and(eq(dsarRequests.id, requestId), eq(dsarRequests.clientId, clientId))).limit(1);
  if (dsarRows.length === 0) return null;
  const dsar = dsarRows[0];

  // 2. Load processing activities (ROPA)
  const activities = await db.select().from(processingActivities).where(eq(processingActivities.clientId, clientId));

  // 3. Build classification input
  const activityList = activities
    .map((a, i) => `${i + 1}. ${a.name || "Unnamed"} — Data: ${a.dataCategories || "various"}, Retention: ${a.retentionPeriod || "unspecified"}`)
    .join("\n");

  const data = {
    requestId: dsar.requestId,
    requestContent: dsar.subjectName || dsar.subjectEmail || "No description",
    requestType: dsar.requestType,
    regulation: "GDPR",
    status: dsar.status,
    priority: dsar.priority,
    dateReceived: dsar.requestDate || dsar.createdAt,
    dueDate: dsar.dueDate,
    processingActivities: activityList || "No processing activities on record",
  };

  // 4. Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "dsar_classifier",
      userId,
      entityType: "dsar",
      entityId: requestId,
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Classify: DSAR type
      const typeClassification = await provider.classify(
        `Data Subject Request: ${sanitizedData.requestContent}\nReceived under: ${sanitizedData.regulation}`,
        ["Access Request", "Deletion Request", "Data Portability", "Rectification", "Processing Restriction", "Objection to Processing"],
        "Classify the data subject access request into the correct GDPR Article category."
      );

      // Router: fulfillment complexity
      const complexityRouting = await provider.route(
        `DSAR type: ${sanitizedData.requestType || typeClassification.label}\nProcessing activities count: ${sanitizedData.processingActivities?.split("\n").length || 0}`,
        [
          { id: "simple", description: "Single system, single data subject, straightforward retrieval" },
          { id: "moderate", description: "Multiple systems or data categories involved" },
          { id: "complex", description: "Many systems, third-party data, legal holds, or conflicting obligations" },
        ],
        "Route based on how complex the DSAR fulfillment will be."
      );

      // Scorer: SLA risk assessment
      const daysSinceReceived = sanitizedData.dateReceived
        ? Math.floor((Date.now() - new Date(sanitizedData.dateReceived).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const slaDays = DSAR_SLAS[sanitizedData.regulation] || 30;
      const slaProgress = (daysSinceReceived / slaDays) * 100;

      const slaScoring = await provider.score(
        `DSAR received ${daysSinceReceived} days ago. SLA is ${slaDays} days. Complexity: ${complexityRouting.path}.`,
        [
          { id: "time_remaining", description: "How much time is left before SLA breach?", weight: 0.4 },
          { id: "complexity_impact", description: "How does complexity affect completion time?", weight: 0.3 },
          { id: "data_volume", description: "How much data needs to be collected?", weight: 0.3 },
        ],
        { min: 0, max: 100, labels: ["On Track", "At Risk", "Breached"] }
      );

      return { typeClassification, complexityRouting, slaScoring, daysSinceReceived, slaDays };
    }
  );

  // 5. Map results
  const typeMap: Record<string, DSARClassification["requestType"]> = {
    "Access Request": "access",
    "Deletion Request": "deletion",
    "Data Portability": "portability",
    "Rectification": "rectification",
    "Processing Restriction": "restriction",
    "Objection to Processing": "objection",
  };

  const complexityMap: Record<string, DSARClassification["complexity"]> = {
    simple: "simple",
    moderate: "moderate",
    complex: "complex",
  };

  const slaDays = DSAR_SLAS["GDPR"] || 30;
  const daysSinceReceived = dsar.requestDate
    ? Math.floor((Date.now() - new Date(dsar.requestDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const daysRemaining = slaDays - daysSinceReceived;

  const relevantActivities = activities.slice(0, 5).map((a) => ({
    id: a.id,
    name: a.name || "Unnamed",
    dataCategories: a.dataCategories ? (Array.isArray(a.dataCategories) ? a.dataCategories : [a.dataCategories]) : [],
    retentionPeriod: a.retentionPeriod || "unspecified",
  }));

  return {
    requestId,
    requestType: typeMap[result.response?.typeClassification?.label || ""] || (dsar.requestType as any) || "access",
    confidence: result.response?.typeClassification?.confidence || 0,
    complexity: complexityMap[result.response?.complexityRouting?.path || "moderate"] || "moderate",
    slaDays: slaDays,
    slaRisk: daysRemaining <= 0 ? "breached" : daysRemaining <= 5 ? "at_risk" : "on_track",
    relevantProcessingActivities: relevantActivities,
    dataSources: [...new Set(activities.map((a) => a.name).filter(Boolean))],
    responseTemplate: generateResponseTemplate(typeMap[result.response?.typeClassification?.label || ""] || "access", "GDPR"),
    reasoning: result.response?.complexityRouting?.reasoning || result.error || (result.dryRun ? "Dry-run mode" : ""),
  };
}

function generateResponseTemplate(requestType: string, regulation: string): string {
  const templates: Record<string, string> = {
    access: `Dear Data Subject,\n\nThank you for your ${regulation} Subject Access Request received on [DATE].\n\nWe are processing your request and will provide the requested information within the statutory timeframe.\n\nData Protection Officer\n[ORGANIZATION]`,
    deletion: `Dear Data Subject,\n\nWe acknowledge your request for data erasure under ${regulation} Art. 17.\n\nWe will process your request within [DAYS] days, subject to any legal retention obligations.\n\nData Protection Officer\n[ORGANIZATION]`,
    portability: `Dear Data Subject,\n\nYour data portability request under ${regulation} Art. 20 is being processed.\n\nWe will provide your data in a structured, commonly used, machine-readable format within [DAYS] days.\n\nData Protection Officer\n[ORGANIZATION]`,
  };
  return templates[requestType] || templates.access;
}

/**
 * Natural Language Compliance Query — Ask questions over your compliance data.
 *
 * Enables users to ask questions like:
 * - "Which SOC 2 controls are missing evidence?"
 * - "What's our top vendor risk?"
 * - "How many gaps do we have in ISO 27001?"
 * - "Show me incidents from last month that need regulatory notification"
 *
 * Routes the query to the right data source and returns structured answers.
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { clientControls, controls, evidence, vendors, incidents, clientPolicies } from "../../../schema";
import { eq, and, desc, gte } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ComplianceQueryAnswer {
  query: string;
  answer: string;
  dataType: "controls" | "evidence" | "vendors" | "incidents" | "policies" | "gaps" | "general";
  confidence: number;
  data: any;
  sourceDescription: string;
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query routing
// ─────────────────────────────────────────────────────────────────────────────

type QueryType = "controls" | "evidence" | "vendors" | "incidents" | "policies" | "gaps" | "general";

const QUERY_KEYWORDS: Record<QueryType, string[]> = {
  controls: ["control", "cc6", "a.9", "ac-1", "implement", "status"],
  evidence: ["evidence", "proof", "screenshot", "upload", "document"],
  vendors: ["vendor", "third party", "supplier", "tprm", "risk score"],
  incidents: ["incident", "breach", "attack", "ransomware", "notification"],
  policies: ["policy", "policies", "document", "approve", "draft"],
  gaps: ["gap", "missing", "incomplete", "not implemented", "not assessed"],
  general: ["readiness", "score", "status", "overall", "summary"],
};

function classifyQueryType(query: string): QueryType {
  const lower = query.toLowerCase();
  let bestMatch: QueryType = "general";
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(QUERY_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = type as QueryType;
    }
  }

  return bestMatch;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main query function
// ─────────────────────────────────────────────────────────────────────────────

export async function answerComplianceQuery(
  clientId: number,
  query: string,
  userId?: number
): Promise<ComplianceQueryAnswer | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Classify the query type
  const queryType = classifyQueryType(query);

  // 2. Fetch relevant data
  const data = await fetchDataForQuery(db, clientId, queryType, query);
  if (!data) {
    return {
      query,
      answer: "I couldn't find relevant data for your question. Try rephrasing or check that the data exists.",
      dataType: queryType,
      confidence: 0,
      data: null,
      sourceDescription: "No data found",
      reasoning: "Query classified as: " + queryType,
    };
  }

  // 3. Send through privacy gatekeeper with data
  const result = await withExternalAi(
    {
      clientId,
      featureId: "compliance_query",
      userId,
      entityType: "compliance_query",
      data: { query, queryType, complianceData: data },
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Use router to determine the answer approach
      const routing = await provider.route(
        `Query: ${sanitizedData.query}\nAvailable data type: ${sanitizedData.queryType}`,
        [
          { id: "direct_answer", description: "Answer directly from the available data" },
          { id: "trend_analysis", description: "Analyze trends over time" },
          { id: "comparison", description: "Compare across frameworks or time periods" },
          { id: "action_items", description: "Provide actionable next steps" },
        ],
        "Choose the best way to answer this compliance question."
      );

      // Use extractor to pull specific data points
      const extraction = await provider.extract(
        `Compliance data:\n${JSON.stringify(sanitizedData.complianceData).slice(0, 4000)}\n\nQuery: ${sanitizedData.query}`,
        {
          answer: { type: "string", description: "Direct answer to the user's question", required: true },
          keyMetrics: { type: "object", description: "Key metrics relevant to the query", required: false },
          recommendations: { type: "string[]", description: "Actionable recommendations", required: false },
        }
      );

      return { routing, extraction };
    }
  );

  // 4. Build answer
  if (result.dryRun || !result.response) {
    // Even in dry-run, we can provide a basic answer from the data
    return buildDeterministicAnswer(query, queryType, data, result.dryRun);
  }

  const { extraction } = result.response;
  return {
    query,
    answer: extraction.extracted.answer || buildDeterministicAnswer(query, queryType, data).answer,
    dataType: queryType,
    confidence: result.confidenceScore || extraction.confidence || 50,
    data: extraction.extracted.keyMetrics || data,
    sourceDescription: `Data from ${queryType} module`,
    reasoning: result.response.routing.reasoning || "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetchers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchDataForQuery(db: any, clientId: number, queryType: string, query: string): Promise<any> {
  switch (queryType) {
    case "controls":
      return db.select({
        controlId: controls.controlId,
        name: controls.name,
        framework: controls.framework,
        status: clientControls.status,
      })
        .from(clientControls)
        .innerJoin(controls, eq(controls.id, clientControls.controlId))
        .where(eq(clientControls.clientId, clientId))
        .limit(100);

    case "evidence":
      return db.select({
        id: evidence.id,
        title: evidence.title,
        clientControlId: evidence.clientControlId,
        framework: evidence.framework,
        status: evidence.status,
        createdAt: evidence.createdAt,
      })
        .from(evidence)
        .where(eq(evidence.clientId, clientId))
        .orderBy(desc(evidence.createdAt))
        .limit(50);

    case "vendors":
      return db.select({
        id: vendors.id,
        name: vendors.name,
        criticality: vendors.criticality,
        status: vendors.status,
      })
        .from(vendors)
        .where(eq(vendors.clientId, clientId))
        .limit(50);

    case "incidents":
      return db.select()
        .from(incidents)
        .where(eq(incidents.clientId, clientId))
        .orderBy(desc(incidents.createdAt))
        .limit(20);

    case "policies":
      return db.select({
        id: clientPolicies.id,
        name: clientPolicies.name,
        status: clientPolicies.status,
        framework: clientPolicies.framework,
      })
        .from(clientPolicies)
        .where(eq(clientPolicies.clientId, clientId))
        .limit(50);

    case "gaps":
      return db.select({
        controlId: controls.controlId,
        name: controls.name,
        framework: controls.framework,
        status: clientControls.status,
      })
        .from(clientControls)
        .innerJoin(controls, eq(controls.id, clientControls.controlId))
        .where(and(
          eq(clientControls.clientId, clientId),
          ne(clientControls.status, "implemented")
        ))
        .limit(100);

    case "general":
    default:
      // Fetch summary stats
      const [ctrlCount, evCount, vendCount, polCount, gapCount] = await Promise.all([
        db.select().from(clientControls).where(eq(clientControls.clientId, clientId)),
        db.select().from(evidence).where(eq(evidence.clientId, clientId)),
        db.select().from(vendors).where(eq(vendors.clientId, clientId)),
        db.select().from(clientPolicies).where(eq(clientPolicies.clientId, clientId)),
        db.select().from(clientControls).where(and(eq(clientControls.clientId, clientId), ne(clientControls.status, "implemented"))),
      ]);
      return {
        totalControls: ctrlCount.length,
        totalEvidence: evCount.length,
        totalVendors: vendCount.length,
        totalPolicies: polCount.length,
        totalGaps: gapCount.length,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic answer (fallback when AI not available)
// ─────────────────────────────────────────────────────────────────────────────

function buildDeterministicAnswer(query: string, queryType: string, data: any, dryRun?: boolean): ComplianceQueryAnswer {
  let answer = "";
  const prefix = dryRun ? "[Dry-run mode — enable external AI for enhanced answers] " : "";

  switch (queryType) {
    case "controls": {
      const total = Array.isArray(data) ? data.length : 0;
      const implemented = Array.isArray(data) ? data.filter((c: any) => c.status === "implemented").length : 0;
      answer = `${prefix}You have ${total} controls tracked, of which ${implemented} are fully implemented (${total > 0 ? Math.round((implemented / total) * 100) : 0}%).`;
      break;
    }
    case "evidence": {
      const total = Array.isArray(data) ? data.length : 0;
      answer = `${prefix}You have ${total} evidence records on file.`;
      break;
    }
    case "gaps": {
      const gaps = Array.isArray(data) ? data.length : 0;
      answer = `${prefix}You have ${gaps} controls that are not yet implemented and may need attention.`;
      break;
    }
    case "vendors": {
      const total = Array.isArray(data) ? data.length : 0;
      const highRisk = Array.isArray(data) ? data.filter((v: any) => v.criticality === "High" || v.criticality === "Critical").length : 0;
      answer = `${prefix}You have ${total} vendors tracked, with ${highRisk} classified as high/critical risk.`;
      break;
    }
    case "policies": {
      const total = Array.isArray(data) ? data.length : 0;
      const approved = Array.isArray(data) ? data.filter((p: any) => p.status === "approved").length : 0;
      answer = `${prefix}You have ${total} policies, of which ${approved} are approved.`;
      break;
    }
    case "incidents": {
      const total = Array.isArray(data) ? data.length : 0;
      answer = `${prefix}You have ${total} incidents on record.`;
      break;
    }
    case "general":
    default:
      answer = `${prefix}Your compliance program overview: ${JSON.stringify(data)}`;
      break;
  }

  return {
    query,
    answer,
    dataType: queryType as any,
    confidence: dryRun ? 0 : 30,
    data,
    sourceDescription: dryRun ? "Deterministic (dry-run)" : "Deterministic (no AI)",
    reasoning: "Answer derived directly from database without AI enhancement.",
  };
}

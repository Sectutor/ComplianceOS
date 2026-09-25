/**
 * Policy Obligation Extractor — Extract obligations from regulation text.
 *
 * When regulation text is uploaded or a new framework is added, this module:
 * 1. Extracts specific obligations/requirements from the text
 * 2. Maps obligations to control categories
 * 3. Suggests policy clauses to address each obligation
 * 4. Scores coverage against existing policies
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { clientPolicies, controls } from "../../../schema";
import { eq } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ObligationExtraction {
  sourceText: string;
  framework: string;
  obligations: Array<{
    id: string;
    text: string;
    category: string;
    priority: "mandatory" | "recommended" | "optional";
    mappedControls: Array<{
      controlId: string;
      controlName: string;
    }>;
    suggestedPolicyClause: string;
    existingCoverage: "covered" | "partial" | "missing";
  }>;
  coverageScore: number; // 0-100
  gapsCount: number;
  coveredCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extraction function
// ─────────────────────────────────────────────────────────────────────────────

export async function extractObligations(
  clientId: number,
  regulationText: string,
  framework: string,
  userId?: number
): Promise<ObligationExtraction | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load existing policies and controls for coverage comparison
  const policies = await db.select().from(clientPolicies).where(eq(clientPolicies.clientId, clientId));
  const controlRows = await db.select().from(controls).where(eq(controls.framework, framework));

  // 2. Build extraction input
  const data = {
    regulationText: regulationText.slice(0, 8000), // Cap input size
    framework,
    existingPolicies: policies.map((p) => `${p.name} [${p.status}]`).join(", ") || "None",
    existingControls: controlRows.map((c) => `${c.controlId}: ${c.name}`).slice(0, 50).join(", ") || "None",
  };

  // 3. Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "policy_extractor",
      userId,
      entityType: "policy",
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Extractor: pull obligations from regulation text
      const extraction = await provider.extract(
        `Regulation text from ${sanitizedData.framework}:\n\n${sanitizedData.regulationText}`,
        {
          obligations: { type: "array", description: "List of specific obligations or requirements from the text", required: true },
          categories: { type: "array", description: "Categories or domains these obligations fall under", required: false },
          deadlines: { type: "array", description: "Any deadlines or timeframes mentioned", required: false },
          penalties: { type: "array", description: "Any penalties or consequences mentioned for non-compliance", required: false },
        }
      );

      // Scorer: coverage against existing policies
      const coverageScoring = await provider.score(
        `Framework: ${sanitizedData.framework}\nExisting policies: ${sanitizedData.existingPolicies}\nObligations found: ${extraction.extracted.obligations?.length || 0}`,
        [
          { id: "policy_coverage", description: "How many obligations are covered by existing policies?", weight: 0.4 },
          { id: "control_coverage", description: "How many obligations have corresponding controls?", weight: 0.3 },
          { id: "implementation_coverage", description: "How many controls are implemented?", weight: 0.3 },
        ],
        { min: 0, max: 100, labels: ["Poor", "Partial", "Good", "Complete"] }
      );

      return { extraction, coverageScoring };
    }
  );

  // 4. Build obligations list with coverage mapping
  const obligations: ObligationExtraction["obligations"] = [];
  if (!result.dryRun && result.response) {
    const extractedObligations = result.response.extraction.extracted.obligations || [];
    for (let i = 0; i < extractedObligations.length; i++) {
      const oblText = typeof extractedObligations[i] === "string" ? extractedObligations[i] : JSON.stringify(extractedObligations[i]);

      // Map to nearest controls
      const mappedControls = findRelatedControls(oblText, controlRows);

      // Check existing coverage
      const existingCoverage = checkExistingCoverage(oblText, policies);

      obligations.push({
        id: `OBL-${i + 1}`,
        text: oblText,
        category: result.response.extraction.extracted.categories?.[i] || "General",
        priority: i < 3 ? "mandatory" : i < 6 ? "recommended" : "optional",
        mappedControls,
        suggestedPolicyClause: `The organization shall ${oblText.toLowerCase()}.`,
        existingCoverage,
      });
    }
  }

  const coveredCount = obligations.filter((o) => o.existingCoverage === "covered").length;
  const gapsCount = obligations.filter((o) => o.existingCoverage === "missing").length;

  return {
    sourceText: regulationText.slice(0, 100) + "...",
    framework,
    obligations,
    coverageScore: result.response?.coverageScoring?.score || 0,
    gapsCount,
    coveredCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function findRelatedControls(obligationText: string, controls: any[]): Array<{ controlId: string; controlName: string }> {
  const lower = obligationText.toLowerCase();
  const matched: Array<{ controlId: string; controlName: string }> = [];

  for (const ctrl of controls) {
    if (!ctrl.name) continue;
    const ctrlLower = ctrl.name.toLowerCase();
    // Simple keyword overlap check
    const words = ctrlLower.split(/\s+/).filter((w: string) => w.length > 3);
    const overlap = words.filter((w: string) => lower.includes(w)).length;
    if (overlap >= 2 || lower.includes(ctrlLower)) {
      matched.push({ controlId: ctrl.controlId, controlName: ctrl.name });
    }
    if (matched.length >= 3) break;
  }

  return matched;
}

function checkExistingCoverage(obligationText: string, policies: any[]): "covered" | "partial" | "missing" {
  const lower = obligationText.toLowerCase();
  const keywords = lower.split(/\s+/).filter((w) => w.length > 5).slice(0, 5);

  for (const policy of policies) {
    if (!policy.name) continue;
    const policyLower = policy.name.toLowerCase();
    const matchCount = keywords.filter((k: string) => policyLower.includes(k)).length;
    if (matchCount >= 3) return "covered";
    if (matchCount >= 1) return "partial";
  }

  return "missing";
}

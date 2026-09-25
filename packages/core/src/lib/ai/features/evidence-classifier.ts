/**
 * Evidence Classifier — Auto-classify uploaded evidence to controls + frameworks.
 *
 * When a user uploads evidence, this module:
 * 1. Extracts the evidence content/metadata
 * 2. Asks JevAI to classify which control(s) and framework(s) it maps to
 * 3. Returns a confidence score per mapping
 * 4. High-confidence mappings can be auto-approved
 */

import { withExternalAi, type ExternalAiCallResult } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { controls, evidence, clientControls } from "../../../schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvidenceClassification {
  evidenceId: number;
  controlMappings: Array<{
    controlId: string;
    controlName: string;
    framework: string;
    confidence: number;
    autoApproved: boolean;
  }>;
  sufficiencyScore: number; // 0-100 — how sufficient is this evidence for its primary control
  freshnessStatus: "fresh" | "aging" | "stale";
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main classify function
// ─────────────────────────────────────────────────────────────────────────────

export async function classifyEvidence(
  clientId: number,
  evidenceId: number,
  userId?: number
): Promise<EvidenceClassification | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load the evidence record
  const evRows = await db.select().from(evidence).where(and(eq(evidence.id, evidenceId), eq(evidence.clientId, clientId))).limit(1);
  if (evRows.length === 0) return null;
  const ev = evRows[0];

  // 2. Load available controls for this client
  const clientCtrlRows = await db.select({
    controlId: controls.controlId,
    name: controls.name,
    framework: controls.framework,
    status: clientControls.status,
  })
    .from(clientControls)
    .innerJoin(controls, eq(controls.id, clientControls.controlId))
    .where(eq(clientControls.clientId, clientId));

  if (clientCtrlRows.length === 0) return null;

  const controlLabels = clientCtrlRows.map((c) => `${c.controlId}: ${c.name} [${c.framework}]`);

  // 3. Build the classification input
  const evidenceDescription = ev.description || ev.title || `Evidence #${ev.id}`;
  const controlList = controlLabels.join("\n");

  const data = {
    evidenceId: ev.id,
    evidenceTitle: ev.title,
    evidenceType: ev.evidenceType,
    evidenceDescription: ev.description,
    controlList,
    frameworks: [...new Set(clientCtrlRows.map((c) => c.framework))],
  };

  // 4. Send through privacy gatekeeper + JevAI
  const result = await withExternalAi(
    {
      clientId,
      featureId: "evidence_classifier",
      userId,
      entityType: "evidence",
      entityId: evidenceId,
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Classify: which control does this evidence map to?
      const classification = await provider.classify(
        `Evidence: ${sanitizedData.evidenceTitle || "Untitled"}\nType: ${sanitizedData.evidenceType || "unknown"}\nDescription: ${sanitizedData.evidenceDescription || "No description"}`,
        sanitizedData.controlList?.split("\n") || [],
        `This is compliance evidence being matched to security controls. The control list format is "CODE: Name [Framework]".`
      );

      // Score: how sufficient is this evidence?
      const scoring = await provider.score(
        `Evidence type: ${sanitizedData.evidenceType}\nTarget control: ${classification.label}`,
        [
          { id: "relevance", description: "How relevant is this evidence to the control?", weight: 0.4 },
          { id: "completeness", description: "Does this evidence fully address the control requirement?", weight: 0.3 },
          { id: "freshness", description: "Is this evidence recent enough to be valid?", weight: 0.3 },
        ],
        { min: 0, max: 100, labels: ["Insufficient", "Partially Sufficient", "Sufficient", "Strong"] }
      );

      return { classification, scoring, sanitizedData };
    }
  );

  if (!result.sent && !result.dryRun) {
    console.log(`[EvidenceClassifier] Blocked: ${result.error}`);
    return null;
  }

  if (result.dryRun || !result.response) {
    // Return a placeholder indicating dry-run
    return {
      evidenceId,
      controlMappings: [],
      sufficiencyScore: 0,
      freshnessStatus: "fresh",
      reasoning: result.dryRun ? "Dry-run mode — no external call made" : "No response from AI",
    };
  }

  // 5. Parse response into structured result
  const { classification, scoring } = result.response;
  const threshold = result.confidenceScore || 70;

  // Find matching control details
  const matchedControl = clientCtrlRows.find(
    (c) => `${c.controlId}: ${c.name} [${c.framework}]` === classification.label
  );

  const controlMappings = matchedControl
    ? [{
        controlId: matchedControl.controlId,
        controlName: matchedControl.name,
        framework: matchedControl.framework,
        confidence: classification.confidence,
        autoApproved: classification.confidence >= threshold,
      }]
    : [];

  // Add alternative mappings
  if (classification.alternatives) {
    for (const alt of classification.alternatives.slice(0, 3)) {
      const altControl = clientCtrlRows.find(
        (c) => `${c.controlId}: ${c.name} [${c.framework}]` === alt.label
      );
      if (altControl && alt.confidence >= 50) {
        controlMappings.push({
          controlId: altControl.controlId,
          controlName: altControl.name,
          framework: altControl.framework,
          confidence: alt.confidence,
          autoApproved: alt.confidence >= threshold,
        });
      }
    }
  }

  return {
    evidenceId,
    controlMappings,
    sufficiencyScore: scoring.score,
    freshnessStatus: scoring.score >= 70 ? "fresh" : scoring.score >= 40 ? "aging" : "stale",
    reasoning: scoring.reasoning || classification.reasoning || "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch classify — for autopilot runs
// ─────────────────────────────────────────────────────────────────────────────

export async function batchClassifyEvidence(
  clientId: number,
  evidenceIds: number[]
): Promise<EvidenceClassification[]> {
  const results: EvidenceClassification[] = [];
  for (const id of evidenceIds) {
    try {
      const result = await classifyEvidence(clientId, id);
      if (result) results.push(result);
    } catch (err: any) {
      console.error(`[EvidenceClassifier] Failed for evidence ${id}:`, err.message);
    }
  }
  return results;
}

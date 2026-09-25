/**
 * Control Mapping Engine — Auto-discover control equivalence across frameworks.
 *
 * When a new framework is added, this module:
 * 1. Compares controls between frameworks semantically
 * 2. Maps equivalent controls (e.g., SOC 2 CC6.1 ≈ ISO 27001 A.9.1.1)
 * 3. Identifies controls unique to the new framework
 * 4. Calculates coverage inheritance (how much is already satisfied)
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { controls, clientControls } from "../../../schema";
import { eq, and, ne, or } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ControlMapping {
  sourceControlId: string;
  sourceControlName: string;
  sourceFramework: string;
  targetControlId: string;
  targetControlName: string;
  targetFramework: string;
  confidence: number;
  equivalenceType: "exact" | "partial" | "related";
}

export interface ControlMappingResult {
  sourceFramework: string;
  targetFramework: string;
  mappings: ControlMapping[];
  uniqueToTarget: string[];
  uniqueToSource: string[];
  coverageInheritance: number; // percentage of target controls already covered
  newGapsCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main mapping function
// ─────────────────────────────────────────────────────────────────────────────

export async function mapControlsAcrossFrameworks(
  clientId: number,
  sourceFramework: string,
  targetFramework: string,
  userId?: number
): Promise<ControlMappingResult | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load controls from both frameworks
  const sourceControls = await db.select().from(controls).where(eq(controls.framework, sourceFramework));
  const targetControls = await db.select().from(controls).where(eq(controls.framework, targetFramework));

  if (sourceControls.length === 0 || targetControls.length === 0) {
    return {
      sourceFramework,
      targetFramework,
      mappings: [],
      uniqueToTarget: targetControls.map((c) => c.controlId),
      uniqueToSource: sourceControls.map((c) => c.controlId),
      coverageInheritance: 0,
      newGapsCount: targetControls.length,
    };
  }

  // 2. Load client's implemented controls for coverage calculation
  const implementedControls = await db.select({
    controlId: controls.controlId,
    framework: controls.framework,
    status: clientControls.status,
  })
    .from(clientControls)
    .innerJoin(controls, eq(controls.id, clientControls.controlId))
    .where(and(
      eq(clientControls.clientId, clientId),
      or(eq(controls.framework, sourceFramework), eq(controls.framework, targetFramework))
    ));

  const implementedIds = new Set(
    implementedControls
      .filter((c) => c.status === "implemented")
      .map((c) => c.controlId)
  );

  // 3. Build mapping input
  const sourceList = sourceControls.map((c) => `${c.controlId}: ${c.name}`).join("\n");
  const targetList = targetControls.map((c) => `${c.controlId}: ${c.name}`).join("\n");

  const data = {
    sourceFramework,
    targetFramework,
    sourceControls: sourceList,
    targetControls: targetList,
    sourceCount: sourceControls.length,
    targetCount: targetControls.length,
  };

  // 4. Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "control_mapper",
      userId,
      entityType: "control_mapping",
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Extractor: map controls between frameworks
      const mappings: ControlMapping[] = [];

      // Process in batches to avoid overwhelming the API
      const sourceLines = sanitizedData.sourceControls.split("\n");
      const targetLines = sanitizedData.targetControls.split("\n");

      for (let i = 0; i < Math.min(sourceLines.length, 20); i++) {
        const source = sourceLines[i];
        // Find best match for each source control in target
        const matchResult = await provider.route(
          `Map this control: ${source}`,
          targetLines.slice(0, 20).map((t) => ({ id: t.slice(0, 80), description: t })),
          `Find the most equivalent control in the target framework. If no equivalent exists, select "no_match".`
        );

        if (matchResult.path !== "no_match" && matchResult.confidence > 40) {
          const targetIdx = targetLines.findIndex((t) => t.startsWith(matchResult.path) || t.includes(matchResult.path));
          if (targetIdx >= 0) {
            mappings.push({
              sourceControlId: source.split(":")[0].trim(),
              sourceControlName: source.split(":")[1]?.trim() || source,
              sourceFramework: sanitizedData.sourceFramework,
              targetControlId: targetLines[targetIdx].split(":")[0].trim(),
              targetControlName: targetLines[targetIdx].split(":")[1]?.trim() || targetLines[targetIdx],
              targetFramework: sanitizedData.targetFramework,
              confidence: matchResult.confidence,
              equivalenceType: matchResult.confidence >= 80 ? "exact" : matchResult.confidence >= 50 ? "partial" : "related",
            });
          }
        }
      }

      return { mappings, sourceCount: sanitizedData.sourceCount, targetCount: sanitizedData.targetCount };
    }
  );

  // 5. Calculate unique controls and coverage
  const mappedTargetIds = new Set(
    (result.response?.mappings || []).map((m) => m.targetControlId)
  );
  const mappedSourceIds = new Set(
    (result.response?.mappings || []).map((m) => m.sourceControlId)
  );

  const uniqueToTarget = targetControls
    .filter((c) => !mappedTargetIds.has(c.controlId))
    .map((c) => c.controlId);

  const uniqueToSource = sourceControls
    .filter((c) => !mappedSourceIds.has(c.controlId))
    .map((c) => c.controlId);

  // Coverage: how many target controls are covered by implemented source controls
  let coveredCount = 0;
  for (const mapping of result.response?.mappings || []) {
    if (implementedIds.has(mapping.sourceControlId)) {
      coveredCount++;
    }
  }

  const coverageInheritance = result.response?.mappings?.length
    ? Math.round((coveredCount / result.response.mappings.length) * 100)
    : 0;

  return {
    sourceFramework,
    targetFramework,
    mappings: result.response?.mappings || [],
    uniqueToTarget,
    uniqueToSource,
    coverageInheritance,
    newGapsCount: uniqueToTarget.length + Math.max(0, mappedTargetIds.size - coveredCount),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick coverage estimate — no AI needed
// ─────────────────────────────────────────────────────────────────────────────

export function estimateCoverageFromMappings(
  mappings: ControlMapping[],
  implementedControlIds: Set<string>
): { covered: number; total: number; percentage: number } {
  let covered = 0;
  for (const m of mappings) {
    if (implementedControlIds.has(m.sourceControlId)) covered++;
  }
  return {
    covered,
    total: mappings.length,
    percentage: mappings.length > 0 ? Math.round((covered / mappings.length) * 100) : 0,
  };
}

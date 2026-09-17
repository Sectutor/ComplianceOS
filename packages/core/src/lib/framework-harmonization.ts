import { getDb } from "../db";
import {
  complianceFrameworks,
  clientFrameworks,
  clientFrameworkControls,
  controls,
  controlMappings,
} from "../schema";
import { eq, and, inArray } from "drizzle-orm";

export interface HarmonizationResult {
  sourceFramework: { id: number; name: string; shortCode: string };
  targetFramework: { id: number; name: string; shortCode: string };
  totalTargetControls: number;
  coveredBySource: number;
  coveragePercent: number;
  neededAdditional: number;
  equivalentControls: Array<{
    sourceCode: string;
    sourceName: string;
    targetCode: string;
    targetName: string;
    mappingType: string;
  }>;
  uncoveredControls: Array<{
    code: string;
    title: string;
    description: string | null;
  }>;
}

export interface ListedFramework {
  id: number;
  name: string;
  shortCode: string;
  version: string | null;
}

/**
 * Computes cross-framework harmonization coverage.
 * Determines how many controls in the target framework are already
 * satisfied by implemented controls in the source framework.
 */
export async function computeHarmonization(
  clientId: number,
  sourceFrameworkCode: string,
  targetFrameworkCode: string
): Promise<HarmonizationResult> {
  const db = await getDb();

  // 1. Look up the two compliance frameworks by shortCode
  const [sourceFramework] = await db
    .select()
    .from(complianceFrameworks)
    .where(eq(complianceFrameworks.shortCode, sourceFrameworkCode))
    .limit(1);

  const [targetFramework] = await db
    .select()
    .from(complianceFrameworks)
    .where(eq(complianceFrameworks.shortCode, targetFrameworkCode))
    .limit(1);

  if (!sourceFramework) {
    throw new Error(`Source framework '${sourceFrameworkCode}' not found`);
  }
  if (!targetFramework) {
    throw new Error(`Target framework '${targetFrameworkCode}' not found`);
  }

  // 2. Find clientFrameworks entries for this client matching the framework names
  const clientSourceFrameworks = await db
    .select()
    .from(clientFrameworks)
    .where(
      and(
        eq(clientFrameworks.clientId, clientId),
        eq(clientFrameworks.name, sourceFramework.name)
      )
    );

  const clientTargetFrameworks = await db
    .select()
    .from(clientFrameworks)
    .where(
      and(
        eq(clientFrameworks.clientId, clientId),
        eq(clientFrameworks.name, targetFramework.name)
      )
    );

  if (clientSourceFrameworks.length === 0) {
    throw new Error(
      `Client has no source framework matching '${sourceFramework.name}'`
    );
  }
  if (clientTargetFrameworks.length === 0) {
    throw new Error(
      `Client has no target framework matching '${targetFramework.name}'`
    );
  }

  const sourceClientFrameworkId = clientSourceFrameworks[0].id;
  const targetClientFrameworkId = clientTargetFrameworks[0].id;

  // 3. Get clientFrameworkControls for source and target frameworks
  const sourceCFCs = await db
    .select()
    .from(clientFrameworkControls)
    .where(eq(clientFrameworkControls.frameworkId, sourceClientFrameworkId));

  const targetCFCs = await db
    .select()
    .from(clientFrameworkControls)
    .where(eq(clientFrameworkControls.frameworkId, targetClientFrameworkId));

  const totalTargetControls = targetCFCs.length;

  // Helper: return zero-coverage result
  const zeroCoverage = (): HarmonizationResult => ({
    sourceFramework: {
      id: sourceFramework.id,
      name: sourceFramework.name,
      shortCode: sourceFramework.shortCode,
    },
    targetFramework: {
      id: targetFramework.id,
      name: targetFramework.name,
      shortCode: targetFramework.shortCode,
    },
    totalTargetControls,
    coveredBySource: 0,
    coveragePercent: 0,
    neededAdditional: totalTargetControls,
    equivalentControls: [],
    uncoveredControls: targetCFCs.map((c) => ({
      code: c.controlCode,
      title: c.title,
      description: c.description,
    })),
  });

  // 4. Filter source controls to only implemented ones
  const implementedSourceCFCs = sourceCFCs.filter(
    (c) => c.status === "implemented"
  );

  if (implementedSourceCFCs.length === 0) {
    return zeroCoverage();
  }

  const implementedCodes = implementedSourceCFCs.map((c) => c.controlCode);

  // 5. Look up global controls for the source framework matching implemented codes
  const sourceGlobalControls = await db
    .select()
    .from(controls)
    .where(
      and(
        inArray(controls.controlId, implementedCodes),
        eq(controls.framework, sourceFramework.name)
      )
    );

  const sourceGlobalIds = sourceGlobalControls.map((c) => c.id);

  if (sourceGlobalIds.length === 0) {
    return zeroCoverage();
  }

  // 6. Find control mappings from implemented source controls to target controls
  const mappings = await db
    .select()
    .from(controlMappings)
    .where(inArray(controlMappings.sourceControlId, sourceGlobalIds));

  if (mappings.length === 0) {
    return zeroCoverage();
  }

  const mappedTargetIds = mappings.map((m) => m.targetControlId);

  // 7. Look up the target global controls
  const targetGlobalControls = await db
    .select()
    .from(controls)
    .where(inArray(controls.id, mappedTargetIds));

  // Build quick lookup maps
  const sourceGlobalById = new Map(
    sourceGlobalControls.map((c) => [c.id, c])
  );
  const targetGlobalById = new Map(
    targetGlobalControls.map((c) => [c.id, c])
  );

  const targetCFCCodes = new Set(targetCFCs.map((c) => c.controlCode));
  const targetCFCMap = new Map(targetCFCs.map((c) => [c.controlCode, c]));

  // 8. Compute covered target controls
  const coveredTargetCodes = new Set<string>();
  const equivalentControls: HarmonizationResult["equivalentControls"] = [];

  for (const mapping of mappings) {
    const sourceGlobal = sourceGlobalById.get(mapping.sourceControlId);
    const targetGlobal = targetGlobalById.get(mapping.targetControlId);

    if (sourceGlobal && targetGlobal) {
      const targetCode = targetGlobal.controlId;
      if (targetCFCCodes.has(targetCode)) {
        coveredTargetCodes.add(targetCode);
        equivalentControls.push({
          sourceCode: sourceGlobal.controlId,
          sourceName: sourceGlobal.name,
          targetCode: targetCode,
          targetName: targetGlobal.name,
          mappingType: mapping.mappingType,
        });
      }
    }
  }

  const coveredBySource = coveredTargetCodes.size;
  const coveragePercent =
    totalTargetControls > 0
      ? Math.round((coveredBySource / totalTargetControls) * 100)
      : 0;
  const neededAdditional = totalTargetControls - coveredBySource;

  const uncoveredControls = targetCFCs
    .filter((c) => !coveredTargetCodes.has(c.controlCode))
    .map((c) => ({
      code: c.controlCode,
      title: c.title,
      description: c.description,
    }));

  return {
    sourceFramework: {
      id: sourceFramework.id,
      name: sourceFramework.name,
      shortCode: sourceFramework.shortCode,
    },
    targetFramework: {
      id: targetFramework.id,
      name: targetFramework.name,
      shortCode: targetFramework.shortCode,
    },
    totalTargetControls,
    coveredBySource,
    coveragePercent,
    neededAdditional,
    equivalentControls,
    uncoveredControls,
  };
}

/**
 * Returns the frameworks that a client has controls for.
 * Joins clientFrameworks with complianceFrameworks on name.
 */
export async function listClientFrameworks(
  clientId: number
): Promise<ListedFramework[]> {
  const db = await getDb();

  const clientFwRows = await db
    .select()
    .from(clientFrameworks)
    .where(eq(clientFrameworks.clientId, clientId));

  if (clientFwRows.length === 0) {
    return [];
  }

  // Match client framework names to compliance frameworks
  const clientFwNames = clientFwRows.map((cfr) => cfr.name);

  const matchedFrameworks = await db
    .select()
    .from(complianceFrameworks)
    .where(inArray(complianceFrameworks.name, clientFwNames));

  return matchedFrameworks.map((cf) => ({
    id: cf.id,
    name: cf.name,
    shortCode: cf.shortCode,
    version: cf.version,
  }));
}

import { getDb } from '../db';
import {
  controls,
  clientControls,
  controlMappings,
  complianceFrameworks,
  frameworkRequirements,
  clientFrameworkControls,
  frameworkMappings,
} from '../schema';
import { eq, and, inArray } from 'drizzle-orm';

export interface MeshNode {
  id: string;
  label: string;
  type: 'control' | 'requirement' | 'framework';
  framework: string;
  status?: string;
  group?: string;
}

export interface MeshEdge {
  source: string;
  target: string;
  label: string;
  type: 'maps_to' | 'satisfies';
}

export interface ControlMeshResult {
  nodes: MeshNode[];
  edges: MeshEdge[];
}

export interface ControlDetailResult {
  control: any;
  implementations: Array<{ framework: string; status: string }>;
  mappedRequirements: Array<{ framework: string; requirementId: string; title: string; mappingType: string }>;
}

/**
 * Build a control mesh graph for a given client.
 * Shows controls connected to requirements across frameworks.
 * If frameworkCode is provided, only shows nodes/edges for that framework.
 */
export async function getControlMesh(
  clientId: number,
  frameworkCode?: string
): Promise<ControlMeshResult> {
  const db = await getDb();
  const nodes: MeshNode[] = [];
  const edges: MeshEdge[] = [];
  const nodeSet = new Set<string>();

  // 1. Get the compliance frameworks
  let frameworksFilter = db.select().from(complianceFrameworks);
  if (frameworkCode) {
    frameworksFilter = db
      .select()
      .from(complianceFrameworks)
      .where(eq(complianceFrameworks.shortCode, frameworkCode));
  }
  const frameworks: any[] = await frameworksFilter;
  if (frameworks.length === 0) return { nodes, edges };
  const frameworkMap = new Map(frameworks.map((f: any) => [f.id, f]));

  // 2. Get clientControls for this client
  const clientCtrls: any[] = await db
    .select()
    .from(clientControls)
    .where(eq(clientControls.clientId, clientId));
  if (clientCtrls.length === 0) return { nodes, edges };
  const controlIds = clientCtrls.map((cc: any) => cc.controlId);

  // 3. Get the controls referenced by clientControls
  const allControls: any[] = await db
    .select()
    .from(controls)
    .where(inArray(controls.id, controlIds));
  if (allControls.length === 0) return { nodes, edges };

  // 4. Filter controls by framework if frameworkCode provided
  const filteredControls = frameworkCode
    ? allControls.filter((c: any) => c.framework === frameworkCode)
    : allControls;
  if (filteredControls.length === 0) return { nodes, edges };
  const controlLookup = new Map(allControls.map((c: any) => [c.id, c]));

  // 5. Framework requirements
  let requirements: any[] = [];
  if (frameworkCode) {
    const fw = frameworks[0];
    if (fw) {
      requirements = await db
        .select()
        .from(frameworkRequirements)
        .where(eq(frameworkRequirements.frameworkId, fw.id));
    }
  } else {
    const fwIds = frameworks.map((f: any) => f.id);
    requirements = await db
      .select()
      .from(frameworkRequirements)
      .where(inArray(frameworkRequirements.frameworkId, fwIds));
  }

  // 6. Get control mappings (cross-framework relationships)
  const ctrlIds = allControls.map((c: any) => c.id);
  const mappings: any[] = await db
    .select()
    .from(controlMappings)
    .where(
      and(
        inArray(controlMappings.sourceControlId, ctrlIds),
        inArray(controlMappings.targetControlId, ctrlIds)
      )
    );

  // 7. Get framework mappings (requirement-level cross-framework)
  let fwMappings: any[] = [];
  const fwIds = frameworks.map((f: any) => f.id);
  if (!frameworkCode) {
    fwMappings = await db
      .select()
      .from(frameworkMappings)
      .where(
        and(
          inArray(frameworkMappings.sourceFrameworkId, fwIds),
          inArray(frameworkMappings.targetFrameworkId, fwIds)
        )
      );
  }

  // Helper to add a node
  const addNode = (id: string, label: string, type: 'control' | 'requirement' | 'framework', framework: string, status?: string, group?: string) => {
    if (!nodeSet.has(id)) {
      nodeSet.add(id);
      nodes.push({ id, label, type, framework, status, group });
    }
  };

  // Add framework nodes
  for (const fw of frameworks) {
    addNode(`fw-${fw.shortCode}`, fw.shortCode, 'framework', fw.shortCode, undefined, 'framework');
  }

  // Add control nodes
  for (const ctrl of filteredControls) {
    const shortCode = getFrameworkShortCode(ctrl.framework, frameworks);
    addNode(`ctrl-${ctrl.id}`, ctrl.name || ctrl.controlId, 'control', shortCode || ctrl.framework, undefined, 'control');
  }

  // Add framework requirement nodes
  for (const req of requirements) {
    const fw = frameworkMap.get(req.frameworkId);
    if (!fw) continue;
    addNode(`req-${req.id}`, req.title || req.identifier, 'requirement', fw.shortCode, undefined, 'requirement');
  }

  // Add edges from controlMappings
  for (const mapping of mappings) {
    const sourceCtrl = controlLookup.get(mapping.sourceControlId);
    const targetCtrl = controlLookup.get(mapping.targetControlId);
    if (!sourceCtrl || !targetCtrl) continue;
    edges.push({
      source: `ctrl-${mapping.sourceControlId}`,
      target: `ctrl-${mapping.targetControlId}`,
      label: mapping.mappingType || 'related',
      type: 'maps_to',
    });
  }

  // Add edges from controls to their framework requirements
  for (const ctrl of filteredControls) {
    const fw = frameworks.find((f: any) => f.shortCode === getFrameworkShortCode(ctrl.framework, frameworks));
    if (!fw) continue;
    const reqsForFramework = requirements.filter((r: any) => r.frameworkId === fw.id);
    for (const req of reqsForFramework) {
      edges.push({
        source: `ctrl-${ctrl.id}`,
        target: `req-${req.id}`,
        label: 'satisfies',
        type: 'satisfies',
      });
    }
  }

  // Add framework-to-framework mapping edges
  for (const fwMapping of fwMappings) {
    const sourceFw = frameworkMap.get(fwMapping.sourceFrameworkId);
    const targetFw = frameworkMap.get(fwMapping.targetFrameworkId);
    if (!sourceFw || !targetFw) continue;
    edges.push({
      source: `fw-${sourceFw.shortCode}`,
      target: `fw-${targetFw.shortCode}`,
      label: fwMapping.strength || 'related',
      type: 'maps_to',
    });
  }

  return { nodes, edges };
}

/**
 * Get detailed information about a specific control and its cross-framework relationships.
 */
export async function getControlDetail(clientId: number, controlId: number): Promise<ControlDetailResult> {
  const db = await getDb();

  const [ctrl] = await db.select().from(controls).where(eq(controls.id, controlId)).limit(1);
  if (!ctrl) throw new Error(`Control with id ${controlId} not found`);

  const [clientCtrl] = await db
    .select()
    .from(clientControls)
    .where(and(eq(clientControls.clientId, clientId), eq(clientControls.controlId, controlId)))
    .limit(1);

  const frameworks: any[] = await db.select().from(complianceFrameworks);

  const mappings: any[] = await db.select().from(controlMappings).where(eq(controlMappings.sourceControlId, controlId));
  const targetControlIds = mappings.map((m: any) => m.targetControlId);

  let targetControls: any[] = [];
  if (targetControlIds.length > 0) {
    targetControls = await db.select().from(controls).where(inArray(controls.id, targetControlIds));
  }
  const targetCtrlLookup = new Map(targetControls.map((c: any) => [c.id, c]));

  let targetClientCtrls: any[] = [];
  if (targetControlIds.length > 0) {
    targetClientCtrls = await db
      .select()
      .from(clientControls)
      .where(and(eq(clientControls.clientId, clientId), inArray(clientControls.controlId, targetControlIds)));
  }
  const targetStatusMap = new Map(targetClientCtrls.map((cc: any) => [cc.controlId, cc.status]));

  // Build implementations
  const implementations: Array<{ framework: string; status: string }> = [];
  implementations.push({ framework: ctrl.framework, status: clientCtrl?.status || 'not_implemented' });
  for (const mapping of mappings) {
    const targetCtrl = targetCtrlLookup.get(mapping.targetControlId);
    if (!targetCtrl) continue;
    implementations.push({ framework: targetCtrl.framework, status: targetStatusMap.get(mapping.targetControlId) || 'not_implemented' });
  }

  // Remove duplicates (keep first)
  const seenFrameworks = new Set<string>();
  const uniqueImplementations = implementations.filter((impl) => {
    if (seenFrameworks.has(impl.framework)) return false;
    seenFrameworks.add(impl.framework);
    return true;
  });

  // Build mapped requirements
  const mappedRequirements: Array<{ framework: string; requirementId: string; title: string; mappingType: string }> = [];
  for (const mapping of mappings) {
    const targetCtrl = targetCtrlLookup.get(mapping.targetControlId);
    if (!targetCtrl) continue;
    mappedRequirements.push({
      framework: targetCtrl.framework,
      requirementId: targetCtrl.controlId,
      title: targetCtrl.name || targetCtrl.controlId,
      mappingType: mapping.mappingType || 'related',
    });
  }

  return { control: ctrl, implementations: uniqueImplementations, mappedRequirements };
}

/**
 * Helper to get framework shortCode from framework name
 */
function getFrameworkShortCode(frameworkName: string, frameworks: any[]): string | undefined {
  const fw = frameworks.find(
    (f: any) =>
      f.shortCode === frameworkName ||
      f.name === frameworkName ||
      frameworkName.startsWith(f.shortCode || '') ||
      (f.shortCode && frameworkName.toLowerCase().includes(f.shortCode.toLowerCase()))
  );
  return fw?.shortCode;
}

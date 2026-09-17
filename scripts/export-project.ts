/**
 * CLI Script: Export full project data to JSON file
 *
 * Usage: npx tsx scripts/export-project.ts <clientId> [output-path]
 *
 * Examples:
 *   npx tsx scripts/export-project.ts 42
 *   npx tsx scripts/export-project.ts 42 ./export-client-42.json
 */

import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq } from 'drizzle-orm';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/export-project.ts <clientId> [output-path]');
    process.exit(1);
  }

  const clientId = parseInt(args[0]);
  if (isNaN(clientId)) {
    console.error(`Invalid clientId: ${args[0]}`);
    process.exit(1);
  }

  const outputPath = args[1] || join(process.cwd(), `complianceos-export-client-${clientId}-${Date.now()}.json`);

  console.log(`[Export] Fetching all data for client ${clientId}...`);
  const d = await getDb();

  const [
    policies,
    riskScenarios,
    riskAssessments,
    controls,
    biaQuestionnaires,
    bcPlans,
    vendors,
    vendorAssessments,
    evidence,
    frameworks,
  ] = await Promise.all([
    d.query.clientPolicies.findMany({ where: eq(schema.clientPolicies.clientId, clientId) }),
    d.query.riskScenarios.findMany({ where: eq(schema.riskScenarios.clientId, clientId) }),
    d.select().from(schema.riskAssessments).where(eq(schema.riskAssessments.clientId, clientId)),
    d.query.controls.findMany({ where: eq(schema.controls.clientId, clientId) }),
    d.query.biaQuestionnaires.findMany({ where: eq(schema.biaQuestionnaires.clientId, clientId) }),
    d.query.bcPlans.findMany({ where: eq(schema.bcPlans.clientId, clientId) }),
    d.query.vendors.findMany({ where: eq(schema.vendors.clientId, clientId) }),
    d.query.vendorAssessments.findMany({ where: eq(schema.vendorAssessments.clientId, clientId) }),
    d.query.evidence.findMany({ where: eq(schema.evidence.clientId, clientId) }),
    d.query.clientFrameworks.findMany({ where: eq(schema.clientFrameworks.clientId, clientId) }),
  ]);

  const project = {
    exportedAt: new Date().toISOString(),
    clientId,
    summary: {
      policies: policies.length,
      riskScenarios: riskScenarios.length,
      riskAssessments: riskAssessments.length,
      controls: controls.length,
      biaQuestionnaires: biaQuestionnaires.length,
      bcPlans: bcPlans.length,
      vendors: vendors.length,
      vendorAssessments: vendorAssessments.length,
      evidence: evidence.length,
      frameworks: frameworks.length,
    },
  };

  const output = JSON.stringify(project, null, 2);

  const dir = resolve(outputPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(outputPath, output, 'utf-8');
  console.log(`[Export] ✓ Written to ${outputPath}`);
  console.log(`[Export] Summary: ${JSON.stringify(project.summary, null, 2)}`);
}

main().catch((err) => {
  console.error('[Export] Failed:', err);
  process.exit(1);
});

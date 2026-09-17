/**
 * PCI DSS v4.0 Framework Seeder
 * 
 * Reads the existing pciControls data from the framework source code
 * and inserts it into the database as a client framework.
 * 
 * Usage: docker cp scripts/seed-pci-dss-v4.ts complianceos-app-1:/tmp/ && 
 *        docker exec complianceos-app-1 npx tsx /tmp/seed-pci-dss-v4.ts
 */

import { eq, and, count as drizzleCount } from 'drizzle-orm';
import { getDb } from '/app/packages/core/src/db';
import { clientFrameworks, clientFrameworkControls } from '/app/packages/core/src/schema';
import { pciControls } from '/app/packages/core/src/data/frameworks/pci';

const CLIENT_ID = 3; // Primary demo client
const FRAMEWORK_NAME = 'PCI DSS v4.0';
const FRAMEWORK_VERSION = '4.0.1';

async function main() {
  console.log('🔐 PCI DSS v4.0 Framework Seeder');
  console.log(`📋 Loading ${pciControls.length} controls from source...`);

  const db = await getDb();

  // Check if this framework already exists for this client
  const existing = await db.select({ id: clientFrameworks.id })
    .from(clientFrameworks)
    .where(
      and(
        eq(clientFrameworks.clientId, CLIENT_ID),
        eq(clientFrameworks.name, FRAMEWORK_NAME)
      )
    )
    .limit(1);

  let frameworkId: number;

  if (existing.length > 0) {
    frameworkId = existing[0].id;
    console.log(`ℹ️ Framework "${FRAMEWORK_NAME}" already exists (id=${frameworkId}). Skipping framework creation.`);

    // Check if controls already seeded
    const existingControls = await db.select({ count: drizzleCount() })
      .from(clientFrameworkControls)
      .where(eq(clientFrameworkControls.frameworkId, frameworkId));

    const count = Number(existingControls[0]?.count || 0);
    if (count > 0) {
      console.log(`ℹ️ ${count} controls already exist for this framework. Skipping seed.`);
      console.log('✅ PCI DSS v4.0 already seeded. Nothing to do.');
      process.exit(0);
    }
  } else {
    // Create the framework record
    console.log('✨ Creating PCI DSS v4.0 framework record...');
    const [framework] = await db.insert(clientFrameworks).values({
      clientId: CLIENT_ID,
      name: FRAMEWORK_NAME,
      version: FRAMEWORK_VERSION,
      sourceFileName: 'pci_dss_v4_auto_seed',
      status: 'active'
    }).returning();
    frameworkId = framework.id;
    console.log(`✅ Framework created with id=${frameworkId}`);
  }

  // Group controls by requirement/category
  const requirementMap: Record<string, typeof pciControls> = {};
  for (const ctrl of pciControls) {
    const req = ctrl.category || 'Requirement 1';
    if (!requirementMap[req]) requirementMap[req] = [];
    requirementMap[req].push(ctrl);
  }

  const requirements = Object.keys(requirementMap).sort();
  console.log(`📊 Requirements found: ${requirements.length}`);
  for (const req of requirements) {
    console.log(`   ${req}: ${requirementMap[req].length} controls`);
  }

  // Bulk insert all controls
  console.log('💾 Inserting controls...');
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < pciControls.length; i += batchSize) {
    const batch = pciControls.slice(i, i + batchSize).map(c => ({
      frameworkId,
      controlCode: c.id,
      title: c.name,
      description: c.description,
      grouping: c.category || 'Requirement 1',
      status: 'not_implemented',
      applicability: 'applicable',
      originalData: {
        implementationGuidance: c.implementationGuidance || '',
        requirement: c.category || '',
      },
    }));

    await db.insert(clientFrameworkControls).values(batch as any);
    inserted += batch.length;
    console.log(`   ${inserted}/${pciControls.length} controls inserted...`);
  }

  console.log(`✅ PCI DSS v4.0 seeding complete!`);
  console.log(`   Framework ID: ${frameworkId}`);
  console.log(`   Client ID: ${CLIENT_ID}`);
  console.log(`   Total controls: ${inserted}`);
  console.log(`   Requirements covered: ${requirements.length}`);
}

main().catch(e => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});

import { getDb } from "../db";
import {
  complianceFrameworks,
  frameworkRequirements,
  controls,
  clientControls,
  clients,
} from "../schema";
import { FEDRAMP_CONTROLS } from "../data/frameworks/fedramp";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export async function importFedRampFramework() {
  console.log("=== FedRAMP (NIST SP 800-53 Rev 5) Framework Importer ===");
  const db = await getDb();

  // 1. Ensure 'FedRAMP Moderate' Framework exists
  let [frameworkRecord] = await db
    .select()
    .from(complianceFrameworks)
    .where(eq(complianceFrameworks.shortCode, "FEDRAMP"));

  if (!frameworkRecord) {
    const [inserted] = await db
      .insert(complianceFrameworks)
      .values({
        shortCode: "FEDRAMP",
        name: "FedRAMP Moderate (NIST SP 800-53 Rev 5)",
        description: "Federal Risk and Authorization Management Program Moderate Baseline controls.",
        version: "Rev 5",
        type: "federal",
      })
      .returning();
    frameworkRecord = inserted;
    console.log(`Created Framework 'FedRAMP Moderate' (ID #${frameworkRecord.id})`);
  } else {
    console.log(`Framework 'FedRAMP Moderate' already exists (ID #${frameworkRecord.id})`);
  }

  // 2. Process Controls & Master Controls
  let controlsCreated = 0;
  let clientControlsAssigned = 0;

  // Get active client list
  const activeClients = await db.select().from(clients);

  for (const item of FEDRAMP_CONTROLS) {
    // Insert/Fetch Requirement
    let [req] = await db
      .select()
      .from(frameworkRequirements)
      .where(
        and(
          eq(frameworkRequirements.frameworkId, frameworkRecord.id),
          eq(frameworkRequirements.identifier, item.controlId)
        )
      );

    if (!req) {
      const [insertedReq] = await db
        .insert(frameworkRequirements)
        .values({
          frameworkId: frameworkRecord.id,
          identifier: item.controlId,
          title: item.name,
          description: item.description,
        })
        .returning();
      req = insertedReq;
    }

    // Insert/Fetch Master Control
    let [ctrl] = await db
      .select()
      .from(controls)
      .where(eq(controls.controlId, item.controlId));

    if (!ctrl) {
      const [insertedCtrl] = await db
        .insert(controls)
        .values({
          controlId: item.controlId,
          name: item.name,
          description: `${item.description}\n\nImplementation Guidance:\n${item.guidance}`,
          category: item.family,
          framework: "FedRAMP Moderate",
          status: "active",
        })
        .returning();
      ctrl = insertedCtrl;
      controlsCreated++;
    }

    // Assign to active clients
    for (const client of activeClients) {
      const [existingClientCtrl] = await db
        .select()
        .from(clientControls)
        .where(
          and(
            eq(clientControls.clientId, client.id),
            eq(clientControls.controlId, ctrl.id)
          )
        );

      if (!existingClientCtrl) {
        await db.insert(clientControls).values({
          clientId: client.id,
          controlId: ctrl.id,
          status: "implemented",
          owner: "System Administrator",
          applicability: "applicable",
        });
        clientControlsAssigned++;
      }
    }
  }

  console.log(`Import Complete: ${FEDRAMP_CONTROLS.length} FedRAMP controls processed (${controlsCreated} new master controls, ${clientControlsAssigned} client control assignments created).`);
}

// Run script if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("import_fedramp.ts")) {
  importFedRampFramework()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("FedRAMP import failed:", err);
      process.exit(1);
    });
}

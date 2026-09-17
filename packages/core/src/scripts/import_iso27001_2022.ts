import { getDb } from "../db";
import {
  complianceFrameworks,
  frameworkRequirements,
  controls,
  clientControls,
  clients,
} from "../schema";
import { ISO27001_2022_CONTROLS } from "../data/frameworks/iso27001_2022";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export async function importIso27001_2022Framework() {
  console.log("=== ISO/IEC 27001:2022 Annex A Framework Importer ===");
  const db = await getDb();

  // 1. Ensure 'ISO 27001:2022' Framework exists
  let [frameworkRecord] = await db
    .select()
    .from(complianceFrameworks)
    .where(eq(complianceFrameworks.shortCode, "ISO27001_2022"));

  if (!frameworkRecord) {
    const [inserted] = await db
      .insert(complianceFrameworks)
      .values({
        shortCode: "ISO27001_2022",
        name: "ISO/IEC 27001:2022 Annex A",
        description: "Information security, cybersecurity and privacy protection — Information security controls.",
        version: "2022",
        type: "Security",
      })
      .returning();
    frameworkRecord = inserted;
    console.log(`Created Framework 'ISO 27001:2022' (ID #${frameworkRecord.id})`);
  } else {
    console.log(`Framework 'ISO 27001:2022' already exists (ID #${frameworkRecord.id})`);
  }

  // 2. Process Controls & Master Controls
  let controlsCreated = 0;
  let clientControlsAssigned = 0;

  const activeClients = await db.select().from(clients);

  for (const item of ISO27001_2022_CONTROLS) {
    // Requirement
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

    // Master Control
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
          category: item.theme,
          framework: "ISO 27001:2022",
          status: "active",
        })
        .returning();
      ctrl = insertedCtrl;
      controlsCreated++;
    }

    // Client Controls Assignments
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
          owner: "Information Security Officer",
          applicability: "applicable",
        });
        clientControlsAssigned++;
      }
    }
  }

  console.log(
    `Import Complete: ${ISO27001_2022_CONTROLS.length} ISO 27001:2022 controls processed (${controlsCreated} new master controls, ${clientControlsAssigned} client control assignments created).`
  );
}

// Run script if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("import_iso27001_2022.ts")) {
  importIso27001_2022Framework()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("ISO 27001:2022 import failed:", err);
      process.exit(1);
    });
}

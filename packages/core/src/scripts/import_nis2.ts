import { getDb } from "../db";
import {
  complianceFrameworks,
  frameworkRequirements,
  controls,
  clientControls,
  clients,
} from "../schema";
import { NIS2_CONTROLS } from "../data/frameworks/nis2";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export async function importNis2Framework() {
  console.log("=== EU NIS2 Cybersecurity Directive Framework Importer ===");
  const db = await getDb();

  // 1. Ensure 'EU NIS2' Framework exists
  let [frameworkRecord] = await db
    .select()
    .from(complianceFrameworks)
    .where(eq(complianceFrameworks.shortCode, "NIS2"));

  if (!frameworkRecord) {
    const [inserted] = await db
      .insert(complianceFrameworks)
      .values({
        shortCode: "NIS2",
        name: "EU NIS2 Cybersecurity Directive (Directive EU 2022/2555)",
        description: "European Union Directive on measures for a high common level of cybersecurity across the Union.",
        version: "2022/2555",
        type: "regulatory",
      })
      .returning();
    frameworkRecord = inserted;
    console.log(`Created Framework 'EU NIS2' (ID #${frameworkRecord.id})`);
  } else {
    console.log(`Framework 'EU NIS2' already exists (ID #${frameworkRecord.id})`);
  }

  // 2. Process Controls & Master Controls
  let controlsCreated = 0;
  let clientControlsAssigned = 0;

  const activeClients = await db.select().from(clients);

  for (const item of NIS2_CONTROLS) {
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
          category: item.article,
          framework: "EU NIS2 Directive",
          status: "active",
        })
        .returning();
      ctrl = insertedCtrl;
      controlsCreated++;
    }

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
          owner: "Chief Information Security Officer",
          applicability: "applicable",
        });
        clientControlsAssigned++;
      }
    }
  }

  console.log(
    `Import Complete: ${NIS2_CONTROLS.length} NIS2 controls processed (${controlsCreated} new master controls, ${clientControlsAssigned} client control assignments created).`
  );
}

// Run script if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("import_nis2.ts")) {
  importNis2Framework()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("NIS2 import failed:", err);
      process.exit(1);
    });
}

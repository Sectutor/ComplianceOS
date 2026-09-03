/**
 * LaTorre Demo Auto-Provisioning
 *
 * When a new client signs up, this copies the complete LaTorre LTD demo dataset
 * (frameworks, controls, vendors, assessments, evidence, incidents, risk
 * treatments, certificates) from the source workspace (clientId = 7, seeded by
 * scripts/bootstrap-db.ts) into their new workspace.
 *
 * Implementation note: uses explicit select+insert instead of
 * db.insert().select() because the pinned drizzle-orm (0.30.x) does not
 * support the insert-select builder.
 *
 * Called automatically after client creation (clients.create router).
 */

import { getDb } from '../db';
import {
  clientFrameworks, clientControls, vendors, vendorAssessments,
  evidence, incidents, riskTreatments, complianceCertificates
} from '../schema';
import { eq, asc } from 'drizzle-orm';

const LATORRE_CLIENT_ID = 7;

export async function provisionLaTorreDemo(newClientId: number): Promise<void> {
  const db = await getDb();

  console.log(`[LaTorreDemo] Provisioning demo data for client ${newClientId}...`);

  // 1. Framework mappings
  const srcFrameworks = await db
    .select()
    .from(clientFrameworks)
    .where(eq(clientFrameworks.clientId, LATORRE_CLIENT_ID));
  if (srcFrameworks.length > 0) {
    await db.insert(clientFrameworks).values(
      srcFrameworks.map((f) => ({
        clientId: newClientId,
        name: f.name,
        status: f.status,
      }))
    );
  }

  // 2. Client controls (mapped to the same controls-library entries)
  const srcControls = await db
    .select()
    .from(clientControls)
    .where(eq(clientControls.clientId, LATORRE_CLIENT_ID))
    .orderBy(asc(clientControls.id));
  if (srcControls.length > 0) {
    await db.insert(clientControls).values(
      srcControls.map((c) => ({
        clientId: newClientId,
        controlId: c.controlId,
        status: c.status,
        owner: c.owner,
      }))
    );
  }

  // New client's controls in the same order as the source ones (for evidence remapping)
  const newControls = srcControls.length
    ? await db
        .select({ id: clientControls.id })
        .from(clientControls)
        .where(eq(clientControls.clientId, newClientId))
        .orderBy(asc(clientControls.id))
    : [];
  const controlIdMap = new Map<number, number>();
  srcControls.forEach((c, i) => {
    if (newControls[i]) controlIdMap.set(c.id, newControls[i].id);
  });

  // 3. Vendors
  const srcVendors = await db.select().from(vendors).where(eq(vendors.clientId, LATORRE_CLIENT_ID));
  let insertedVendorIds: number[] = [];
  if (srcVendors.length > 0) {
    const inserted = await db
      .insert(vendors)
      .values(
        srcVendors.map((v) => ({
          clientId: newClientId,
          name: v.name,
          category: v.category,
          criticality: v.criticality,
          status: v.status,
        }))
      )
      .returning({ id: vendors.id });
    insertedVendorIds = inserted.map((v) => v.id);
  }

  // 4. Vendor assessments (remapped to the new vendor ids, position-matched)
  if (insertedVendorIds.length > 0) {
    const srcAssessments = await db
      .select()
      .from(vendorAssessments)
      .where(eq(vendorAssessments.clientId, LATORRE_CLIENT_ID));
    if (srcAssessments.length > 0) {
      await db.insert(vendorAssessments).values(
        srcAssessments.map((a, i) => ({
          clientId: newClientId,
          vendorId: insertedVendorIds[i % insertedVendorIds.length],
          type: a.type,
          status: a.status,
          score: a.score,
        }))
      );
    }
  }

  // 5. Evidence (clientControlId remapped to the new client's control rows)
  const srcEvidence = await db.select().from(evidence).where(eq(evidence.clientId, LATORRE_CLIENT_ID));
  const remappableEvidence = srcEvidence.filter((e) => e.clientControlId == null || controlIdMap.has(e.clientControlId));
  if (remappableEvidence.length > 0) {
    await db.insert(evidence).values(
      remappableEvidence.map((e) => ({
        clientId: newClientId,
        evidenceId: e.evidenceId,
        clientControlId:
          e.clientControlId == null ? e.clientControlId : controlIdMap.get(e.clientControlId)!,
        description: e.description,
        framework: e.framework,
        type: e.type,
        status: e.status,
        owner: e.owner,
      }))
    );
  }

  // 6. Incidents
  const srcIncidents = await db.select().from(incidents).where(eq(incidents.clientId, LATORRE_CLIENT_ID));
  if (srcIncidents.length > 0) {
    await db.insert(incidents).values(
      srcIncidents.map((i) => ({
        clientId: newClientId,
        title: i.title,
        description: i.description,
        severity: i.severity,
        status: i.status,
        detectedAt: i.detectedAt,
      }))
    );
  }

  // 7. Risk treatments
  const srcTreatments = await db
    .select()
    .from(riskTreatments)
    .where(eq(riskTreatments.clientId, LATORRE_CLIENT_ID));
  if (srcTreatments.length > 0) {
    await db.insert(riskTreatments).values(
      srcTreatments.map((t) => ({
        clientId: newClientId,
        riskScenarioId: t.riskScenarioId,
        treatmentType: t.treatmentType,
        strategy: t.strategy,
        status: t.status,
      }))
    );
  }

  // 8. Compliance certificates (certificateNumber suffixed to avoid collisions)
  const srcCerts = await db
    .select()
    .from(complianceCertificates)
    .where(eq(complianceCertificates.clientId, LATORRE_CLIENT_ID));
  if (srcCerts.length > 0) {
    await db.insert(complianceCertificates).values(
      srcCerts.map((c) => ({
        clientId: newClientId,
        frameworkId: c.frameworkId,
        status: c.status,
        certificateNumber: `${c.certificateNumber}-C${newClientId}`,
        issueDate: c.issueDate,
        expiryDate: c.expiryDate,
      }))
    );
  }

  console.log(`[LaTorreDemo] ✅ Client ${newClientId} provisioned with complete demo data`);
}

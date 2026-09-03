/**
 * LaTorre Demo Auto-Provisioning
 * 
 * When a new client signs up, this script copies the complete LaTorre LTD
 * demo dataset (frameworks, controls, vendors, evidence, incidents, policies)
 * into their new workspace.
 * 
 * Usage: Called automatically after client creation
 *   provisionLaTorreDemo(newClientId, dbConnection)
 */

import { getDb } from './db';
import { 
  clientFrameworks, clientControls, vendors, vendorAssessments,
  evidence, incidents, riskTreatments, complianceCertificates,
  assets, riskScenarios, clientPolicies
} from './schema';
import { eq, sql } from 'drizzle-orm';

const LATORRE_CLIENT_ID = 7;

export async function provisionLaTorreDemo(newClientId: number): Promise<void> {
  const db = await getDb();
  
  console.log(`[LaTorreDemo] Provisioning demo data for client ${newClientId}...`);
  
  // 1. Copy framework mappings
  await db.insert(clientFrameworks)
    .select(
      db.select({
        clientId: sql`${newClientId}::integer`,
        name: clientFrameworks.name,
        status: clientFrameworks.status,
      }).from(clientFrameworks).where(eq(clientFrameworks.clientId, LATORRE_CLIENT_ID))
    )
    .onConflictDoNothing();
  
  // 2. Copy client controls (map to same control_ids)
  await db.insert(clientControls)
    .select(
      db.select({
        clientId: sql`${newClientId}::integer`,
        controlId: clientControls.controlId,
        status: clientControls.status,
        owner: clientControls.owner,
      }).from(clientControls).where(eq(clientControls.clientId, LATORRE_CLIENT_ID))
    )
    .onConflictDoNothing();
  
  // 3. Copy vendors
  await db.insert(vendors)
    .select(
      db.select({
        clientId: sql`${newClientId}::integer`,
        name: vendors.name,
        category: vendors.category,
        criticality: vendors.criticality,
        status: vendors.status,
      }).from(vendors).where(eq(vendors.clientId, LATORRE_CLIENT_ID))
    )
    .onConflictDoNothing();
  
  // 4. Copy vendor assessments (for new vendor IDs)
  const newVendors = await db.select().from(vendors).where(eq(vendors.clientId, newClientId));
  const oldVendors = await db.select().from(vendors).where(eq(vendors.clientId, LATORRE_CLIENT_ID));
  
  for (let i = 0; i < oldVendors.length && i < newVendors.length; i++) {
    await db.insert(vendorAssessments)
      .select(
        db.select({
          clientId: sql`${newClientId}::integer`,
          vendorId: sql`${newVendors[i].id}::integer`,
          type: vendorAssessments.type,
          status: vendorAssessments.status,
          score: vendorAssessments.score,
        }).from(vendorAssessments).where(eq(vendorAssessments.vendorId, oldVendors[i].id))
      )
      .onConflictDoNothing();
  }
  
  // 5. Copy evidence
  await db.insert(evidence)
    .select(
      db.select({
        clientId: sql`${newClientId}::integer`,
        evidenceId: evidence.evidenceId,
        clientControlId: evidence.clientControlId,
        description: evidence.description,
        framework: evidence.framework,
        type: evidence.type,
        status: evidence.status,
        owner: evidence.owner,
      }).from(evidence).where(eq(evidence.clientId, LATORRE_CLIENT_ID))
    )
    .onConflictDoNothing();
  
  // 6. Copy incidents
  await db.insert(incidents)
    .select(
      db.select({
        clientId: sql`${newClientId}::integer`,
        title: incidents.title,
        description: incidents.description,
        severity: incidents.severity,
        status: incidents.status,
        detectedAt: incidents.detectedAt,
      }).from(incidents).where(eq(incidents.clientId, LATORRE_CLIENT_ID))
    )
    .onConflictDoNothing();
  
  // 7. Copy risk treatments
  await db.insert(riskTreatments)
    .select(
      db.select({
        clientId: sql`${newClientId}::integer`,
        riskScenarioId: riskTreatments.riskScenarioId,
        treatmentType: riskTreatments.treatmentType,
        strategy: riskTreatments.strategy,
        status: riskTreatments.status,
      }).from(riskTreatments).where(eq(riskTreatments.clientId, LATORRE_CLIENT_ID))
    )
    .onConflictDoNothing();
  
  // 8. Copy compliance certificates
  await db.insert(complianceCertificates)
    .select(
      db.select({
        clientId: sql`${newClientId}::integer`,
        frameworkId: complianceCertificates.frameworkId,
        status: complianceCertificates.status,
        certificateNumber: complianceCertificates.certificateNumber,
        issueDate: complianceCertificates.issueDate,
        expiryDate: complianceCertificates.expiryDate,
      }).from(complianceCertificates).where(eq(complianceCertificates.clientId, LATORRE_CLIENT_ID))
    )
    .onConflictDoNothing();
  
  console.log(`[LaTorreDemo] ✅ Client ${newClientId} provisioned with complete demo data`);
}

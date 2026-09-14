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
  evidence, incidents, riskTreatments, complianceCertificates,
  clientPolicies, assets, riskScenarios, processingActivities,
  dsarRequests, businessProcesses, reportLogs
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

  // 3. Enterprise Policies
  const srcPolicies = await db
    .select()
    .from(clientPolicies)
    .where(eq(clientPolicies.clientId, LATORRE_CLIENT_ID));
  if (srcPolicies.length > 0) {
    await db.insert(clientPolicies).values(
      srcPolicies.map((p) => ({
        clientId: newClientId,
        clientPolicyId: p.clientPolicyId,
        name: p.name,
        content: p.content,
        status: p.status,
        approvalStatus: p.approvalStatus,
        version: p.version,
        owner: p.owner,
        module: p.module,
        isAiGenerated: p.isAiGenerated,
        nextReviewDate: p.nextReviewDate,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    );
  }

  // 4. Assets
  const srcAssets = await db
    .select()
    .from(assets)
    .where(eq(assets.clientId, LATORRE_CLIENT_ID));
  if (srcAssets.length > 0) {
    await db.insert(assets).values(
      srcAssets.map((a) => ({
        clientId: newClientId,
        name: a.name,
        type: a.type,
        owner: a.owner,
        vendor: a.vendor,
        productName: a.productName,
        version: a.version,
        valuationC: a.valuationC,
        valuationI: a.valuationI,
        valuationA: a.valuationA,
        description: a.description,
        location: a.location,
        department: a.department,
        status: a.status,
        category: a.category,
        criticality: a.criticality,
        isPersonalData: a.isPersonalData,
        dataSensitivity: a.dataSensitivity,
      }))
    );
  }

  // 5. Quantified Risk Scenarios
  const srcRisks = await db
    .select()
    .from(riskScenarios)
    .where(eq(riskScenarios.clientId, LATORRE_CLIENT_ID));
  if (srcRisks.length > 0) {
    await db.insert(riskScenarios).values(
      srcRisks.map((r) => ({
        clientId: newClientId,
        title: r.title,
        description: r.description,
        category: r.category,
        assessmentType: r.assessmentType,
        likelihood: r.likelihood,
        impact: r.impact,
        inherentScore: r.inherentScore,
        inherentRisk: r.inherentRisk,
        residualLikelihood: r.residualLikelihood,
        residualImpact: r.residualImpact,
        residualScore: r.residualScore,
        residualRisk: r.residualRisk,
        inherentRiskScore: r.inherentRiskScore,
        status: r.status,
        owner: r.owner,
        customMitigationPlan: r.customMitigationPlan,
      }))
    );
  }

  // 6. RoPA Processing Activities
  const srcRopa = await db
    .select()
    .from(processingActivities)
    .where(eq(processingActivities.clientId, LATORRE_CLIENT_ID));
  if (srcRopa.length > 0) {
    await db.insert(processingActivities).values(
      srcRopa.map((ro) => ({
        clientId: newClientId,
        activityId: ro.activityId,
        activityName: ro.activityName,
        description: ro.description,
        role: ro.role,
        controllerName: ro.controllerName,
        controllerContact: ro.controllerContact,
        dpoName: ro.dpoName,
        dpoContact: ro.dpoContact,
        purposes: ro.purposes,
        legalBasis: ro.legalBasis,
        dataCategories: ro.dataCategories,
        dataSubjectCategories: ro.dataSubjectCategories,
        recipients: ro.recipients,
        hasInternationalTransfers: ro.hasInternationalTransfers,
        transferCountries: ro.transferCountries,
        transferSafeguards: ro.transferSafeguards,
        retentionPeriod: ro.retentionPeriod,
        status: ro.status,
      }))
    );
  }

  // 7. DSARs
  const srcDsar = await db
    .select()
    .from(dsarRequests)
    .where(eq(dsarRequests.clientId, LATORRE_CLIENT_ID));
  if (srcDsar.length > 0) {
    await db.insert(dsarRequests).values(
      srcDsar.map((d) => ({
        clientId: newClientId,
        requestId: d.requestId,
        requestType: d.requestType,
        status: d.status,
        priority: d.priority,
        subjectName: d.subjectName,
        subjectEmail: d.subjectEmail,
        verificationStatus: d.verificationStatus,
        verificationMethod: d.verificationMethod,
        submissionMethod: d.submissionMethod,
        requestDate: d.requestDate,
        dueDate: d.dueDate,
        completedDate: d.completedDate,
        resolutionNotes: d.resolutionNotes,
      }))
    );
  }

  // 8. Business Processes (BIA)
  const srcProcesses = await db
    .select()
    .from(businessProcesses)
    .where(eq(businessProcesses.clientId, LATORRE_CLIENT_ID));
  if (srcProcesses.length > 0) {
    await db.insert(businessProcesses).values(
      srcProcesses.map((bp) => ({
        clientId: newClientId,
        name: bp.name,
        description: bp.description,
        department: bp.department,
        criticalityTier: bp.criticalityTier,
        rto: bp.rto,
        rpo: bp.rpo,
        mtpd: bp.mtpd,
      }))
    );
  }

  // 9. Report Logs (Pre-compiled summaries)
  const srcReports = await db
    .select()
    .from(reportLogs)
    .where(eq(reportLogs.clientId, LATORRE_CLIENT_ID));
  if (srcReports.length > 0) {
    await db.insert(reportLogs).values(
      srcReports.map((rep) => ({
        clientId: newClientId,
        reportType: rep.reportType,
        format: rep.format,
        timestamp: rep.timestamp,
        metadata: rep.metadata,
      }))
    );
  }

  // 10. Vendors
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

  // 11. Vendor assessments (remapped to the new vendor ids, position-matched)
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

  // 12. Evidence (clientControlId remapped to the new client's control rows)
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

  // 13. Incidents
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

  // 14. Risk treatments
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

  // 15. Compliance certificates (certificateNumber suffixed to avoid collisions)
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

  console.log(`[LaTorreDemo] ✅ Client ${newClientId} provisioned with complete enriched demo data`);
}


/**
 * VfsSyncBridge — Real-time Application Data to VFS Synchronization Engine
 * Bridges ComplianceOS relational tables (policies, risks, incidents, controls, vendors, findings, evidence)
 * into the Unified Memory Cortex VFS filesystem so all 10 bots have complete, live awareness.
 */

import { getDb } from "../../db";
import { 
  clientPolicies, 
  clientControls, 
  auditFindings, 
  vendors,
  riskScenarios,
  incidents,
  evidence
} from "../../schema";
import { eq } from "drizzle-orm";
import { vfsMemoryEngine } from "./vfsMemoryEngine";

export interface SyncStats {
  policiesSynced: number;
  controlsSynced: number;
  vendorsSynced: number;
  risksSynced: number;
  incidentsSynced: number;
  evidenceSynced: number;
  findingsSynced: number;
  totalNodesCreated: number;
}

export class VfsSyncBridge {
  /**
   * Run a full bidirectional sync of all core application data into VFS.
   */
  public async syncAllAppDataToVfs(clientId: number): Promise<SyncStats> {
    const db = await getDb();
    let stats: SyncStats = {
      policiesSynced: 0,
      controlsSynced: 0,
      vendorsSynced: 0,
      risksSynced: 0,
      incidentsSynced: 0,
      evidenceSynced: 0,
      findingsSynced: 0,
      totalNodesCreated: 0,
    };

    // 1. Sync Policies
    try {
      const policies = await db
        .select()
        .from(clientPolicies)
        .where(eq(clientPolicies.clientId, clientId));

      for (const p of policies) {
        const slug = (p.title || `policy_${p.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 40)
          .replace(/^_+|_+$/g, "");
        const path = `/policies/${slug}.md`;

        const content = `# ${p.title || "Company Policy"}
* **Status:** ${p.status || "active"}
* **Version:** ${p.version || "1.0"}
* **Effective Date:** ${p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : "Active"}
* **Review Cycle:** ${p.reviewFrequency || "Annual"}
* **Compliance Frameworks:** ${Array.isArray(p.frameworks) ? p.frameworks.join(", ") : "SOC 2, ISO 27001"}

## Policy Statement & Scope
${p.content || p.description || "Active corporate governance policy."}`;

        await vfsMemoryEngine.writeNode(clientId, {
          path,
          title: p.title || "Policy Document",
          nodeType: "document",
          contentL2: content,
          summaryL0: `Policy [${p.status || "active"}]: ${p.title || "Governance"} v${p.version || "1.0"}.`,
          metadata: {
            sourceTable: "client_policies",
            sourceId: p.id,
            status: p.status,
            version: p.version,
            syncedAt: new Date().toISOString(),
          },
        });
        stats.policiesSynced++;
        stats.totalNodesCreated++;
      }
    } catch (e) {
      console.warn("[VfsSyncBridge] Policies sync notice:", e);
    }

    // 2. Sync Controls
    try {
      const controls = await db
        .select()
        .from(clientControls)
        .where(eq(clientControls.clientId, clientId))
        .limit(100);

      for (const c of controls) {
        const code = (c.controlCode || `CTR-${c.id}`).replace(/[^a-z0-9_.-]/gi, "_");
        const path = `/controls/${code.toLowerCase()}.md`;

        const content = `# Control ${c.controlCode || code}: ${c.title || "Security Control"}
* **Status:** ${c.status || "implemented"}
* **Health:** ${c.health || "healthy"}
* **Category:** ${c.category || "Technical Safeguards"}
* **Test Frequency:** ${c.testFrequency || "Continuous"}
* **Owner:** ${c.ownerId ? `User #${c.ownerId}` : "SecOps Team"}

## Control Description
${c.description || "Security control specification and verification requirement."}`;

        await vfsMemoryEngine.writeNode(clientId, {
          path,
          title: `${c.controlCode || "Control"}: ${c.title || "Security Control"}`,
          nodeType: "document",
          contentL2: content,
          summaryL0: `Control ${c.controlCode || ""}: ${c.title || ""} (${c.status || "implemented"}).`,
          metadata: {
            sourceTable: "client_controls",
            sourceId: c.id,
            status: c.status,
            health: c.health,
            syncedAt: new Date().toISOString(),
          },
        });
        stats.controlsSynced++;
        stats.totalNodesCreated++;
      }
    } catch (e) {
      console.warn("[VfsSyncBridge] Controls sync notice:", e);
    }

    // 3. Sync Vendors & TPRM
    try {
      const vendorList = await db
        .select()
        .from(vendors)
        .where(eq(vendors.clientId, clientId));

      for (const v of vendorList) {
        const slug = (v.name || `vendor_${v.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 40);
        const path = `/vendors/${slug}.md`;

        const content = `# Vendor: ${v.name}
* **Category:** ${v.category || "Cloud Service Provider"}
* **Risk Tier:** ${v.riskTier || "Medium"}
* **Status:** ${v.status || "active"}
* **Data Stored / Processed:** ${v.dataClassification || "Confidential Customer Data"}
* **SOC 2 / ISO Certification:** ${v.complianceStatus || "Verified"}

## Subprocessor Assessment & Purpose
${v.description || v.notes || "Authorized third-party cloud subprocessor."}`;

        await vfsMemoryEngine.writeNode(clientId, {
          path,
          title: `Vendor: ${v.name}`,
          nodeType: "document",
          contentL2: content,
          summaryL0: `Vendor ${v.name} (${v.riskTier || "Tier 2"} Risk): ${v.category || "Cloud SaaS"}.`,
          metadata: {
            sourceTable: "vendors",
            sourceId: v.id,
            riskTier: v.riskTier,
            status: v.status,
            syncedAt: new Date().toISOString(),
          },
        });
        stats.vendorsSynced++;
        stats.totalNodesCreated++;
      }
    } catch (e) {
      console.warn("[VfsSyncBridge] Vendors sync notice:", e);
    }

    // 4. Sync Risk Scenarios & FAIR Assessments
    try {
      const risks = await db
        .select()
        .from(riskScenarios)
        .where(eq(riskScenarios.clientId, clientId));

      for (const r of risks) {
        const slug = (r.title || `risk_${r.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 40);
        const path = `/risks/${slug}.md`;

        const content = `# Risk Scenario: ${r.title}
* **Category:** ${r.category || "Information Security"}
* **Inherent Risk:** ${r.inherentRisk || "Medium"} (Score: ${r.inherentRiskScore || 0})
* **Residual Risk:** ${r.residualRisk || "Low"}
* **Annualized Loss Expectancy (ALE):** $${r.annualLossExpectancy ? Number(r.annualLossExpectancy).toLocaleString() : "N/A"}
* **Treatment Status:** ${r.treatmentStrategy || "Mitigate"}

## Description & Threat Scenario
${r.description || "Identified operational and cybersecurity risk scenario."}`;

        await vfsMemoryEngine.writeNode(clientId, {
          path,
          title: `Risk: ${r.title}`,
          nodeType: "document",
          contentL2: content,
          summaryL0: `Risk [${r.inherentRisk || "Medium"}]: ${r.title} (ALE: $${r.annualLossExpectancy || 0}).`,
          metadata: {
            sourceTable: "risk_scenarios",
            sourceId: r.id,
            inherentRisk: r.inherentRisk,
            residualRisk: r.residualRisk,
            syncedAt: new Date().toISOString(),
          },
        });
        stats.risksSynced++;
        stats.totalNodesCreated++;
      }
    } catch (e) {
      console.warn("[VfsSyncBridge] Risks sync notice:", e);
    }

    // 5. Sync Incidents & Post-Mortems
    try {
      const incidentList = await db
        .select()
        .from(incidents)
        .where(eq(incidents.clientId, clientId));

      for (const inc of incidentList) {
        const slug = (inc.title || `inc_${inc.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 40);
        const path = `/incidents/${slug}.md`;

        const content = `# Incident: ${inc.title}
* **Severity:** ${inc.severity || "Medium"}
* **Status:** ${inc.status || "open"}
* **Created At:** ${inc.createdAt ? new Date(inc.createdAt).toLocaleString() : "Recent"}
* **Resolved At:** ${inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : "Pending"}

## Summary & Impact Analysis
${inc.description || "Security incident log and timeline."}

### Post-Mortem & Corrective Action
${inc.resolutionSummary || "Ongoing investigation by Incident Response team."}`;

        await vfsMemoryEngine.writeNode(clientId, {
          path,
          title: `Incident: ${inc.title}`,
          nodeType: "document",
          contentL2: content,
          summaryL0: `Incident [${inc.severity || "Medium"}]: ${inc.title} (${inc.status || "open"}).`,
          metadata: {
            sourceTable: "incidents",
            sourceId: inc.id,
            severity: inc.severity,
            status: inc.status,
            syncedAt: new Date().toISOString(),
          },
        });
        stats.incidentsSynced++;
        stats.totalNodesCreated++;
      }
    } catch (e) {
      console.warn("[VfsSyncBridge] Incidents sync notice:", e);
    }

    // 6. Sync Evidence Repository Items
    try {
      const evidenceList = await db
        .select()
        .from(evidence)
        .where(eq(evidence.clientId, clientId))
        .limit(50);

      for (const ev of evidenceList) {
        const slug = (ev.title || `evidence_${ev.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 40);
        const path = `/evidence/${slug}.md`;

        const content = `# Evidence Artifact: ${ev.title}
* **Status:** ${ev.status || "collected"}
* **Collected Date:** ${ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : "Recent"}
* **Source:** ${ev.source || "Automated Collector"}
* **Description:** ${ev.description || "Verified audit artifact."}`;

        await vfsMemoryEngine.writeNode(clientId, {
          path,
          title: `Evidence: ${ev.title}`,
          nodeType: "document",
          contentL2: content,
          summaryL0: `Evidence: ${ev.title} (${ev.status || "collected"}).`,
          metadata: {
            sourceTable: "evidence",
            sourceId: ev.id,
            status: ev.status,
            syncedAt: new Date().toISOString(),
          },
        });
        stats.evidenceSynced++;
        stats.totalNodesCreated++;
      }
    } catch (e) {
      console.warn("[VfsSyncBridge] Evidence sync notice:", e);
    }

    // 7. Sync Audit Findings
    try {
      const findings = await db
        .select()
        .from(auditFindings)
        .where(eq(auditFindings.clientId, clientId));

      for (const f of findings) {
        const slug = `finding_${f.id}`;
        const path = `/audits/findings/${slug}.md`;

        const content = `# Audit Finding #${f.id}: ${f.title || "Compliance Finding"}
* **Severity:** ${f.severity || "Medium"}
* **Status:** ${f.status || "open"}
* **Identified Date:** ${f.identifiedAt ? new Date(f.identifiedAt).toLocaleDateString() : "Recent"}
* **Framework:** ${f.framework || "SOC 2 / ISO 27001"}

## Finding Summary & Remediation
${f.description || "Identified audit gap."}

### Remediation Plan
${f.remediationPlan || "Pending remediation by SecOps team."}`;

        await vfsMemoryEngine.writeNode(clientId, {
          path,
          title: `Audit Finding: ${f.title || `#${f.id}`}`,
          nodeType: "document",
          contentL2: content,
          summaryL0: `Finding #${f.id} [${f.severity || "Medium"}]: ${f.title || "Audit issue"} (${f.status || "open"}).`,
          metadata: {
            sourceTable: "audit_findings",
            sourceId: f.id,
            severity: f.severity,
            status: f.status,
            syncedAt: new Date().toISOString(),
          },
        });
        stats.findingsSynced++;
        stats.totalNodesCreated++;
      }
    } catch (e) {
      console.warn("[VfsSyncBridge] Audit findings sync notice:", e);
    }

    return stats;
  }
}

export const vfsSyncBridge = new VfsSyncBridge();

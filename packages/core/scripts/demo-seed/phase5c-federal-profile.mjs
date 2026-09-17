/**
 * Phase 5c: Federal onboarding profiles for Apex (FedRAMP-Moderate, CMMC-L2).
 * These standards have no questionnaire in readiness-standards.ts, so we fill
 * the wizard fields (scope/stakeholders/docs/context/expectations) directly.
 */
import { Rng, log } from "./util.mjs";

export async function seedPhase5c(sql, clientId) {
  const rng = new Rng(8500 + clientId);

  const emps = await sql`SELECT first_name, last_name, department FROM employees WHERE client_id=${clientId}`;
  const byDept = {};
  for (const e of emps) {
    if (!byDept[e.department]) byDept[e.department] = `${e.first_name} ${e.last_name}`;
  }
  const deptHead = (d) => byDept[d] || "Unassigned";

  const scope = {
    orgBoundaries: "Apex Federal Solutions Inc. — ApexCloud Gov production environment (AWS GovCloud us-gov-east-1), CUI enclave (dedicated AD forest, VDI-only access), Arlington HQ SCIF. Corporate IT excluded from the FedRAMP authorization boundary but in scope for NIST 800-171/CMMC.",
    locations: "Arlington VA HQ incl. ICD-705 SCIF; warm DR site Ashburn colo; AWS GovCloud us-gov-east-1.",
    technologies: "AWS GovCloud (EKS, RDS, S3, KMS, CloudTrail), Splunk Enterprise Security, Tanium, Horizon VDI, FIPS 140-2 HSM-backed PKI, Atlassian Government Cloud, Deltek Costpoint, Microsoft 365 GCC.",
    outOfScope: "Corporate marketing website, non-federal commercial SaaS pilots, employee-owned devices (enclave access via VDI only).",
    fedramp_impact_level: "moderate",
    nist_tier: "tier3",
  };

  const stakeholders = {
    "Leadership / Sponsor": deptHead("Executive Leadership"),
    "IT / Engineering": deptHead("Engineering"),
    HR: deptHead("HR & Facilities"),
    "Legal / Compliance": deptHead("Security & Compliance"),
    "Security Lead": deptHead("Security & Compliance"),
    "Information System Security Officer (ISSO)": deptHead("Security & Compliance"),
    "Authorizing Official (AO)": deptHead("Executive Leadership"),
  };
  delete stakeholders["Legal / Compliance"];

  const existingDocs = {
    existingDocs: ["Information Security Policy", "Asset Inventory / Register", "Risk Methodology / Register", "Network Diagrams", "HR Onboarding Process", "Incident Response Plan", "Business Continuity Plan", "Vendor / Supplier List", "Access Control Plan"],
  };

  const context = {
    businessModel: "Federal IT services contractor: ApexCloud Gov (FedRAMP Moderate SaaS — managed identity, log analytics, secure file exchange) sold to 14 federal agencies; professional services by cleared staff handling CUI under DFARS 252.204-7012. New award eligibility depends directly on FedRAMP and CMMC status.",
    regulations: "FISMA, FedRAMP Rev 5 (NIST SP 800-53 Moderate baseline), DFARS 252.204-7012/7019/7020, NIST SP 800-171 Rev 2, FAR 52.204-21, CMMC 2.0 Level 2, Section 889 supply chain restrictions, ICD 705 physical security.",
    parties: "Federal agency customers (authorizing officials, ISSOs per program), CISA, DIBCAC assessors, prime contractors, FedRAMP PMO, cleared-workforce partners.",
  };

  const expectationsByStd = {
    "FedRAMP-Moderate": {
      goal: "Obtain FedRAMP Moderate authorization within 18 months via agency ATO path; complete full SSP Rev 5 conversion, POA&M closure below 15 open items at submission, and 3-month continuous monitoring demonstration before CAB review. Target readiness score ≥85%.",
    },
    "CMMC-L2": {
      goal: "Be CMMC Level 2 assessment-ready within 12 months: close all NIST 800-171 gaps, complete SPRS scoring with documented methodology, run mock assessment with external consultant, and achieve ≥88% score minimum before official DIBCAC assessment. Target score ≥90%.",
    },
  };

  const out = {};
  for (const stdId of ["FedRAMP-Moderate", "CMMC-L2"]) {
    const payload = {
      status: "in progress",
      current_step: String(rng.pick([5, 6])),
      scope_details: scope,
      stakeholders,
      existing_policies: existingDocs,
      business_context: context,
      maturity_expectations: expectationsByStd[stdId],
      updated_at: new Date(),
    };
    const existing = await sql`SELECT id FROM readiness_assessments WHERE client_id=${clientId} AND standard_id=${stdId}`;
    if (existing.length) {
      await sql`UPDATE readiness_assessments SET ${sql(payload)} WHERE id=${existing[0].id}`;
    } else {
      await sql`INSERT INTO readiness_assessments ${sql({
        client_id: clientId,
        name: stdId + " Readiness Assessment",
        standard_id: stdId,
        created_at: new Date(),
        ...payload,
      })}`;
    }
    out[stdId] = "profiled";
  }

  // Also fix step numbers on SOC2 to be consistent (7 = summary reached)
  await sql`UPDATE readiness_assessments SET current_step='7' WHERE client_id=${clientId} AND standard_id='SOC2'`;

  log(`phase5c:`, JSON.stringify(out));
  return out;
}

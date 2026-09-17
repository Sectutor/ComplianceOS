/**
 * Phase 5b: Complete the client onboarding / readiness wizard profile.
 * Fills all 7 steps with realistic, tenant-specific business data:
 *   Step1 Scope (org boundaries, locations, technologies, out-of-scope)
 *   Step2 Stakeholders (role owners per department head)
 *   Step3 Existing docs (checkboxes)
 *   Step4 Business context (business model, regulations, interested parties)
 *   Step5 Expectations (goal)
 *   Step6 Self-assessment questionnaire (answers + comments per question ID,
 *          ~75% "yes" to match demo maturity)
 */
import { Rng, bulkInsert, log } from "./util.mjs";
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FW_DIR = path.resolve(__dirname, "../../src/data");

/** Extract questionnaire question ids+sections from readiness-standards.ts for a standard. */
function extractQuestions(standardId) {
  const src = fs.readFileSync(path.join(FW_DIR, "readiness-standards.ts"), "utf8");
  const order = ["ISO27001", "SOC2", "HIPAA", "GDPR", "NISTCSF"];
  const a = src.indexOf(`"${standardId}"`);
  if (a < 0) return [];
  const idx = order.indexOf(standardId);
  const b = idx >= 0 && idx + 1 < order.length ? src.indexOf(`"${order[idx + 1]}"`, a) : -1;
  const block = src.slice(a, b > 0 ? b : undefined);
  const qs = [...block.matchAll(/id:\s*"([\d.]+)",\s*text:\s*"((?:[^"\\]|\\.)*)"/g)]
    .map(m => ({ id: m[1], text: m[2] }));
  return qs;
}

export async function seedPhase5b(sql, clientId, slug) {
  const rng = new Rng(8000 + clientId);
  const out = {};
  const isEU = slug === "nordwind";

  const emps = await sql`SELECT first_name, last_name, department FROM employees WHERE client_id=${clientId}`;
  const byDept = {};
  for (const e of emps) {
    if (!byDept[e.department]) byDept[e.department] = `${e.first_name} ${e.last_name}`;
  }
  const deptHead = (d) => byDept[d] || "Unassigned";

  // ---------- step payloads ----------
  const scope = isEU ? {
    orgBoundaries: "Nordwind Logistics GmbH legal entity including subsidiaries Nordwind Benelux BV (Rotterdam) and Nordwind Nord GmbH (Hamburg). Excludes JV company Kühne-Nord Speditionsgesellschaft.",
    locations: "HQ & primary DC Munich (Landsberger Str. 302); cross-dock warehouses Hamburg and Rotterdam; 140 trucks operating DACH-Benelux routes.",
    technologies: "AWS eu-central-1 (CargoTrack TMS, Aurora PostgreSQL), Microsoft 365 E5 (Exchange Online, SharePoint, Teams), on-prem VMware cluster DC-1 (SAP S/4HANA, AD, WMS), GitLab CE, Fortinet perimeter, CrowdStrike Falcon, Veeam+Wasabi backup.",
    outOfScope: "Marketing website (shared hosting, public content only), guest Wi-Fi at warehouse visitor areas, personal devices under BYOD without corporate data access.",
    iso27001_legitimate_interests_assessment: "Completed — documented in risk register context section",
    gdpr_role: "controller",
  } : {
    orgBoundaries: "Apex Federal Solutions Inc. — ApexCloud Gov production environment (AWS GovCloud us-gov-east-1), CUI enclave (dedicated AD forest, VDI-only access), Arlington HQ SCIF. Corporate IT explicitly excluded from the authorization boundary but in scope for NIST 800-171.",
    locations: "Arlington VA HQ incl. ICD-705 SCIF; warm DR site Ashburn colo; AWS GovCloud us-gov-east-1 regions.",
    technologies: "AWS GovCloud (EKS, RDS, S3, KMS, CloudTrail), Splunk Enterprise Security, Tanium, Horizon VDI, FIPS 140-2 HSM-backed PKI, Atlassian Government Cloud, Deltek Costpoint, Microsoft 365 GCC.",
    outOfScope: "Corporate marketing website, non-federal commercial SaaS pilots, employee-owned devices (enclave access via VDI only).",
    fedramp_impact_level: "moderate",
    nist_tier: "tier3",
  };

  const stakeholders = isEU ? {
    "Leadership / Sponsor": deptHead("Executive Leadership"),
    "IT / Engineering": deptHead("IT Operations"),
    HR: deptHead("Human Resources"),
    "Legal / Compliance": deptHead("Legal & Compliance"),
    "Security Lead": deptHead("Information Security"),
    "Operations": deptHead("Warehouse & Fleet Operations"),
  } : {
    "Leadership / Sponsor": deptHead("Executive Leadership"),
    "IT / Engineering": deptHead("Engineering"),
    HR: deptHead("HR & Facilities"),
    "Legal / Compliance": deptHead("Security & Compliance"),
    "Security Lead": deptHead("Security & Compliance"),
    "Program Management": deptHead("Program Management"),
    "Contracts / Finance": deptHead("Finance & Contracts"),
  };
  // normalize keys used by UI roles
  stakeholders["Security Lead"] = stakeholders["Security Lead"] || stakeholders["Security & Compliance"];
  delete stakeholders["Program Management"];
  delete stakeholders["Contracts / Finance"];

  const existingDocs = isEU
    ? ["Information Security Policy", "Asset Inventory / Register", "Risk Methodology / Register", "HR Onboarding Process", "Incident Response Plan", "Business Continuity Plan", "Vendor / Supplier List", "Access Control Policy"]
    : ["Information Security Policy", "Asset Inventory / Register", "Risk Methodology / Register", "Network Diagrams", "HR Onboarding Process", "Incident Response Plan", "Business Continuity Plan", "Vendor / Supplier List", "Access Control Policy"];

  const context = isEU ? {
    businessModel: "B2B freight-tech: we operate CargoTrack (transport management SaaS) plus physical logistics services — warehousing, cross-docking and road freight — for 400+ retail/e-commerce customers. Revenue depends on platform availability during fulfilment peaks; customer master data, consignee PII and pricing data are crown jewels.",
    regulations: "GDPR, German BDSG, NIS2 (as important entity), EU AI Act (limited/high-risk systems in use), Dutch Uitvoeringswet GDPR for Rotterdam entity, commercial law retention (HGB/AO).",
    parties: "Retail customers (contractual security requirements in MSAs), insurances, supervisory authorities (BayLDA, Autoriteit Persoonsgegevens), BSI, works council, logistics partners/subcontractors, investors.",
  } : {
    businessModel: "Federal IT services contractor: ApexCloud Gov (FedRAMP Moderate SaaS for identity, log analytics, secure file exchange) sold via agency contracts; professional services delivered by cleared staff handling CUI under DFARS 252.204-7012. Contract awards depend on authorization status (FedRAMP, soon CMMC L2).",
    regulations: "FISMA, FedRAMP Rev 5 baselines, DFARS 252.204-7012/7019/7020, NIST SP 800-171, FAR 52.204-21, CMMC 2.0 L2 (upcoming contract requirement), Section 889, ICD 705 for SCIF operations.",
    parties: "Federal agency customers (AOs and ISSOs per program), CISA, DIBCAC (CMMC assessment), prime contractors, cyber insurance carrier, cleared personnel pipeline partners.",
  };

  const expectations = {
    goal: isEU
      ? "Achieve ISO 27001:2022 certification within 12 months (stage-1 audit booked); maintain GDPR accountability posture; reach NIS2 'important entity' full compliance before national implementation deadline. Target compliance score ≥90%."
      : "Obtain FedRAMP Moderate authorization (JAB-agency path) within 18 months; pass NIST 800-171 self-assessment with scoring methodology documented; be assessment-ready for CMMC L2 when contract clauses trigger. Target score ≥85%.",
  };

  // questionnaire answers (~75% yes to match maturity)
  const standards = isEU ? ["ISO27001", "GDPR"] : ["SOC2"];
  const qRows = [];
  for (const std of standards) {
    const questions = extractQuestions(std);
    if (!questions.length) { log(`${std}: no questions found, skipping`); continue; }
    const answers = {};
    for (const q of questions) {
      const roll = rng.weighted([["yes", 62], ["partial", 13], ["no", 25]]);
      let answer = roll === "yes" ? "yes" : "no";
      let comment = null;
      if (roll === "yes") {
        comment = rng.pick([
          "Implemented and evidenced; artifacts linked in evidence repository.",
          "Documented procedure exists; last review passed internal check.",
          "Operating effectively per latest control assessment.",
        ]);
      } else if (roll === "partial") {
        answer = "no";
        comment = rng.pick([
          "Partially implemented — rollout tracked in governance queue with target date.",
          "Policy approved but operational adoption still completing across teams.",
        ]);
      } else {
        comment = rng.pick([
          "Not yet implemented; identified as gap in readiness assessment and planned in roadmap.",
          "Gap acknowledged; treatment planned this quarter.",
        ]);
      }
      answers[q.id] = { answer, comment };
      qRows.push({
        client_id: clientId,
        regulation_id: std,
        question_id: q.id,
        response: answer,
      });
    }
  }
  await sql`DELETE FROM client_readiness_responses WHERE client_id=${clientId} AND regulation_id IN ${sql(standards.length === 1 ? [standards[0]] : standards)}`;
  out.questionnaire_answers = await bulkInsert(sql, "client_readiness_responses",
    ["client_id","regulation_id","question_id","response"], qRows);

  // ---------- upsert readiness_assessments with full profile ----------
  const stdIds = isEU ? ["ISO27001", "GDPR"] : ["SOC2"];
  for (const stdId of stdIds) {
    const payload = {
      status: "in_progress",
      current_step: "7",
      scope_details: scope,
      stakeholders,
      existing_policies: { existingDocs },
      business_context: context,
      maturity_expectations: expectations,
      updated_at: new Date(),
    };
    const existing = await sql`SELECT id FROM readiness_assessments WHERE client_id=${clientId} AND standard_id=${stdId}`;
    if (existing.length) {
      const { status, ...rest } = payload;
      await sql`UPDATE readiness_assessments SET ${sql({ ...rest, status: "in progress" })} WHERE id=${existing[0].id}`;
    } else {
      await sql`INSERT INTO readiness_assessments ${sql({ client_id: clientId, name: stdId + " Readiness Assessment", standard_id: stdId, created_at: new Date(), ...payload, status: "in progress" })}`;
    }
    out[stdId] = "profiled";
  }

  log(`phase5b:`, JSON.stringify(out));
  return out;
}

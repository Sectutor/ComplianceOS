/**
 * Phase 3: Controls (global library from static catalogs -> client controls w/ SoA states),
 * policies (versioned, approval workflow) and employee acknowledgments.
 */
import { Rng, bulkInsert, agoDays, daysFromNow, log } from "./util.mjs";
import { loadFramework, loadNist800171 } from "./framework-catalogs.mjs";

const ISO_THEMES = {
  Organizational: "A.5", People: "A.6", Physical: "A.7", Technological: "A.8",
};

const POLICY_CATALOG = [
  // [name, module, ownerRole]
  ["Information Security Policy", "general", "CISO"],
  ["Acceptable Use Policy", "general", "IT Operations"],
  ["Access Control Policy", "general", "Information Security"],
  ["Remote Work Policy", "general", "Information Security"],
  ["Cryptography & Key Management Policy", "general", "Information Security"],
  ["Change Management Policy", "general", "Software Engineering"],
  ["Incident Response Policy", "general", "Information Security"],
  ["Backup & Recovery Policy", "general", "IT Operations"],
  ["Logging & Monitoring Policy", "general", "Security Operations"],
  ["Vulnerability Management Policy", "general", "Security Operations"],
  ["Secure Development Policy", "general", "Software Engineering"],
  ["Supplier Security Policy", "general", "Legal & Compliance"],
  ["Asset Management Policy", "general", "IT Operations"],
  ["Data Classification & Handling Policy", "general", "Information Security"],
  ["Physical & Environmental Security Policy", "general", "Facilities"],
  ["Clear Desk & Clear Screen Policy", "general", "Information Security"],
  ["Business Continuity Policy", "general", "Executive Leadership"],
  ["HR Security & Screening Policy", "general", "Human Resources"],
  ["Security Awareness & Training Policy", "general", "Human Resources"],
  ["Risk Management Policy", "general", "Executive Leadership"],
  ["Privacy Policy (External)", "privacy", "Legal & Compliance"],
  ["Records of Processing (ROPA) Procedure", "privacy", "Legal & Compliance"],
  ["Data Subject Rights Procedure", "privacy", "Legal & Compliance"],
  ["Data Breach Notification Procedure", "privacy", "Legal & Compliance"],
  ["Retention & Deletion Schedule", "privacy", "Legal & Compliance"],
];

function policyBody(name, tenantName, ownerRole) {
  return `# ${name}

**Organization:** ${tenantName}
**Owner:** ${ownerRole}
**Classification:** Internal
**Review cycle:** Annual

## 1. Purpose
This ${name.toLowerCase()} defines the mandatory requirements, responsibilities and control expectations for all personnel, contractors and third parties acting on behalf of ${tenantName}. It supports the organization's Information Security Management System and applicable regulatory obligations.

## 2. Scope
Applies to all information systems, data, facilities and personnel operated by or on behalf of ${tenantName}, including cloud services and remote work arrangements.

## 3. Policy Statements
3.1 Responsibilities for implementing this policy are assigned per the RACI matrix maintained in the GRC platform.
3.2 Deviations require documented risk acceptance approved by the CISO (or delegate).
3.3 Compliance is verified through scheduled control assessments and internal audits.
3.4 Violations may result in disciplinary action per HR policy.
3.5 This policy is reviewed at least annually or upon significant change.

## 4. Roles & Responsibilities
- **Process Owner (${ownerRole}):** maintains the policy, ensures operational alignment.
- **CISO:** approves exceptions; owns the ISMS framework.
- **All Staff:** acknowledge annually; report suspected violations immediately.
- **Internal Audit:** independent verification of effectiveness.

## 5. Related Documents
Risk register entries linked in the GRC platform; evidence artifacts under the associated Annex A / family controls; incident response runbooks.

## 6. Version History
Maintained automatically via the policy management workflow (see version metadata).`;
}

export async function seedPhase3(sql, clientId, slug) {
  const rng = new Rng(5000 + clientId);
  const out = {};
  const emps = await sql`SELECT id, first_name, last_name, email FROM employees WHERE client_id = ${clientId}`;
  const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };
  const tenantName = slug === "nordwind" ? "Nordwind Logistics GmbH" : "Apex Federal Solutions Inc.";

  // --- which frameworks apply ---
  const fwMap = slug === "nordwind"
    ? [["ISO27001", "ISO 27001"], ["SOC2", "SOC 2"], ["NIS2", "NIS2"]]
    : [["FEDRAMP", "FedRAMP"], ["SOC2", "SOC 2"]];
  // Apex also gets 800-171
  const catalogs = [];
  for (const [key, label] of fwMap) {
    const [file, cn] = Object.entries({ ISO27001: ["iso27001.ts","iso27001Controls"], SOC2: ["soc2.ts","soc2Controls"], NIS2: ["nis2.ts","NIS2_CONTROLS"], FEDRAMP: ["fedramp.ts","FEDRAMP_CONTROLS"] }).find(([k]) => k === key)[1];
    catalogs.push([label, loadFramework(file, cn)]);
  }
  if (slug === "apex") catalogs.push(["NIST 800-171", loadNist800171()]);

  // --- global controls: insert if missing (client_id null), keyed by controlId+framework ---
  let totalClient = 0;
  const clientControlIdsByLabel = {};

  for (const [fwLabel, catalog] of catalogs) {
    // dedupe against existing globals
    const existing = await sql`SELECT id, control_id FROM controls WHERE framework = ${fwLabel}`;
    const byControlId = new Map(existing.map(e => [e.control_id, e.id]));
    const newGlobals = [];
    for (const c of catalog) {
      const cid = c.controlId || c.id;
      if (!byControlId.has(cid)) {
        newGlobals.push({
          control_id: cid,
          name: (c.name || cid).slice(0, 250),
          description: c.description || "",
          framework: fwLabel,
          category: c.theme ? `${c.theme} (${ISO_THEMES[c.theme] || ""})` : (c.family || c.category || null),
          status: "active",
          version: 1,
        });
      }
    }
    if (newGlobals.length) {
      await bulkInsert(sql, "controls",
        ["control_id","name","description","framework","category","status","version"], newGlobals);
    }
    // refresh map
    const all = await sql`SELECT id, control_id FROM controls WHERE framework = ${fwLabel}`;
    const finalMap = new Map(all.map(e => [e.control_id, e.id]));

    // --- client controls (SoA rows) ---
    const existingCC = await sql`SELECT control_id FROM client_controls WHERE client_id = ${clientId}`;
    const haveSet = new Set(existingCC.map(r => r.control_id));
    const ccRows = [];
    for (const c of catalog) {
      const gid = finalMap.get(c.controlId || c.id);
      if (!gid || haveSet.has(gid)) continue;
      // ~75% maturity distribution
      const roll = rng.next();
      let status;
      if (roll < 0.55) status = "implemented";
      else if (roll < 0.75) status = "in_progress";
      else if (roll < 0.92) status = "not_implemented";
      else status = "not_applicable";
      const applicable = status !== "not_applicable";
      ccRows.push({
        client_id: clientId,
        control_id: gid,
        client_control_id: c.controlId || c.id,
        custom_description: null,
        owner: empName(),
        status,
        applicability: applicable ? "applicable" : "not_applicable",
        justification: !applicable
          ? `Not applicable: control requirement is not relevant to ${tenantName}'s scope of operations; exclusion assessed and documented during gap analysis.`
          : null,
        implementation_notes: status === "implemented"
          ? "Control implemented and operating effectively; evidence collected and verified."
          : status === "in_progress"
          ? "Implementation underway; target completion tracked in governance queue."
          : null,
        evidence_location: status === "implemented" ? `GRC Evidence Repository — ${fwLabel}/${(c.controlId||c.id)} folder` : null,
        implementation_date: status === "implemented" ? agoDays(rng.int(30, 400)) : null,
        created_at: agoDays(rng.int(100, 400)),
        updated_at: agoDays(rng.int(0, 30)),
      });
    }
    await bulkInsert(sql, "client_controls",
      ["client_id","control_id","client_control_id","custom_description","owner","status","applicability","justification","implementation_notes","evidence_location","implementation_date","created_at","updated_at"], ccRows);
    clientControlIdsByLabel[fwLabel] = ccRows.length;
    totalClient += ccRows.length;

    // --- link risks to ISO controls via treatment_controls where present ---
  }
  out.client_controls_total = totalClient;
  out.per_framework = clientControlIdsByLabel;

  // --- policies ---
  const existingPolicies = await sql`SELECT id FROM client_policies WHERE client_id=${clientId} LIMIT 1`;
  if (!existingPolicies.length) {
    const polRows = POLICY_CATALOG.map(([name, module, ownerRole], i) => {
      const roll = rng.next();
      let status, approval_status, version;
      if (roll < 0.6) { status = "approved"; approval_status = "approved"; version = rng.int(2, 4); }
      else if (roll < 0.75) { status = "review"; approval_status = "pending"; version = rng.int(2, 3); }
      else if (roll < 0.95) { status = "draft"; approval_status = "draft"; version = 1; }
      else { status = "approved"; approval_status = "approved"; version = rng.int(1, 2); }
      return {
        client_id: clientId,
        template_id: null,
        client_policy_id: `POL-${String(i + 1).padStart(3, "0")}`,
        name,
        content: policyBody(name, tenantName, ownerRole),
        status,
        version,
        owner: empName(),
        module,
        is_ai_generated: false,
        reviewers: JSON.stringify([]),
        review_due_date: daysFromNow(rng.int(-15, 200)),
        approval_status,
        next_review_date: daysFromNow(rng.int(30, 365)),
        created_at: agoDays(rng.int(90, 600)),
        updated_at: agoDays(rng.int(0, 45)),
      };
    });
    await bulkInsert(sql, "client_policies",
      ["client_id","template_id","client_policy_id","name","content","status","version","owner","module","is_ai_generated","reviewers","review_due_date","approval_status","next_review_date","created_at","updated_at"], polRows);
    out.policies = polRows.length;
  }

  // --- acknowledgments (only for approved policies; ~70% acknowledged) ---
  const pols = await sql`SELECT id, name, version, status FROM client_policies WHERE client_id=${clientId} AND status='approved'`;
  const ackRows = [];
  for (const p of pols) {
    for (const e of emps) {
      const roll = rng.weighted([["acknowledged", 65], ["pending", 25], ["declined", 2], ["skip", 8]]);
      if (roll === "skip") continue;
      ackRows.push({
        client_id: clientId,
        policy_id: p.id,
        employee_email: e.email,
        employee_name: `${e.first_name} ${e.last_name}`,
        version: String(p.version ?? 1),
        status: roll,
        ip_address: roll === "acknowledged" ? `10.${rng.int(0,40)}.${rng.int(0,255)}.${rng.int(2,254)}` : null,
        signed_at: roll === "acknowledged" ? agoDays(rng.int(1, 120)) : null,
      });
    }
  }
  out.acknowledgments = await bulkInsert(sql, "policy_acknowledgments",
    ["client_id","policy_id","employee_email","employee_name","version","status","ip_address","signed_at"], ackRows);

  // --- control assessments as work_items already exist in phase1; add assessment outcomes table? (control_test_runs exists)
  log(`phase3:`, JSON.stringify(out));
  return out;
}

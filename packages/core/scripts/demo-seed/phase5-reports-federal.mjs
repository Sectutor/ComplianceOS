/**
 * Phase 5: readiness assessments, risk appetite, and federal artifacts
 * (FISMA systems, SSP, POA&M, RMF workflow) for the US tenant.
 */
import { Rng, bulkInsert, agoDays, daysFromNow, log } from "./util.mjs";

export async function seedPhase5(sql, clientId, slug) {
  const rng = new Rng(7000 + clientId);
  const out = {};
  const userIds = (await sql`SELECT user_id FROM user_clients WHERE client_id=${clientId}`).map(r => r.user_id);
  const isEU = slug === "nordwind";

  // --- readiness assessments ---
  const standards = isEU ? [["ISO27001", 8], ["GDPR", 6]] : [["FedRAMP-Moderate", 10], ["CMMC-L2", 9]];
  const raRows = standards.map(([std, steps]) => ({
    client_id: clientId,
    name: `${std} Readiness Assessment`,
    status: rng.weighted([["in_progress", 70], ["completed", 30]]),
    current_step: String(rng.int(Math.floor(steps * 0.6), steps)),
    scope_details: isEU
      ? "Munich HQ, Hamburg & Rotterdam sites; CargoTrack platform, WMS, corporate IT. Excludes subsidiary JV entities."
      : "ApexCloud Gov production boundary (GovCloud us-gov-east-1), CUI enclave, SCIF. Corporate IT excluded from FedRAMP boundary.",
    stakeholders: JSON.stringify(isEU
      ? ["Katrin Hoffmann (CEO)", "Rafael Ostermann (CISO)", "Dr. Amelie Brandt (DPO)", "Tobias Krüger (IT Ops)"]
      : ["Patricia Reynolds (CEO)", "Marcus Bell (CISO)", "Steven Hall (Cloud Ops)", "Karen Foster (PMO)"]),
    existing_policies: "25 policies under management in GRC platform; ISMS policy suite approved.",
    business_context: isEU
      ? "Freight-tech logistics provider pursuing certification ahead of customer mandate deadlines."
      : "Federal contractor preparing for FedRAMP Moderate authorization and CMMC L2 assessment required by contract clauses.",
    maturity_expectations: "Level 3 (defined) across all domains within 12 months.",
    standard_id: std,
    created_at: agoDays(rng.int(60, 300)),
    updated_at: agoDays(rng.int(0, 14)),
  }));
  out.readiness = await bulkInsert(sql, "readiness_assessments",
    ["client_id","name","status","current_step","scope_details","stakeholders","existing_policies","business_context","maturity_expectations","standard_id","created_at","updated_at"], raRows);

  // --- risk appetite ---
  await sql`DELETE FROM risk_appetite WHERE client_id=${clientId}`;
  await sql`
    INSERT INTO risk_appetite (client_id, financial_threshold, reputational_threshold, operational_threshold, overall_risk_level)
    VALUES (${clientId}, ${isEU ? 250000 : 500000}, ${isEU ? 3 : 2}, ${isEU ? 2 : 3}, ${isEU ? "medium" : "moderate"})`;
  out.risk_appetite = 1;

  if (!isEU) {
    // ============ FEDERAL ARTIFACTS ============
    // FISMA system
    const [fisma] = await sql`
      INSERT INTO federal_fisma_systems (client_id, name, fips_199_overall, description, status, acronym, owner)
      VALUES (${clientId}, 'ApexCloud Gov Platform', 'Moderate',
        'Multi-tenant SaaS providing managed identity, log analytics and secure file exchange to federal agencies. Authorization boundary includes AWS GovCloud infrastructure, CUI enclave and management plane.',
        'operating', 'ACG', 'Marcus Bell')
      RETURNING id`;

    // SSP
    await bulkInsert(sql, "federal_ssps",
      ["client_id","title","framework","system_name","system_type","boundary_description","responsible_role","status","version","content","fisma_system_id"],
      [{
        client_id: clientId,
        title: "System Security Plan — ApexCloud Gov",
        framework: "NIST SP 800-53 Rev 5 (FedRAMP Moderate baseline)",
        system_name: "ApexCloud Gov Platform",
        system_type: "major_application",
        boundary_description: "Physical: AWS GovCloud us-gov-east-1 facilities + Arlington SCIF. Logical: VPC perimeter, CUI enclave forest, control plane.",
        responsible_role: "ISSM (Marcus Bell)",
        status: "draft_pending_ao_approval",
        version: 4,
        content: "# System Security Plan\n\nFull control-by-control narrative per NIST 800-53 rev.5 Moderate baseline maintained in the GRC platform; control implementations reference client_controls records and evidence packages.",
        fisma_system_id: fisma.id,
      }]);
    out.ssp = 1;

    // POA&M items
    const POAMS = [
      ["POA&M-001: AC-2(3) inactive account disposition automation", "open"],
      ["POA&M-002: SIEM coverage gap — two decommissioning VMs", "open"],
      ["POA&M-003: CA-7 continuous monitoring metrics dashboard incomplete", "in_progress"],
      ["POA&M-004: IR-8 incident response plan signature pending AO", "in_progress"],
      ["POA&M-005: SC-28 protection of CUI at rest on legacy tape archive", "open"],
      ["POA&M-006: RA-5 vulnerability scanning SLA extension for enclave STIG backlog", "closed"],
    ];
    await bulkInsert(sql, "federal_poams",
      ["client_id","title","source_ssp_id","status","fisma_system_id"],
      POAMS.map(([title, status]) => ({
        client_id: clientId, title, source_ssp_id: null, status: status === "in_progress" ? "open" : status, fisma_system_id: fisma.id,
      })));
    out.poams = POAMS.length;

    // RMF workflow
    await bulkInsert(sql, "federal_rmf_workflows",
      ["client_id","system_name","current_step","step_status","fisma_system_id"],
      [{
        client_id: clientId,
        system_name: "ApexCloud Gov Platform",
        current_step: String(rng.pick([4, 5])), // assess / authorize
        step_status: "in_progress",
        fisma_system_id: fisma.id,
      }]);
    out.rmf = 1;

    // FIPS 199 categorization recorded on system + a few more fed rows skipped until UI verified
  }

  // --- link controls to treatments via treatment_controls (both tenants) ---
  try {
    const isoCC = await sql`
      SELECT cc.id FROM client_controls cc JOIN controls c ON c.id=cc.control_id
      WHERE cc.client_id=${clientId} AND cc.status='implemented' LIMIT 60`;
    const treats = await sql`SELECT id FROM risk_treatments WHERE client_id=${clientId} LIMIT 80`;
    const tcRows = [];
    for (const t of treats) {
      const n = rng.int(1, 3);
      const picks = [];
      for (let i = 0; i < n; i++) {
        const cc = rng.pick(isoCC);
        if (cc && !picks.includes(cc.id)) picks.push(cc.id);
      }
      for (const cid of picks) {
        tcRows.push({
          client_id: clientId,
          treatment_id: t.id,
          control_id: cid,
          effectiveness: rng.weighted([["effective", 55], ["partially_effective", 30], ["ineffective", 15]]),
          notes: "Linked as part of risk treatment mapping.",
        });
      }
    }
    out.risk_control_links = await bulkInsert(sql, "treatment_controls",
      ["client_id","treatment_id","control_id","effectiveness","notes"], tcRows);
  } catch (e) {
    log("treatment_controls link skipped:", e.message.slice(0, 100));
  }

  log(`phase5:`, JSON.stringify(out));
  return out;
}

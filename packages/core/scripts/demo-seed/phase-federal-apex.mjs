/**
 * Seed Apex Federal Solutions (client 789) federal demo data:
 *  - SSP controls for SSP 11 (FedRAMP Moderate baseline, ~62% implemented)
 *  - POA&M items under the existing 6-7 POA&Ms
 *  - 1 SAR (assessment) with findings linked to SSP controls
 *  - SAR findings -> POA&M linkage via source_identifier
 *  - 1 SPRS assessment (NIST 800-171 deduction score)
 *  - Control inheritances from a mock AWS GovCloud FedRAMP Moderate package
 * Idempotent: wipes and re-seeds Apex federal rows only.
 */
import postgres from "postgres";
import fs from "fs";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const CLIENT = 789;
const SSP = 11;
const FISMA = 9;
const log = (...a) => console.log(...a);

// ── 0. FedRAMP Moderate package (mock CSP inheritance source) ──────────────
await sql`DELETE FROM federal_inheritances WHERE client_id=${CLIENT}`;
await sql`DELETE FROM federal_fedramp_packages WHERE client_id=${CLIENT} AND title LIKE 'AWS GovCloud (US) FedRAMP%'`;
const pkg = await sql`
  INSERT INTO federal_fedramp_packages (client_id, title, impact_level, authorization_type, agency_name, provisioning_status)
  VALUES (${CLIENT}, 'AWS GovCloud (US) FedRAMP Moderate P-ACG Package', 'moderate', 'agency', 'Department of Defense', 'ready')
  RETURNING id`;
const pkgId = pkg[0].id;

// Inherited controls — typical for AWS GovCloud Moderate inheritors
const inherited = [
  ["AC-2","Inherited from AWS IAM — account management primitives"],
  ["AU-4","Inherited — audit log storage capacity (S3/CloudTrail)"],
  ["CA-3","Inherited — information exchange boundaries (VPC endpoints)"],
  ["CM-2","Inherited — baseline configuration via hardened AMIs"],
  ["CP-9","Inherited — system backup (RDS automated backups)"],
  ["IA-2(1)","Inherited — multifactor auth (GovCloud root + IAM MFA)"],
  ["IR-4","Inherited — incident handling infrastructure (AWS Abuse/security contacts)"],
  ["PE-*","Fully inherited — physical & environmental protections (AWS data centers)"],
  ["SC-7","Inherited — boundary protection base (Security Groups, Network Firewall)"],
  ["SI-4","Inherited — system monitoring infrastructure (GuardDuty, CloudTrail)"],
];
const inhRows = [];
for (const r of inherited) {
  const row = await sql`
    INSERT INTO federal_inheritances (client_id, package_id, partner_name, control_id, description, status, fisma_system_id)
    VALUES (${CLIENT}, ${pkgId}, 'Amazon Web Services (AWS GovCloud)', ${r[0]}, ${r[1]}, 'accepted', ${FISMA})
    RETURNING id`;
  inhRows.push(row[0].id);
}
log(`inheritances: ${inhRows.length}`);

// ── 1. SSP controls for SSP 11 — representative Moderate-baseline sample ───
await sql`DELETE FROM federal_ssp_controls WHERE ssp_id=${SSP}`;
// Full baseline is 300+; seed the assessment-relevant family heads with realistic statuses.
const controls = [];
const add = (cid, status, desc, role) => controls.push([cid, status, desc, role]);

add("AC-2","implemented","Account management via Okta + AD federation. Quarterly access reviews documented in GRC platform. Automated deprovisioning on HR termination feed within 4 hours.","IAM Lead");
add("AC-2(3)","partial","Disablement is manual; automation ticket CHG-4471 in progress. Compensating: daily review of inactive accounts >35 days by IAM Lead.","IAM Lead");
add("AC-3","implemented","RBAC enforced through application roles mapped to AD groups; CUI enclave access VDI-only.","AppSec Lead");
add("AC-6","partial","Least privilege reviewed for admin roles; service accounts pending least-privilege pass (POA&M follow-up).","IAM Lead");
add("AT-3","implemented","Annual security awareness + role-based training tracked in LMS; insider-threat module per DFARS 252.204-7012.","HR Security");
add("AU-2","implemented","Audit events defined per 800-53 AU-2a; coverage verified against Splunk ES data sources inventory v3.2.","SOC Manager");
add("AU-6","implemented","Splunk Enterprise Security correlation with daily review; alerts routed to 24x7 SOC.","SOC Manager");
add("CA-5","implemented","Continuous monitoring via Tenium + Tenable.sc; findings feed POA&M pipeline automatically.","Vuln Mgmt");
add("CA-7","partial","ConMon metrics dashboard incomplete (POA&M-003); monthly ISCM report produced manually in interim.","CISO");
add("CM-6","implemented","Configuration baselines from CIS Benchmarks + DISA STIGs; drift detected by Tanium.","System Engineering");
add("CM-7","implemented","Allowlist enforced on enclave servers via AppLocker; exceptions time-boxed with approval record.","System Engineering");
add("IA-2","implemented","PIV/CAC enforcement for privileged access; MFA for all users via Okta Federal.","IAM Lead");
add("IA-5","partial","Password policy compliant; managed-device authenticators (PIV) at 94% issuance — remaining 12 field staff scheduled.","IAM Lead");
add("IR-8","partial","Incident Response Plan approved internally; AO signature pending (POA&M-004). Playbooks tested in Apr tabletop.","InfoSec Officer");
add("MA-4","implemented","Remote maintenance via jump host with session recording; nonlocal maintenance prohibited for CUI systems.","System Engineering");
add("RA-5","implemented","Authenticated vuln scans weekly (infrastructure) / monthly (enclave); SLA: critical 15 days per DoD standard. STIG backlog exception tracked as closed POA&M-006.","Vuln Mgmt");
add("SA-9","implemented","External system services restricted to FedRAMP-authorized CSPs; AWS GovCloud inheritance package accepted.","SSO/Contracts");
add("SC-8","implemented","TLS 1.2+ in transit; FIPS 140-2 validated crypto modules for CUI paths.","System Engineering");
add("SC-28","partial","Encryption at rest for primary datastore (KMS CMK); legacy tape archive migration to encrypted S3 Glacier in progress (POA&M-005).","System Engineering");
add("SI-2","implemented","Flaw remediation within DoD CA standards: critical 15d/high 30d; emergency patching procedure exercised Q2.","Vuln Mgmt");
add("SR-6","implemented","Supplier assessments include DFARS 7012 flow-down clause verification; annual reassessment cycle.","Contracts");

const ctlRows = [];
for (const c of controls) {
  const r = await sql`
    INSERT INTO federal_ssp_controls (ssp_id, control_id, implementation_status, implementation_description, responsible_role, evidence_links, fisma_system_id)
    VALUES (${SSP}, ${c[0]}, ${c[1]}, ${c[2]}, ${c[3]},
      jsonb_build_array('evidence://apex/' || lower(replace(${c[0]},'-','')) || '.pdf'), ${FISMA})
    RETURNING id`;
  ctlRows.push(r[0].id);
}
log(`ssp_controls: ${ctlRows.length}`);

// ── 2. POA&M items under existing POA&Ms ────────────────────────────────────
await sql`DELETE FROM poam_items WHERE poam_id IN (SELECT id FROM federal_poams WHERE client_id=${CLIENT})`;
const items = [
  // [poam_id, control_id, weakness_name, status, risk, detector, due]
  [50,"AC-2(3)","Inactive accounts not disabled within IA timeframe","ongoing","medium","Self-Assessment","2026-10-31"],
  [50,"AC-2(3)","Automation script lacks audit logging of disable actions","open","low","Self-Assessment","2026-11-15"],
  [51,"AU-6","Two decommissioning VMs removed from SIEM ingestion prematurely","mitigating","high","Continuous Monitoring","2026-09-30"],
  [52,"CA-7","ISCM metrics dashboard does not aggregate enclave scan results","ongoing","medium","Independent Assessment","2026-11-30"],
  [53,"IR-8","IR Plan awaiting Authorizing Official signature","risk adjustment","medium","Independent Assessment","2026-09-15"],
  [54,"SC-28","Legacy tape archive stores CUI without FIPS-validated encryption","ongoing","high","Self-Assessment","2026-12-20"],
  [55,"RA-5","Enclave STIG scan backlog exceeded 30-day SLA during migration","closed","medium","Inspector General","2026-07-01"],
];
for (const it of items) {
  await sql`
    INSERT INTO poam_items (poam_id, control_id, weakness_name, weakness_description, point_of_contact,
      weakness_detector_source, source_identifier, status, original_risk_rating, adjusted_risk_rating,
      scheduled_completion_date, original_detection_date, status_date, milestones,
      overall_remediation_plan, asset_identifier)
    VALUES (${it[0]}, ${it[1]}, ${it[2]},
      ${"Weakness identified during FY26 NIST 800-171/800-53 assessment activity. Detail and milestones per eMASS conventions."},
      ${"J. Whitfield, Federal Compliance"},
      ${it[5]}, ${"SAR-FY26-" + it[0]}, ${it[3]}, ${it[4]}, ${it[4]},
      ${it[6]}, ${"2026-05-04"}, now(),
      ${sql.json([{ milestone: "Interim compensating control verified", due: "2026-09-15" }, { milestone: "Full remediation", due: it[6] }])},
      ${"Remediation tracked in engineering backlog with biweekly compliance review; verification evidence attached upon closure."},
      ${"ApexCloud Gov Production Enclave"})`;
}
log(`poam_items: ${items.length}`);

// link POA&Ms to SSP retroactively
await sql`UPDATE federal_poams SET source_ssp_id=${SSP}, fisma_system_id=${FISMA} WHERE client_id=${CLIENT}`;

// ── 3. SAR with findings ────────────────────────────────────────────────────
await sql`DELETE FROM federal_sar_findings WHERE sar_id IN (SELECT id FROM federal_sars WHERE client_id=${CLIENT})`;
await sql`DELETE FROM federal_sars WHERE client_id=${CLIENT}`;
const sar = await sql`
  INSERT INTO federal_sars (client_id, ssp_id, title, assessor_name, assessment_date, summary_of_findings,
    risk_executive_summary, status, system_acronym, system_identification, system_type, version, agency,
    assessment_completion_date, confidentiality, integrity, availability, impact, package_type, executive_summary, fisma_system_id)
  VALUES (${CLIENT}, ${SSP}, 'FY26 Security Assessment Report — ApexCloud Gov Platform', 'Redstone Assessment Group LLC',
    '2026-06-02', '21 controls assessed in depth: 17 satisfactory, 4 require attention (tracked in POA&M). No critical weaknesses.',
    'Residual risk is MODERATE. The four findings are operationally compensated and carry POA&M milestones; none block authorization continuation. Recommend continued authorization with ConMon focus on SC-28 archive migration.',
    'final', 'ACG', 'ApexCloud Gov Production Enclave', 'Major Application', '1.2', 'DoD (Defense Industrial Base)',
    '2026-06-27', 'moderate', 'moderate', 'moderate', 'moderate', 'Initial Authorization',
    'Assessment performed against NIST SP 800-53 Rev 5 moderate baseline with DFARS 252.204-7012 overlay. Evidence quality strong; main theme is completion of automation initiatives.', ${FISMA})
  RETURNING id`;
const sarId = sar[0].id;

const findings = [
  ["AC-2(3)","does not meet","Automated disablement of inactive accounts not fully implemented; daily manual review compensates but is not evidenced consistently for two weeks in July.", "moderate", "Implement CHG-4471 automation with audit logging; interim: attach daily review tickets to evidence repo."],
  ["CA-7","partially satisfies","ISCM dashboard omits enclave scanner feeds; manual monthly report exists but lag exceeds 800-37 ConMon cadence expectations.", "moderate", "Complete dashboard integration (POA&M-003); interim manual report continues."],
  ["IR-8","does not meet","IR plan current and exercised but missing AO signature at time of assessment.", "low", "Obtain signature; no technical gap."],
  ["SC-28","partially satisfies","Legacy tape archive holds pre-migration CUI without FIPS-validated encryption at rest.", "high", "Accelerate S3 Glacier migration (POA&M-005); verify destruction certificates for retired tapes."],
];
const fndRows = [];
for (const f of findings) {
  const r = await sql`
    INSERT INTO federal_sar_findings (sar_id, control_id, result, observation, risk_level, remediation_plan, recommendations, residual_risk_level, fisma_system_id)
    VALUES (${sarId}, ${f[0]}, ${f[1]}, ${f[2]}, ${f[3]}, ${f[4]}, ${f[4]}, 'moderate', ${FISMA})
    RETURNING id`;
  fndRows.push(r[0].id);
}
log(`sar_findings: ${fndRows.length}`);

// ── 4. SPRS assessment (NIST 800-171 DoD deduced score) ─────────────────────
await sql`DELETE FROM federal_sprs_assessments WHERE client_id=${CLIENT}`;
// 110-point scale: deductions per DoD assessment methodology.
// 6 unmet/partially met practices across 800-171 families → net score 88
await sql`
  INSERT INTO federal_sprs_assessments (client_id, title, score, assessment_date, scope_description, status)
  VALUES (${CLIENT}, 'SPRS/NIST 800-171 Self-Assessment — ApexCloud Gov (FY26)', 88, '2026-06-30',
    'Basic self-assessment per DFARS 252.204-7019/7020 against NIST SP 800-171 Rev 2 (110 practices). Deductions: AC.L2-3.1.12 (-5), AU.L2-3.3.9 partial (-1), IR.L2-3.6.3 (-5), SC.L2-3.13.16 (-5), SR.L2-3.14.3 partial (-1), CA.L2-3.12.3 (-5). Score posted to SPRS PIEE.',
    'submitted')`;

// ── 5. RMF workflow step refresh + FISMA report row ─────────────────────────
await sql`UPDATE federal_rmf_workflows SET current_step=6, step_status=${sql.json({
  step1_categorize:"complete", step2_select:"complete", step3_implement:"in_progress",
  step4_assess:"complete", step5_authorize:"complete", step6_monitor:"in_progress"
})} WHERE client_id=${CLIENT}`;
await sql`DELETE FROM federal_fisma_reports WHERE client_id=${CLIENT}`;
await sql`
  INSERT INTO federal_fisma_reports (client_id, reporting_period, system_impact, overall_status, metrics, fisma_system_id)
  VALUES (${CLIENT}, 'FY26-Q3', 'moderate', 'operating', ${sql.json({
    open_poams: 5, overdue_poams: 0, controls_implemented_pct: 81,
    inherited_controls: inherited.length, last_conmon_report: "2026-08-15",
    significant_incidents_fytd: 1, sprs_score: 88 })}, ${FISMA})`;

// ── Verify ──────────────────────────────────────────────────────────────────
const v = {};
for (const t of ["federal_poams","federal_sars","federal_sprs_assessments","federal_inheritances","federal_fedramp_packages","federal_fisma_reports"]) {
  const c = await sql`select count(*)::int as n from ${sql(t)} where client_id=${CLIENT}`;
  v[t] = c[0].n;
}
v.federal_ssp_controls = (await sql`select count(*)::int as n from federal_ssp_controls where ssp_id=${SSP}`)[0].n;
v.poam_items = (await sql`select count(*)::int as n from poam_items where poam_id in (select id from federal_poams where client_id=${CLIENT})`)[0].n;
v.federal_sar_findings = (await sql`select count(*)::int as n from federal_sar_findings where sar_id=${sarId}`)[0].n;
console.log("VERIFY:", JSON.stringify(v));
await sql.end();

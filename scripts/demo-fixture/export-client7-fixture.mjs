#!/usr/bin/env node
/**
 * Export the LaTorre LTD (client 7) demo dataset from a local database into a
 * sanitized, portable fixture: scripts/demo-fixture/client7.json.gz
 *
 * Dev-only tool. Usage (from the repo root):
 *   DATABASE_URL=postgres://... node scripts/demo-fixture/export-client7-fixture.mjs
 *
 * The fixture is loaded additively at boot by scripts/demo-fixture-client7.ts.
 * Sanitization:
 *   - every user reference becomes the "__USER__" placeholder (bound at load time
 *     to the deployment's admin user)
 *   - tokens become "__TOKEN__" (regenerated randomly at load time)
 *   - cloud credentials are blanked; e-mail addresses outside the fictional demo
 *     domains are rewritten to <local>@<name>.example
 *   - user_clients (memberships) are never exported
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const CLIENT_ID = 7;
const USER = "user";
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "client7.json.gz");

const sub = (t, col, parent) => `${col} IN (SELECT id FROM ${parent} WHERE client_id = ${CLIENT_ID})`;

// Insertion order matters: parents before children.
// refs: column -> "table" (fixture table) | USER | { global } | { poly: typeColumn, map: { type: table | [tables] } } | null (always cleared)
const TABLES = [
  { t: "org_roles", key: ["title"], refs: { reporting_role_id: "org_roles" } },
  { t: "employees", key: ["email"], refs: { org_role_id: "org_roles", manager_id: "employees" } },
  { t: "client_frameworks", key: ["name"] },
  { t: "client_controls", key: ["control_id"], refs: { control_id: { global: "controls" } } },
  { t: "client_policies", key: ["name"], refs: { template_id: { global: "policy_templates" } } },
  { t: "control_policy_mappings", key: ["client_control_id", "client_policy_id"], refs: { client_control_id: "client_controls", client_policy_id: "client_policies" } },
  { t: "control_test_runs", refs: { client_control_id: "client_controls" } },
  { t: "client_control_history", where: sub("client_control_history", "client_control_id", "client_controls"), refs: { client_control_id: "client_controls", changed_by_user_id: USER } },
  { t: "compliance_monitor_events", refs: { control_id: "client_controls" } },
  { t: "evidence", key: ["evidence_id"], refs: { client_control_id: "client_controls" } },
  { t: "assets", key: ["name"] },
  { t: "vulnerabilities", key: ["vulnerability_id"] },
  { t: "threats", key: ["threat_id"] },
  { t: "asset_cve_matches", refs: { asset_id: "assets", imported_vulnerability_id: "vulnerabilities" } },
  { t: "vendors", key: ["name"], refs: { owner_id: USER, security_owner_id: USER } },
  { t: "vendor_assessments", key: ["vendor_id", "type"], refs: { vendor_id: "vendors" } },
  { t: "vendor_contracts", key: ["vendor_id", "title"], refs: { vendor_id: "vendors" } },
  { t: "vendor_scans", refs: { vendor_id: "vendors" } },
  { t: "vendor_assessment_templates", key: ["name"], refs: { created_by: USER } },
  { t: "vendor_assessment_requests", refs: { vendor_id: "vendors", template_id: "vendor_assessment_templates", created_by: USER } },
  { t: "risk_scenarios", key: ["title"], refs: { asset_id: "assets", vendor_id: "vendors", threat_id: "threats", vulnerability_id: "vulnerabilities", dev_project_id: null, project_id: null, threat_model_id: null, gap_response_id: null } },
  { t: "risk_assessments", key: ["assessment_id"], refs: { threat_id: "threats", vulnerability_id: "vulnerabilities", project_id: null, fisma_system_id: null, risk_id: null, gap_response_id: null } },
  { t: "risk_treatments", key: ["risk_scenario_id", "risk_assessment_id", "strategy"], refs: { risk_scenario_id: "risk_scenarios", risk_assessment_id: "risk_assessments", control_id: null } },
  { t: "incidents", key: ["title"] },
  { t: "data_breaches", refs: { created_by: USER } },
  { t: "bc_plans", key: ["title"], refs: { owner_id: USER } },
  { t: "business_processes", key: ["name"], refs: { owner_id: USER, parent_id: "business_processes" } },
  { t: "processing_activities", key: ["activity_id"], refs: { created_by: USER } },
  { t: "data_protection_impact_assessments", refs: { activity_id: "processing_activities", assigned_to: USER } },
  { t: "dpia_templates", key: ["name"], refs: { created_by: USER } },
  { t: "international_transfers", refs: { activity_id: "processing_activities", vendor_id: "vendors" } },
  { t: "transfer_impact_assessments", refs: { transfer_id: "international_transfers" } },
  { t: "dsar_requests", key: ["request_id"], refs: { assignee_id: USER } },
  { t: "policy_reviews", key: ["policy_review_id"] },
  { t: "policy_acknowledgements", refs: { policy_id: "client_policies", user_id: USER } },
  { t: "policy_exceptions", where: sub("policy_exceptions", "employee_id", "employees"), refs: { policy_id: "client_policies", employee_id: "employees", requirement_id: null } },
  { t: "questionnaires", key: ["name"], refs: { owner_id: USER } },
  { t: "questionnaire_questions", where: sub("questionnaire_questions", "questionnaire_id", "questionnaires"), refs: { questionnaire_id: "questionnaires", assignee_id: USER } },
  { t: "tasks", refs: { assignee_id: USER, created_by: USER, related_entity_id: { poly: "related_entity_type", map: { evidence_expired: "evidence", dsar_overdue: "dsar_requests" } } } },
  { t: "task_assignments", refs: { task_id: "tasks", user_id: USER } },
  { t: "work_items", refs: { assigned_to_user_id: USER, assigned_to_employee_id: "employees", created_by: USER, escalation_rule_id: null, entity_id: { poly: "entity_type", map: { task: "tasks" } } } },
  { t: "access_review_campaigns", refs: { created_by_id: USER } },
  { t: "access_review_assignments", where: sub("access_review_assignments", "campaign_id", "access_review_campaigns"), refs: { campaign_id: "access_review_campaigns", reviewer_id: USER, reviewee_id: "employees" } },
  { t: "roadmaps", refs: { created_by_id: USER, approved_by_id: USER } },
  { t: "roadmap_milestones", where: sub("roadmap_milestones", "roadmap_id", "roadmaps"), refs: { roadmap_id: "roadmaps" } },
  { t: "roadmap_reports", refs: { roadmap_id: "roadmaps" } },
  { t: "implementation_plans", refs: { roadmap_id: "roadmaps", created_by_id: USER, project_manager_id: USER, framework_id: null } },
  { t: "implementation_tasks", where: sub("implementation_tasks", "implementation_plan_id", "implementation_plans"), refs: { implementation_plan_id: "implementation_plans", assignee_id: "employees", reviewer_id: USER, created_by_id: USER } },
  { t: "compliance_certificates", key: ["certificate_number"], refs: { framework_id: { global: "compliance_frameworks" }, audit_id: null } },
  { t: "report_logs", refs: { user_id: USER } },
  { t: "approval_requests", refs: { submitter_id: USER } },
  { t: "audit_logs", refs: { user_id: USER, entity_id: { poly: "entity_type", map: { risk: ["risk_assessments", "risk_scenarios"], threat: "threats", treatment: "risk_treatments", data_breach: "data_breaches" } } } },
  { t: "governance_events", refs: { actor_user_id: USER, entity_id: { poly: "entity_type", map: { vendor: "vendors", evidence: "evidence", policy: "client_policies", risk: ["risk_scenarios", "risk_assessments"], task: "tasks", bcp_plan: "bc_plans", control: "client_controls" } } } },
  { t: "ai_usage_metrics", refs: { user_id: USER } },
  { t: "email_messages", refs: { user_id: USER } },
  { t: "company_memory_nodes", key: ["path"] },
  { t: "autopilot_configs", singleton: true },
  { t: "client_auto_test_schedules", singleton: true },
  { t: "client_settings", singleton: true },
  { t: "autopilot_runs" },
  { t: "autopilot_actions", refs: { run_id: "autopilot_runs", assigned_to_user_id: USER, assigned_to_employee_id: "employees", reviewer_user_id: USER, delegated_by_user_id: USER, incident_id: "incidents" } },
  { t: "cloud_connections", key: ["name"] },
];

const GLOBAL_KEYS = {
  controls: ["control_id", "framework"],
  compliance_frameworks: ["short_code"],
  policy_templates: ["template_id"],
};

const GLOBAL_INSERTABLE = new Set(["controls"]);
const DEMO_DOMAINS = new Set(["latorre.local", "complianceos.local", "compliance-os.com", "example.com"]);
const EMAIL_RE = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const SECRET_KEY_RE = /(password|passwd|secret|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|refresh[_-]?token|access[_-]?token)/i;
const TOKEN_COLUMNS = new Set(["token", "vendor_token"]);

function scrubString(s) {
  return s.replace(EMAIL_RE, (m, local, domain) => {
    const d = domain.toLowerCase();
    if (DEMO_DOMAINS.has(d) || d.endsWith(".example")) return m;
    const name = d.split(".").slice(0, -1).join("-") || "demo";
    return `${local}@${name}.example`;
  });
}
function scrub(v) {
  if (typeof v === "string") return scrubString(v);
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = SECRET_KEY_RE.test(k) ? null : scrub(x);
    return o;
  }
  return v;
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is required"); process.exit(1); }
const sql = postgres(url, { max: 2, onnotice: () => {} });

const tableCols = async (t) =>
  (await sql`SELECT column_name, is_generated FROM information_schema.columns WHERE table_schema='public' AND table_name=${t}`)
    .filter((c) => c.is_generated !== "ALWAYS").map((c) => c.column_name);

const out = { version: 1, clientId: CLIENT_ID, generatedAt: new Date().toISOString(), tables: [], globals: {} };
const globalIds = {};
try {
  for (const spec of TABLES) {
    const cols = await tableCols(spec.t);
    if (!cols.length) { console.warn(`skip ${spec.t}: table missing`); continue; }
    const where = spec.where || `client_id = ${CLIENT_ID}`;
    const rows = (await sql.unsafe(`SELECT row_to_json(x) AS j FROM public."${spec.t}" x WHERE ${where} ORDER BY id`)).map((r) => r.j);
    if (!rows.length) { console.log(`${spec.t.padEnd(40)} 0`); continue; }
    const refs = spec.refs || {};
    for (const r of rows) {
      for (const [k, v] of Object.entries(r)) {
        if (k === "id" || k === "client_id") continue;
        const ref = refs[k];
        if (ref === null) { r[k] = null; continue; }
        if (ref === USER) { if (v != null) r[k] = "__USER__"; continue; }
        if (ref && typeof ref === "object" && ref.global && v != null) { (globalIds[ref.global] ||= new Set()).add(v); continue; }
        if (ref) continue;
        if (TOKEN_COLUMNS.has(k) && v != null) { r[k] = "__TOKEN__"; continue; }
        if (k === "credentials") { r[k] = v == null ? v : {}; continue; }
        r[k] = scrub(v);
      }
    }
    let key = spec.key || null;
    if (key) {
      const seen = new Set(); let dup = 0;
      for (const r of rows) { const kk = JSON.stringify(key.map((c) => r[c])); if (seen.has(kk)) dup++; seen.add(kk); }
      if (dup) { console.warn(`  ${spec.t}: natural key ${key} not unique (${dup} dups) - matching disabled`); key = null; }
    }
    out.tables.push({ table: spec.t, child: !!spec.where, key, singleton: !!spec.singleton, refs, rows });
    console.log(`${spec.t.padEnd(40)} ${rows.length}`);
  }
  for (const [g, ids] of Object.entries(globalIds)) {
    const kc = GLOBAL_KEYS[g];
    const rows = await sql.unsafe(`SELECT id, ${kc.map((c) => `"${c}"`).join(",")} FROM public."${g}" WHERE id = ANY($1::int[])`, [[...ids]]);
    out.globals[g] = { key: kc, rows: Object.fromEntries(rows.map((r) => [r.id, Object.fromEntries(kc.map((c) => [c, r[c]]))])) };
    if (GLOBAL_INSERTABLE.has(g)) {
      // Ship the full catalog rows so a deployment that lacks them can add them.
      const full = (await sql.unsafe(`SELECT row_to_json(x) AS j FROM public."${g}" x WHERE id = ANY($1::int[]) AND client_id IS NULL`, [[...ids]])).map((r) => r.j);
      out.globals[g].full = Object.fromEntries(full.map((r) => { const { id, ...rest } = r; return [id, scrub(rest)]; }));
    }
  }
  const json = JSON.stringify(out);
  fs.writeFileSync(OUT, zlib.gzipSync(json, { level: 9 }));
  console.log(`wrote ${OUT}: ${out.tables.reduce((a, t) => a + t.rows.length, 0)} rows, ${(json.length / 1e6).toFixed(1)} MB json, ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB gz`);
} finally {
  await sql.end();
}

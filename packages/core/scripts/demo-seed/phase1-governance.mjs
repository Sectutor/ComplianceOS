/**
 * Phase 1: Governance — RACI assignments, work_items across all valid types,
 * escalations, governance_events timeline spanning ~6 months.
 */
import { Rng, bulkInsert, agoDays, daysFromNow, log } from "./util.mjs";

const WORK_ITEM_TYPES = [
  "review", "approval", "evidence_collection", "raci_assignment", "risk_treatment",
  "vendor_assessment", "bcp_approval", "policy_review", "control_implementation",
  "risk_review", "control_assessment",
];
const STATUSES = ["pending", "in_progress", "completed", "cancelled", "escalated"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const ENTITY_TYPES = ["policy", "control", "risk", "bcp_plan", "vendor", "evidence", "task", "roadmap", "implementation_plan"];

const TITLES = {
  review: ["Quarterly access review sign-off", "ISMS internal audit review", "Vendor risk review — quarterly cycle", "Asset register review Q{n}", "Backup restoration test review"],
  approval: ["Approve Information Security Policy v3.2", "Approve risk treatment plan RT-{n}", "Approve new vendor onboarding — {v}", "Management approval: BCP test report", "Accept residual risk RSK-{n}"],
  evidence_collection: ["Collect firewall config export", "Collect MFA coverage report", "Collect ISO 27001 training records", "Collect penetration test executive summary", "Collect DR drill minutes"],
  raci_assignment: ["Assign RACI for incident response process", "Assign RACI for change management", "Assign RACI for vulnerability management", "Assign RACI for BC plan maintenance"],
  risk_treatment: ["Implement mitigation for ransomware risk", "Treatment: third-party data transfer risk", "Treatment: single-point-of-failure in DC", "Treatment: phishing-driven credential theft"],
  vendor_assessment: ["Annual reassessment — cloud hosting vendor", "Security questionnaire follow-up", "DPA review for HR SaaS provider", "Subprocessor chain review"],
  bcp_approval: ["Approve updated Business Continuity Plan", "Approve crisis communication annex", "Approve call tree refresh"],
  policy_review: ["Annual review: Access Control Policy", "Annual review: Acceptable Use Policy", "Review Remote Work Policy against NIS2", "Review Cryptography Policy"],
  control_implementation: ["Implement A.8.16 monitoring activities", "Implement A.5.23 cloud security controls", "Roll out privileged access management", "Deploy endpoint detection & response"],
  risk_review: ["Re-assess top-10 risks after quarter close", "Risk review: post-incident RSK-{n}", "Scenario analysis: supply chain compromise"],
  control_assessment: ["Assess effectiveness of A.9.4 access control", "Test backup controls A.8.13", "Assess physical entry controls A.7.x"],
};

export async function seedPhase1(sql, clientId) {
  const rng = new Rng(3000 + clientId);
  const out = {};

  // --- employees + a few platform users to assign to ---
  const emps = await sql`SELECT id, first_name, last_name, email FROM employees WHERE client_id = ${clientId}`;
  const users = await sql`SELECT user_id FROM user_clients WHERE client_id = ${clientId}`;
  const userIds = users.map(u => u.user_id);

  // --- RACI task_assignments (link existing tasks where present; also standalone rows via work_items) ---
  // We create work_items first, then map some into task_assignments with raci roles.
  const wiRows = [];
  const now = Date.now();
  const totalItems = 120;
  for (let i = 0; i < totalItems; i++) {
    const type = rng.weighted(WORK_ITEM_TYPES.map(t => [t, t === "review" || t === "policy_review" ? 14 : 9]));
    const tpl = rng.pick(TITLES[type]);
    const title = tpl.replace("{n}", String(rng.int(1, 40)));
    // 75% completion state => demo sits at ~75%
    let status = rng.weighted([["completed", 45], ["in_progress", 15], ["pending", 20], ["escalated", 5], ["cancelled", 5]]);
    const createdAgo = rng.int(3, 180);
    const dueOffset = status === "completed" ? -rng.int(1, 30) : rng.pick([-6, -2, 1, 2, 4, 7, 10, 21]);
    const isEsc = status === "escalated";
    if (isEsc) { status = "escalated"; }
    const emp = rng.pick(emps);
    wiRows.push({
      client_id: clientId,
      type,
      status,
      priority: rng.weighted([["low", 15], ["medium", 40], ["high", 30], ["critical", 15]]),
      title,
      description: `${title}. Auto-generated as part of the ${type.replace(/_/g, " ")} workflow. Owner should review, complete or re-assign as appropriate.`,
      entity_type: type.includes("risk") ? "risk" : type.includes("polic") ? "policy" : type.includes("control") ? "control" : type.includes("vendor") ? "vendor" : type.includes("bcp") ? "bcp_plan" : type.includes("evidence") ? "evidence" : "task",
      entity_id: null,
      assigned_to_user_id: rng.chance(0.35) ? rng.pick(userIds) : null,
      assigned_to_employee_id: emp.id,
      due_date: new Date(now + dueOffset * 86400000),
      completed_at: status === "completed" ? agoDays(rng.int(0, Math.max(1, createdAgo - 1))) : null,
      is_escalated: isEsc,
      escalated_at: isEsc ? agoDays(rng.int(1, 10)) : null,
      metadata: JSON.stringify({ source: "demo-seed", department: emp.email.split("@")[0] }),
      created_at: agoDays(createdAgo),
      updated_at: agoDays(rng.int(0, createdAgo)),
    });
  }
  out.work_items = await bulkInsert(sql, "work_items",
    ["client_id","type","status","priority","title","description","entity_type","entity_id","assigned_to_user_id","assigned_to_employee_id","due_date","completed_at","is_escalated","escalated_at","metadata","created_at","updated_at"],
    wiRows);

  // overdue pending items get escalation flag on a few
  const escalated = wiRows.filter(w => w.is_escalated).length;
  out.escalated = escalated;

  // --- RACI assignments over recent completed work items ---
  const completed = await sql`
    SELECT id FROM work_items WHERE client_id=${clientId} AND status='completed' ORDER BY id LIMIT 40`;
  const raciRoles = ["responsible", "accountable", "consulted", "informed"];
  const taRows = [];
  const safeUserIds = userIds.length ? userIds : [0];
  for (const w of completed) {
    const n = rng.int(2, 4);
    const chosen = rng.shuffle(raciRoles).slice(0, n);
    for (const r of chosen) {
      taRows.push({
        client_id: clientId,
        task_type: "task",
        task_id: w.id,
        user_id: rng.chance(0.3) ? rng.pick(safeUserIds) : safeUserIds[0],
        raci_role: r,
        assigned_at: agoDays(rng.int(10, 120)),
        assigned_by: rng.pick(safeUserIds),
      });
    }
  }
  if (taRows.some(r => r.user_id == null)) {
    log("WARN null user_id rows:", taRows.filter(r => r.user_id == null).length);
  }
  out.raci_assignments = await bulkInsert(sql, "task_assignments",
    ["client_id","task_type","task_id","user_id","raci_role","assigned_at","assigned_by"], taRows);

  // --- governance events timeline (~6 months) ---
  const evRows = [];
  const actors = ["Rafael Ostermann", "Katrin Hoffmann", "Tobias Krüger", "Mira Lindqvist", "System (Autopilot)"];
  for (let i = 0; i < 150; i++) {
    const wi = rng.pick(wiRows);
    const action = rng.pick(["created", "status_changed", "assigned", "escalated", "resolved", "commented"]);
    const fromS = rng.pick(STATUSES);
    let toS = rng.pick(STATUSES);
    if (toS === fromS) toS = fromS === "completed" ? "in_progress" : "completed";
    evRows.push({
      client_id: clientId,
      entity_type: wi.entity_type,
      entity_id: wi.entity_id ?? 0,
      entity_name: wi.title,
      event_type: action,
      from_state: fromS,
      to_state: toS,
      action,
      actor_user_id: rng.chance(0.7) ? rng.pick(userIds) : null,
      actor_name: rng.pick(actors),
      metadata: JSON.stringify({ source: "demo-seed" }),
      created_at: agoDays(rng.int(0, 180)),
    });
  }
  out.governance_events = await bulkInsert(sql, "governance_events",
    ["client_id","entity_type","entity_id","entity_name","event_type","from_state","to_state","action","actor_user_id","actor_name","metadata","created_at"],
    evRows);

  log(`phase1:`, JSON.stringify(out));
  return out;
}

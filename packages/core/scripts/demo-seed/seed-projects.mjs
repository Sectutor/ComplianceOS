/**
 * Seed two realistic security projects (+ tasks) for a client.
 * Usage: node --env-file=../../.env scripts/demo-seed/seed-projects.mjs [clientId]
 */
import postgres from "postgres";
import { Rng, agoDays, daysFromNow } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const clientId = parseInt(process.argv[2] || "7", 10);
const rng = new Rng(9000 + clientId);

// resolve owner names from employees
const emps = await sql`SELECT first_name, last_name, department FROM employees WHERE client_id=${clientId}`;
const deptHead = (d) => {
  const e = emps.find(x => x.department === d);
  return e ? `${e.first_name} ${e.last_name}` : "Security Team";
};

const PROJECTS = [
  {
    name: "Zero Trust Network Architecture Rollout",
    description:
      "Replace flat network model with zero trust segmentation across Munich DC-1, warehouses and cloud VPCs. Includes identity-aware proxy in front of internal apps, device posture checks via CrowdStrike + Intune signals, and micro-segmentation of the WMS/EDI zones. Drives implementation of ISO A.8.20–A.8.22 and reduces lateral-movement risk identified in RSK assessments.",
    project_type: "infra",
    security_criticality: "critical",
    status: "in_progress",
    owner: deptHead("Information Security") || deptHead("IT Operations"),
    start: -90, end: 120,
    tasks: [
      ["Define segmentation policy & zone model (prod / corp / OT / guest)", "done", "high"],
      ["Deploy identity-aware proxy pilot for internal admin apps", "in_progress", "high"],
      ["Enforce device posture check for VPN access", "in_progress", "medium"],
      ["Micro-segment WMS and EDI gateway VLANs", "todo", "critical"],
      ["Roll out conditional access to service accounts", "todo", "medium"],
      ["Update network diagrams & asset register after re-segmentation", "backlog", "low"],
    ],
  },
  {
    name: "ISO 27001 Certification Readiness — Evidence Automation",
    description:
      "Close remaining Stage-1 gaps: automate evidence collection for access reviews, backup verification and vulnerability scan reports; complete SoA justifications for all N/A controls; run internal audit program dry-run. Directly supports certification goal set during onboarding readiness assessment.",
    project_type: "it",
    security_criticality: "high",
    status: "in_progress",
    owner: deptHead("Legal & Compliance") || deptHead("Information Security"),
    start: -45, end: 75,
    tasks: [
      ["Complete SoA justification review for excluded controls", "in_progress", "high"],
      ["Automate quarterly access-review evidence export", "in_progress", "high"],
      ["Schedule & document internal audit dry-run", "todo", "critical"],
      ["Backfill evidence packages for implemented Annex A controls", "review", "medium"],
      ["Management review meeting — present readiness scorecard", "todo", "high"],
    ],
  },
];

const out = [];
for (const p of PROJECTS) {
  const [proj] = await sql`
    INSERT INTO projects ${sql({
      client_id: clientId,
      name: p.name,
      description: p.description,
      status: p.status,
      project_type: p.project_type,
      security_criticality: p.security_criticality,
      owner: p.owner,
      start_date: agoDays(-p.start),
      end_date: daysFromNow(p.end),
    })} RETURNING id`;
  let pos = 0;
  for (const [title, status, priority] of p.tasks) {
    await sql`
      INSERT INTO project_tasks ${sql({
        client_id: clientId,
        title,
        description: `${title} — part of "${p.name}".`,
        status,
        priority,
        due_date: daysFromNow(rng.int(status === "done" ? -30 : 5, 60)),
        position: pos++,
        tags: JSON.stringify([p.project_type, "security"]),
        source_type: "manual",
      })}`;
  }
  out.push({ id: proj.id, name: p.name, tasks: p.tasks.length });
}

console.log(JSON.stringify(out));
await sql.end();

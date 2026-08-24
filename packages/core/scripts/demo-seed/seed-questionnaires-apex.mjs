/**
 * Seeds outbound security questionnaires for Apex (789) — federal vendor set.
 * Idempotent. Usage: node --env-file=../../.env scripts/demo-seed/seed-questionnaires-apex.mjs [clientId]
 */
import postgres from "postgres";
import { Rng, agoDays, daysFromNow } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const clientId = parseInt(process.argv[2] || "789", 10);
const rng = new Rng(9985 + clientId);

const ex = await sql`SELECT count(*)::int n FROM questionnaires WHERE client_id=${clientId}`;
if (ex[0].n > 0) { console.log(JSON.stringify({ skipped: true })); await sql.end(); process.exit(0); }

const vendors = await sql`SELECT id, name, criticality FROM vendors WHERE client_id=${clientId} ORDER BY id`;
const emps = await sql`SELECT first_name, last_name FROM employees WHERE client_id=${clientId}`;
const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };
const [owner] = await sql`SELECT user_id FROM user_clients WHERE client_id=${clientId}`;
const userId = owner.user_id;

const TARGETS = [
  ["Amazon Web Services (GovCloud)", "completed", 97],
  ["Splunk LLC (Cisco)", "completed", 91],
  ["Tanium Inc.", "completed", 88],
  ["Deltek (GovWin/Costpoint)", "in_progress", null],
  ["Atlassian Government Cloud", "completed", 84],
  ["Skillsoft Corporation", "submitted", null],
  ["Microsoft 365 GCC", "viewed", null],
  ["Expedient Data Centers", "sent", null],
  ["CrowdStrike Services", "completed", 93],
  ["Iron Mountain (tape vault)", "overdue", null],
  ["ClearCheck / FSO screening vendor", "pending", null],
  ["Carahsoft Technology Corp", "sent", null],
];

for (const [vendorName, status, score] of TARGETS) {
  const v = vendors.find(x => x.name === vendorName);
  if (!v) continue;
  const sentAgo = rng.int(status === "sent" ? 2 : 20, status === "overdue" ? 90 : 150);
  const done = status === "completed";
  await sql`
    INSERT INTO questionnaires ${sql({
      client_id: clientId,
      name: `Vendor Security Questionnaire — ${v.name}`,
      sender_name: empName(),
      product_name: "GRC Vendor Assurance",
      status,
      progress: done ? 100 : status === "in_progress" ? rng.int(20, 70) : status === "viewed" ? 5 : 0,
      due_date: daysFromNow(status === "overdue" ? -rng.int(5, 40) : rng.int(5, 45)),
      owner_id: userId,
      vendor_name: v.name,
      vendor_email: `compliance@${v.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18)}.example`,
      vendor_token: `tok_${rng.next().toString(36).slice(2)}${Date.now().toString(36)}`,
      vendor_link_expires_at: daysFromNow(rng.int(10, 60)),
      category: v.criticality === "medium" || v.criticality === "low" ? "Services" : "Cloud & Hosting",
      priority: v.criticality === "very high" || v.criticality === "high" ? "high" : "normal",
      version: 1,
      direction: "outbound",
      answered_by: done ? userId : null,
      approved_at: done && rng.chance(0.6) ? agoDays(rng.int(1, 20)) : null,
      approved_by: done && rng.chance(0.6) ? userId : null,
      created_at: agoDays(sentAgo),
      updated_at: agoDays(rng.int(0, Math.max(1, sentAgo - 1))),
    })}`;
}
console.log(JSON.stringify({ questionnaires: TARGETS.length }));
await sql.end();

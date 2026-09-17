/**
 * Completes vendor mgmt seeding: questionnaires, assessment templates, assessment requests.
 * Assumes contracts already exist. Idempotent per part.
 */
import postgres from "postgres";
import { Rng, agoDays, daysFromNow } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const clientId = parseInt(process.argv[2] || "788", 10);
const rng = new Rng(9950 + clientId);

const existingVendors = await sql`SELECT id, name, criticality FROM vendors WHERE client_id=${clientId} ORDER BY id`;
const emps = await sql`SELECT first_name, last_name FROM employees WHERE client_id=${clientId}`;
const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };
const [owner] = await sql`SELECT user_id FROM user_clients WHERE client_id=${clientId}`;
const userId = owner.user_id;

function slugDomain(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) + ".example";
}
function slugFile(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ============ SECURITY QUESTIONNAIRES ============
const qExisting = await sql`SELECT count(*)::int n FROM questionnaires WHERE client_id=${clientId} AND direction='outbound'`;
if (qExisting[0].n === 0) {
  const Q_TARGETS = [
    ["Microsoft Ireland Operations Ltd", "completed", 92],
    ["Amazon Web Services EMEA SARL", "completed", 96],
    ["Webfleet Solutions BV", "submitted", null],
    ["Datev eG", "completed", 88],
    ["Personio GmbH", "in_progress", null],
    ["Zendesk (EU instance)", "viewed", null],
    ["Wasabi Technologies (EU region)", "completed", 84],
    ["Seeburger AG", "sent", null],
    ["Fortinet Distribution Partner", "overdue", null],
    ["Zebra Technologies", "completed", 71],
    ["idha.online (RIO)", "sent", null],
    ["Vercel Inc. (EU edge)", "viewed", null],
  ];
  for (const [vendorName, status, score] of Q_TARGETS) {
    const v = existingVendors.find(x => x.name === vendorName);
    if (!v) continue;
    const sentAgo = rng.int(status === "sent" ? 2 : 20, status === "overdue" ? 90 : 150);
    const done = ["completed", "submitted"].includes(status);
    await sql`
      INSERT INTO questionnaires ${sql({
        client_id: clientId,
        name: `Security Questionnaire 2026 — ${v.name}`,
        sender_name: empName(),
        product_name: "GRC Vendor Assurance",
        status,
        progress: done ? 100 : status === "in_progress" ? rng.int(20, 70) : status === "viewed" ? 5 : 0,
        due_date: daysFromNow(status === "overdue" ? -rng.int(5, 40) : rng.int(5, 45)),
        owner_id: userId,
        vendor_name: v.name,
        vendor_email: `security@${slugDomain(v.name)}`,
        vendor_token: `tok_${rng.next().toString(36).slice(2)}${Date.now().toString(36)}`,
        vendor_link_expires_at: daysFromNow(rng.int(10, 60)),
        category: v.criticality === "medium" || v.criticality === "low" ? "Hardware & OT" : "Cloud & SaaS",
        priority: v.criticality === "very high" || v.criticality === "high" ? "high" : "normal",
        version: 1,
        direction: "outbound",
        answered_by: done ? userId : null,
        approved_at: status === "completed" && rng.chance(0.6) ? agoDays(rng.int(1, 20)) : null,
        approved_by: status === "completed" && rng.chance(0.6) ? userId : null,
        created_at: agoDays(sentAgo),
        updated_at: agoDays(rng.int(0, Math.max(1, sentAgo - 1))),
      })}`;
  }
  console.log("questionnaires:", Q_TARGETS.length);
}

// ============ ASSESSMENT TEMPLATES ============
await sql`DELETE FROM vendor_assessment_templates WHERE client_id=${clientId} AND created_by=${userId}`;
const TEMPLATES = [
  ["Standard Security Assessment v3", "Baseline questionnaire for all new vendors: ISO 27001 controls alignment, hosting model, encryption, incident response process, subprocessors. Auto-scores responses.", JSON.stringify({
    sections: [
      { title: "Company & Certifications", questions: ["Do you hold ISO 27001 or SOC 2 Type II?", "List all subprocessors with data access."] },
      { title: "Data Handling", questions: ["Where is customer data stored and processed?", "Is data encrypted at rest and in transit?"] },
      { title: "Incident Response", questions: ["What is your breach notification commitment?", "Describe your IR plan testing cadence."] },
    ],
  })],
  ["Critical Vendor Deep-Dive Assessment", "Extended assessment for very-high-criticality vendors: pen-test summaries, BCP evidence, SDLC maturity, zero-trust roadmap.", JSON.stringify({
    sections: [
      { title: "Architecture & Isolation", questions: ["Describe your tenant isolation model.", "Provide latest penetration test executive summary."] },
      { title: "Resilience", questions: ["RTO/RPO commitments?", "Last DR test date and outcome?"] },
      { title: "SDLC", questions: ["Static analysis in CI?", "Signed releases / SBOM provided?"] },
    ],
  })],
  ["Annual Reassessment (Lite)", "Lightweight annual reconfirmation: changes in ownership, certifications, subprocessors, incidents in last 12 months.", JSON.stringify({
    sections: [
      { title: "Changes Since Last Assessment", questions: ["Any change of control or ownership?", "New subprocessors added?", "Reportable incidents in the last 12 months?"] },
    ],
  })],
  ["Privacy (GDPR) Processor Assessment", "Art. 28 focused: legal basis mapping, transfer mechanisms, DSR support, retention practices, TOMs evidence.", JSON.stringify({
    sections: [
      { title: "GDPR Compliance", questions: ["Transfer mechanism for any non-EU processing?", "DSR support process and turnaround?", "Retention schedule per data category?"] },
    ],
  })],
];
for (const [name, description, content] of TEMPLATES) {
  await sql`
    INSERT INTO vendor_assessment_templates ${sql({
      client_id: clientId,
      name, description,
      content,
      created_by: userId,
    })}`;
}
console.log("templates:", TEMPLATES.length);

// ============ ASSESSMENT REQUESTS ============
const templateIds = (await sql`SELECT id FROM vendor_assessment_templates WHERE client_id=${clientId}`).map(r => r.id);
const aExisting = await sql`SELECT count(*)::int n FROM vendor_assessment_requests WHERE client_id=${clientId}`;
if (aExisting[0].n === 0) {
  const ASSESSMENTS = [
    ["Microsoft Ireland Operations Ltd", "completed", 94],
    ["Amazon Web Services EMEA SARL", "completed", 97],
    ["Webfleet Solutions BV", "completed", 81],
    ["Datev eG", "in_progress", null],
    ["Personio GmbH", "completed", 86],
    ["Wasabi Technologies (EU region)", "completed", 89],
    ["Seeburger AG", "overdue", null],
    ["Zebra Technologies", "pending", null],
    ["idha.online (RIO)", "completed", 74],
  ];
  for (const [vendorName, status, score] of ASSESSMENTS) {
    const v = existingVendors.find(x => x.name === vendorName);
    if (!v) continue;
    const done = status === "completed";
    await sql`
      INSERT INTO vendor_assessment_requests ${sql({
        client_id: clientId,
        vendor_id: v.id,
        template_id: rng.pick(templateIds),
        token: `va_${rng.next().toString(36).slice(2)}${Date.now().toString(36)}`,
        recipient_email: `compliance@${slugDomain(v.name)}`,
        status,
        score: done ? score : null,
        responses: done ? JSON.stringify({ note: `${rng.int(14, 38)} questions answered; evidence attached.` }) : JSON.stringify({}),
        sent_at: agoDays(rng.int(15, 120)),
        expires_at: daysFromNow(rng.int(5, 45)),
        viewed_at: ["viewed", "in_progress", "completed", "submitted", "overdue"].includes(status) ? agoDays(rng.int(1, 30)) : null,
        submitted_at: done ? agoDays(rng.int(1, 25)) : null,
        completed_at: done ? agoDays(rng.int(1, 15)) : null,
        created_by: userId,
      })}`;
  }
  console.log("assessments:", ASSESSMENTS.length);
}

console.log(JSON.stringify({ done: true }));
await sql.end();

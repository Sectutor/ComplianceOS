/**
 * Phase 5e: Risk Framework settings — scope, context, methodology,
 * impact/likelihood criteria matrices, risk tolerance, KRIs.
 * Idempotent per client. Usage: node --env-file=../../.env scripts/demo-seed/seed-risk-framework.mjs [clientId]
 */
import postgres from "postgres";
import { Rng, agoDays } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const clientId = parseInt(process.argv[2] || "788", 10);
const rng = new Rng(9700 + clientId);

// idempotency
const ex = await sql`SELECT count(*)::int n FROM risk_settings WHERE client_id=${clientId}`;
if (ex[0].n > 0) {
  console.log(JSON.stringify({ skipped: true }));
  await sql.end();
  process.exit(0);
}

const emps = await sql`SELECT first_name, last_name FROM employees WHERE client_id=${clientId}`;
const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };

const IMPACT_CRITERIA = [
  { level: 1, name: "Negligible", description: "No material impact; handled within normal operations. No personal data affected, no customer-visible disruption." },
  { level: 2, name: "Minor", description: "Limited impact on a single team or system; short degradation of non-critical service; <10 data subjects marginally affected." },
  { level: 3, name: "Moderate", description: "Noticeable operational disruption or single business process halted for hours; limited personal data exposure; regulatory inquiry possible." },
  { level: 4, name: "Major", description: "Business-critical process outage exceeding a day, reportable personal data breach, significant financial loss or contractual penalty exposure." },
  { level: 5, name: "Severe", description: "Enterprise-wide disruption, mass data compromise, regulatory enforcement action, existential reputational damage or threat to service continuity." },
];

const LIKELIHOOD_CRITERIA = [
  { level: 1, name: "Rare", description: "Conceivable but unlikely within 5 years; would require multiple simultaneous control failures." },
  { level: 2, name: "Unlikely", description: "Could occur within 2-3 years; historical industry incidents exist but strong controls reduce probability." },
  { level: 3, name: "Possible", description: "May occur within 12-24 months; comparable organizations experience this periodically." },
  { level: 4, name: "Likely", description: "Expected within 12 months without additional treatment; active threats or known gaps exist." },
  { level: 5, name: "Almost Certain", description: "Expected within months or occurs repeatedly; exploit is trivial and targets are actively attacked." },
];

const RISK_TOLERANCE = [
  { category: "Operational", threshold: "Residual score ≤ 4 acceptable; >6 requires immediate treatment plan", unit: "score" },
  { category: "Financial", threshold: "Single-event loss appetite €250k; aggregate annual ≤ €1M", unit: "EUR" },
  { category: "Regulatory", threshold: "Zero tolerance for willful violations; near-misses reported to DPO within 48h", unit: "count" },
  { category: "Reputational", threshold: "No public disclosure events tolerated without executive comms plan", unit: "events/yr" },
  { category: "Data Protection", threshold: "No unencrypted PII stores; DSAR turnaround ≤ 30 days at ≥98%", unit: "percent" },
];

await sql`
  INSERT INTO risk_settings ${sql({
    client_id: clientId,
    scope: "The ISMS scope covers all information assets supporting freight management, warehouse operations and corporate functions across Munich (HQ/DC-1), Hamburg and Rotterdam sites, plus cloud workloads in AWS eu-central-1. Excludes marketing website hosting and BYOD devices without corporate data access.",
    context: `Internal context: ~250 staff, flat hierarchy with centralized IT (12 FTE) and a 6-person security function under the CISO. Business driven by seasonal fulfilment peaks with tight delivery SLAs. External context: strict retail-customer security requirements in MSAs, EU regulatory landscape (GDPR, NIS2, upcoming AI Act obligations), active ransomware targeting logistics sector, dependency on subcontracted carriers sharing shipment data.`,
    risk_appetite: "Overall appetite is MODERATE-LOW: the organization accepts residual risks scoring up to 4 (Medium) where treatment cost is disproportionate, but tolerates nothing above 6 without executive sign-off. Cyber-insurance transfers part of the financial exposure; zero appetite for willful compliance violations.",
    methodology: "ISO 27005 qualitative 5x5 matrix (likelihood x impact). Residual risk after documented control effectiveness. >=15 Very High, 10-14 High, 5-9 Medium, <=4 Low. Reviewed annually or on significant change; top risks quarterly by the steering committee.",
    impact_criteria: JSON.stringify(IMPACT_CRITERIA),
    likelihood_criteria: JSON.stringify(LIKELIHOOD_CRITERIA),
    risk_tolerance: JSON.stringify(RISK_TOLERANCE),
  })} RETURNING id`;

// KRIs
const existingKris = await sql`SELECT count(*)::int n FROM kris WHERE client_id=${clientId}`;
let kriCount = 0;
if (existingKris[0].n === 0) {
  const KRIS = [
    ["Phishing simulation click rate", "Percentage of staff clicking simulated phishing links in monthly campaigns", 2, 5, 10, rng.int(1, 9)],
    ["Critical vulnerabilities open >14 days", "Count of critical CVEs past remediation SLA", 0, 3, 7, rng.int(0, 6)],
    ["Backup restore test success rate", "Percent of scheduled restore tests completing successfully", 95, 85, 70, rng.int(70, 100)],
    ["Mean time to detect (MTTD) security events", "Hours from initial compromise indicator to triage", 4, 12, 24, rng.int(3, 20)],
    ["Overdue access reviews", "Count of user-access certification items past due date", 0, 10, 25, rng.int(0, 22)],
    ["Policy acknowledgment completion", "Percent of staff with current policy acknowledgments", 98, 90, 80, rng.int(78, 100)],
  ];
  for (const [name, description, green, amber, red, current] of KRIS) {
    const status = current >= green ? "green" : current >= amber ? "amber" : "red";
    await sql`
      INSERT INTO kris ${sql({
        client_id: clientId,
        name, description,
        status: "active",
        threshold_green: green, threshold_amber: amber, threshold_red: red,
        current_value: current, current_status: status,
        owner: empName(),
        last_updated: agoDays(rng.int(1, 14)),
      })}`;
    kriCount++;
  }
}

console.log(JSON.stringify({ risk_settings: 1, kris: kriCount }));
await sql.end();

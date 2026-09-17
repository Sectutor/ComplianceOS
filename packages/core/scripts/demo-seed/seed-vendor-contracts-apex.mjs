/**
 * Seeds vendor contracts for Apex (789) — US federal-flavor contract set.
 */
import postgres from "postgres";
import { Rng, agoDays, daysFromNow } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const clientId = parseInt(process.argv[2] || "789", 10);
const rng = new Rng(9975 + clientId);

const ex = await sql`SELECT count(*)::int n FROM vendor_contracts WHERE client_id=${clientId}`;
if (ex[0].n > 0) { console.log(JSON.stringify({ skipped: true })); await sql.end(); process.exit(0); }

const vendors = await sql`SELECT id, name, criticality FROM vendors WHERE client_id=${clientId} ORDER BY id`;
const emps = await sql`SELECT first_name, last_name FROM employees WHERE client_id=${clientId}`;
const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };

const CONTRACTS = [
  ["AWS GovCloud Support — Business Tier", "very high", 210000, "active", "24/7 support for GovCloud landing zone, EKS, RDS and KMS. FedRAMP-inherited controls documented.", "N/A (rolling)", "Monthly", "15-min P1 response"],
  ["Splunk Enterprise Security License & Maintenance", "very high", 185000, "active", "SIEM licensing per GB/day ingest; ES app; annual TrueForward review.", "60 days", "Annual", "N/A"],
  ["Tanium Subscription — Endpoint Operations", "high", 96000, "active", "Endpoint discovery, patch enforcement and real-time queries across enclave VDIs and corporate.", "90 days", "Annual", "4h P1 support"],
  ["Deltek Costpoint SaaS & Hosting", "high", 78000, "active", "Federal contract billing, CLIN tracking, DFARS clause library hosting.", "90 days", "Annual", "99.5% availability"],
  ["Atlassian Government Cloud Subscription", "medium", 34000, "active", "Jira/Confluence Gov for program documentation; CUI-free usage policy enforced.", "30 days", "Annual", "99.9% uptime"],
  ["Skillsoft Training Licenses", "medium", 22000, "active", "Annual security awareness + role-based cleared personnel training.", "30 days", "Annual", "Completion reporting SLA"],
  ["Iron Mountain Tape Vault Services", "medium", 15500, "active", "Offsite immutable tape rotation with chain-of-custody logging.", "60 days", "Quarterly", "4-hour emergency retrieval"],
  ["Expedient Colocation — DR Site", "high", 64000, "active", "Warm DR cage, cross-connects to GovCloud DX links, generator backup.", "90 days", "Monthly", "99.95% power SLA"],
  ["CrowdStrike IR Retainer", "medium", 30000, "active", "2-hour remote IR response retainer with annual tabletop included.", "N/A", "Annual", "2h remote activation"],
  ["Carahsoft Reseller Agreement", "low", 0, "draft", "Master reseller agreement under negotiation for consolidated procurement.", "—", "—", "—"],
];

for (const [title, crit, value, status, description, notice, payment, sla] of CONTRACTS) {
  const pool = vendors.filter(v => v.criticality === crit);
  const v = pool.length ? rng.pick(pool) : rng.pick(vendors);
  const active = status === "active";
  await sql`
    INSERT INTO vendor_contracts ${sql({
      client_id: clientId,
      vendor_id: v.id,
      title,
      description,
      start_date: agoDays(active || status === "expired" ? rng.int(100, 700) : 0),
      end_date: active ? daysFromNow(rng.int(60, 500)) : agoDays(rng.int(10, 90)),
      auto_renew: rng.chance(0.5),
      value,
      status,
      document_url: `repo://contracts/${v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      notice_period: notice,
      payment_terms: payment,
      sla_details: sla,
      dpa_status: "not_required",
      owner: empName(),
      created_at: agoDays(rng.int(200, 800)),
      updated_at: agoDays(rng.int(0, 45)),
    })}`;
}
console.log(JSON.stringify({ contracts: CONTRACTS.length }));
await sql.end();

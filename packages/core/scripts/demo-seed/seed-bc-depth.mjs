/**
 * Phase 5g: Business Continuity depth — business processes, BIAs,
 * strategies, plan approvals, training records.
 * Idempotent per client. Usage: node --env-file=../../.env scripts/demo-seed/seed-bc-depth.mjs [clientId]
 */
import postgres from "postgres";
import { Rng, agoDays, daysFromNow } from "./util.mjs";

const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const clientId = parseInt(process.argv[2] || "788", 10);
const rng = new Rng(9960 + clientId);

const emps = await sql`SELECT id, first_name, last_name FROM employees WHERE client_id=${clientId}`;
const empName = () => { const e = rng.pick(emps); return `${e.first_name} ${e.last_name}`; };
const empId = () => rng.pick(emps).id;
const [owner] = await sql`SELECT user_id FROM user_clients WHERE client_id=${clientId}`;
const userId = owner.user_id;

// ============ BUSINESS PROCESSES ============
const bpEx = await sql`SELECT count(*)::int n FROM business_processes WHERE client_id=${clientId}`;
if (bpEx[0].n === 0) {
  // columns: name, description, owner_id, department, criticality_tier, rto, rpo, mtpd
  const PROCESSES = [
    ["Freight Order Intake & Dispatch", "Receiving customer orders, assigning trucks and routes via CargoTrack TMS", "Warehouse & Fleet Operations", 1, 8, 1, 8],
    ["Warehouse Picking & Packing", "Physical goods handling across Munich/Hamburg/Rotterdam cross-docks via WMS", "Warehouse & Fleet Operations", 1, 48, 4, 72],
    ["Customer Portal Operations", "Self-service bookings, tracking and invoices for 400+ retail customers", "Software Engineering", 1, 12, 2, 24],
    ["Payroll Processing", "Bi-weekly payroll for ~250 staff via Datev interface", "Finance & Controlling", 2, 120, 24, 240],
    ["Billing & Accounts Receivable", "Invoice generation from shipment events; dunning and collections", "Finance & Controlling", 2, 96, 24, 168],
    ["Fleet Compliance Management", "EU driving-time compliance, tachograph analysis for 140 trucks", "Warehouse & Fleet Operations", 2, 72, 24, 120],
    ["Customer Support Desk", "Ticket-based support via Zendesk", "Customer Service", 3, 48, 8, 96],
    ["Supplier Payments", "Vendor invoice processing and payment execution", "Finance & Controlling", 2, 96, 24, 144],
    ["HR Onboarding & Offboarding", "Employee lifecycle: contracts, access provisioning, equipment", "Human Resources", 3, 240, 48, 480],
    ["Management Reporting", "Weekly KPI reporting to leadership via Power BI", "Executive Leadership", 3, 336, 168, 720],
  ];
  const tiers = { 1: "Tier 1 — Mission Critical", 2: "Tier 2 — Essential", 3: "Tier 3 — Important" };
  for (const [name, description, dept, tier, rto, rpo, mtpd] of PROCESSES) {
    await sql`
      INSERT INTO business_processes ${sql({
        client_id: clientId,
        name, description,
        owner_id: empId(),
        department: dept,
        criticality_tier: tiers[tier],
        rto: `${rto}h`,
        rpo: `${rpo}h`,
        mtpd: `${mtpd}h`,
      })}`;
  }
  console.log("business_processes:", PROCESSES.length);
}

// ============ BIAS ============
const biaEx = await sql`SELECT count(*)::int n FROM business_impact_analyses WHERE client_id=${clientId}`;
if (biaEx[0].n === 0) {
  const procRows = await sql`SELECT id, name FROM business_processes WHERE client_id=${clientId} ORDER BY id`;
  const pick = (i) => procRows.length ? procRows[i % procRows.length] : null;
  const BIAS = [
    ["BIA — Freight Order & Dispatch", "Quantified downtime impact for order-to-dispatch across peak and off-peak seasons.", "completed",
      JSON.stringify({ peakDailyRevenueAtRiskEUR: 185000, offPeakDailyRevenueAtRiskEUR: 92000, reputationalImpact: "High — retail SLA penalties and re-tender after major outages", dependencies: ["AWS eu-central-1", "EDI partners", "Driver connectivity"], maximumTolerableDowntimeHours: 8 })],
    ["BIA — Warehouse Operations", "Impact assessment for WMS unavailability across three cross-dock sites.", "completed",
      JSON.stringify({ manualWorkaroundPossible: true, throughputLossPercent: 65, maxTolerableDowntimeHours: 48, keyFinding: "Paper picking sustainable max 2 days" })],
    ["BIA — Payroll & Finance", "Finance process outage impact relative to statutory deadlines.", "in_progress",
      JSON.stringify({ statutoryDeadlineRisk: "Missed payroll triggers labor-law exposure within one cycle", maxTolerableDowntimeDays: 5 })],
    ["BIA — Customer Portal", "Portal availability impact on retail customer experience and order capture.", "planned",
      JSON.stringify({ note: "Scheduled next quarter; initial scoping done" })],
  ];
  let i = 0;
  for (const [title, status, analysisJson] of BIAS) {
    const descStart = title;
    const proc = pick(i++);
    await sql`
      INSERT INTO business_impact_analyses ${sql({
        client_id: clientId,
        title: descStart,
        status,
        methodology: "Interview + quantitative downtime modeling",
        conductor_id: userId,
        approved_by: status === "completed" && rng.chance(0.6) ? userId : null,
        approved_at: status === "completed" && rng.chance(0.6) ? agoDays(rng.int(5, 60)) : null,
        process_id: proc?.id ?? null,
      })}`.catch(async (e) => {
        console.log("bia insert fallback:", e.message.slice(0, 80));
      });
  }
  console.log("bias:", BIAS.length);
}

// ============ BC STRATEGIES ============
const stratEx = await sql`SELECT count(*)::int n FROM bc_strategies WHERE client_id=${clientId}`;
if (stratEx[0].n === 0) {
  // columns: title, description, resource_requirements, estimated_cost, benefits, approval_status
  const STRATS = [
    ["CargoTrack Multi-AZ Failover", "Technology strategy: Aurora multi-AZ with automated failover; API gateway blue/green; Route53 health checks.", "AWS multi-AZ Aurora, Route53, blue/green deployment pipeline", 85000, "RTO 4h → 15min for core platform"],
    ["Immutable Backup Restoration", "Backup strategy: Veeam immutable Wasabi repository; tier-1 VMs restored to DC-2 within RPO 1h.", "Wasabi object-lock storage, DC-2 capacity reservation", 28000, "Guaranteed clean recovery copy immune to ransomware"],
    ["Manual Warehouse Operations Mode", "Process strategy: paper picking kits pre-positioned at each site; supervisor-led manual dispatch protocol.", "Pre-printed picking kits, laminated SOPs, supervisor training", 8000, "Sustains 35% throughput for up to 48h without WMS"],
    ["Alternate Carrier Routing", "Supplier strategy: pre-contracted standby carriers covering top-10 routes during fleet disruption.", "Standby carrier framework contracts (3 providers)", 15000, "Route continuity within 24h of fleet loss"],
    ["Crisis Communication Protocol", "Organizational strategy: notification tree with SMS+voice cascade; customer templates pre-approved by legal.", "Mass-notification tool, maintained contact tree, template library", 6000, "All stakeholders informed within 2h of activation"],
  ];
  for (const [title, description, resource_requirements, estimated_cost, benefits] of STRATS) {
    await sql`
      INSERT INTO bc_strategies ${sql({
        client_id: clientId,
        title, description,
        resource_requirements, estimated_cost, benefits,
        approval_status: rng.weighted([["approved", 70], ["pending", 30]]),
      })}`;
  }
  console.log("bc_strategies:", STRATS.length);
}

// ============ PLAN APPROVALS ============
const apprEx = await sql`SELECT count(*)::int n FROM bc_approvals WHERE client_id=${clientId}`;
if (apprEx[0].n === 0) {
  const plans = await sql`SELECT id FROM bc_plans WHERE client_id=${clientId}`;
  for (const p of plans.slice(0, 3)) {
    await sql`
      INSERT INTO bc_approvals ${sql({
        client_id: clientId,
        entity_type: "bc_plan",
        entity_id: p.id,
        approver_id: userId,
        status: rng.weighted([["approved", 70], ["pending", 30]]),
        requested_at: agoDays(rng.int(10, 90)),
        responded_at: rng.chance(0.7) ? agoDays(rng.int(1, 60)) : null,
        comments: rng.chance(0.5) ? "Reviewed against latest org chart and test results." : null,
      })}`.catch(() => {});
  }
  console.log("bc_approvals attempted:", Math.min(3, plans.length));
}

// ============ BC TRAINING RECORDS ============
const trEx = await sql`SELECT count(*)::int n FROM bc_training_records WHERE client_id=${clientId}`;
if (trEx[0].n === 0) {
  for (const e of emps.slice(0, 15)) {
    await sql`
      INSERT INTO bc_training_records ${sql({
        client_id: clientId,
        user_id: userId,
        employee_ref: e.id,
        training_type: rng.pick(["tabletop_exercise", "awareness_briefing", "role_specific"]),
        completion_date: agoDays(rng.int(10, 200)),
        expiry_date: daysFromNow(rng.int(100, 400)),
        status: "completed",
        notes: `Annual BC training — ${e.first_name} ${e.last_name}`,
      })}`.catch(async () => {
        await sql`
          INSERT INTO bc_training_records ${sql({
            client_id: clientId,
            user_id: userId,
            training_type: rng.pick(["tabletop_exercise", "awareness_briefing", "role_specific"]),
            completion_date: agoDays(rng.int(10, 200)),
            expiry_date: daysFromNow(rng.int(100, 400)),
            status: "completed",
            notes: `Annual BC training`,
          })}`;
      });
  }
  console.log("bc_training_records: up to 15");
}

console.log(JSON.stringify({ done: true }));
await sql.end();

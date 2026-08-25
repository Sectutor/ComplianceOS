/**
 * Incident-response demo seed (GAP-16 proper fix).
 *
 * Seeds realistic CLOSED incidents + one completed tabletop exercise so the
 * IR module demonstrates capability during prospect demos (ISO 27001 / NIS2
 * both demand *demonstrated* incident handling).
 *
 * Idempotent: skips when incidents already exist for the tenant.
 * Reset-safe: index.mjs --reset wipes every client_id table incl.
 * incidents/plan_exercises/bc_plans before re-seeding.
 *
 * Usage (wired in index.mjs): called for tenant nordwind after phase4.
 */
import { bulkInsert, agoDays, daysFromNow, log } from "./util.mjs";

export async function seedIncidentResponse(sql, clientId) {
  const out = {};

  // ---- Idempotency guard -------------------------------------------------
  const existing = await sql`
    SELECT id FROM incidents WHERE client_id = ${clientId} LIMIT 1`;
  if (existing.length > 0) {
    log(`ir-seed: incidents already present for client ${clientId} - skipping`);
    return { skipped: true };
  }

  // ---- Ensure a BC/DR plan exists to anchor the exercise -----------------
  let bcPlan = (await sql`
    SELECT id FROM bc_plans WHERE client_id = ${clientId} ORDER BY id LIMIT 1`)[0];

  if (!bcPlan) {
    await bulkInsert(sql, "bc_plans",
      ["client_id", "title", "version", "status", "last_tested_date", "next_test_date", "content"],
      [{
        client_id: clientId,
        title: "Nordwind Logistics GmbH - Business Continuity & Disaster Recovery Plan",
        version: "2.1",
        status: "approved",
        last_tested_date: agoDays(45),
        next_test_date: daysFromNow(320),
        content: "Covers CargoTrack TMS failover (RTO 4h), WMS offline-picking procedure (Hamburg/Rotterdam/Munich), EDI fallback mailbox, and crisis-communication tree. Reviewed annually by Information Security.",
      }]);
    bcPlan = (await sql`
      SELECT id FROM bc_plans WHERE client_id = ${clientId} ORDER BY id LIMIT 1`)[0];
    out.bc_plan_created = 1;
  }
  const planId = bcPlan.id;

  // ---- Incidents (all closed/resolved, realistic MTTR-consistent dates) --
  // Note: incidents table has no resolved_at column; resolution time is
  // reflected via status='resolved' + updated_at.
  const incidentRows = [
    {
      // 1) Phishing campaign - Rotterdam office (~120 days ago)
      client_id: clientId,
      title: "Phishing campaign targeting Rotterdam office payroll",
      detected_at: agoDays(121),
      severity: "high",
      is_significant: false,
      significance_criteria: JSON.stringify([]),
      affected_users_count: 9,
      service_disruption_duration: 0,
      estimated_financial_loss: 0,
      is_continuity_triggered: false,
      early_warning_sent_at: null,
      intermediate_report_sent_at: null,
      final_report_sent_at: null,
      cause: "phishing",
      description:
        "Credential-harvesting wave (28 recipients, 9 submissions) impersonating the payroll portal ahead of the holiday bonus run. Mail gateway quarantined the campaign 40 minutes after first delivery; submitted credentials reset within 2h, sessions revoked, MFA re-enrolment forced for the affected group. No lateral movement observed in EDR telemetry.",
      affected_assets: "M365 tenant (Rotterdam mailboxes), 9 user accounts",
      cross_border_impact: false,
      status: "resolved",
      reported_to_authorities: false,
      reporter_name: "Bram Van Dijk",
      updated_at: agoDays(119),
      created_at: agoDays(121),
    },
    {
      // 2) CargoTrack API outage (~60 days ago) - crossed Art. 23(3) thresholds
      client_id: clientId,
      title: "CargoTrack API outage disrupting fulfilment for retail customers",
      detected_at: agoDays(61),
      severity: "critical",
      is_significant: true,
      significance_criteria: JSON.stringify(["operational_disruption", "third_party_impact"]),
      affected_users_count: 412,
      service_disruption_duration: 165,
      estimated_financial_loss: 1_800_000, // cents (EUR 18k)
      is_continuity_triggered: true,
      early_warning_sent_at: agoDays(61), // well inside 24h
      intermediate_report_sent_at: agoDays(61),
      final_report_sent_at: agoDays(52),
      cause: "system_failure",
      description:
        "Connection-pool exhaustion in the CargoTrack TMS API gateway took order intake offline for 165 minutes during peak picking hours. Offline-picking procedure activated per BCP; backlog cleared within 6h. Root cause: missing pool recycling after a vendor-side load-balancer change; fix deployed and alerting added at 80% saturation.",
      affected_assets: "CargoTrack TMS API gateway, order-intake queue, e-commerce fulfilment unit",
      cross_border_impact: true, // NL + DE fulfilment customers affected
      status: "resolved",
      reported_to_authorities: true,
      reporter_name: "Rafael Ostermann",
      updated_at: agoDays(52),
      created_at: agoDays(61),
    },
    {
      // 3) Ransomware precursor - Hamburg WMS (~20 days ago)
      client_id: clientId,
      title: "Ransomware precursor stopped on Hamburg WMS application server",
      detected_at: agoDays(21),
      severity: "critical",
      is_significant: true,
      significance_criteria: JSON.stringify(["operational_disruption"]),
      affected_users_count: 34,
      service_disruption_duration: 95,
      estimated_financial_loss: 450_000, // cents (EUR 4.5k)
      is_continuity_triggered: true,
      early_warning_sent_at: agoDays(21),
      intermediate_report_sent_at: agoDays(20),
      final_report_sent_at: agoDays(14),
      cause: "malware",
      description:
        "EDR flagged mass file-encryption behaviour (LockBit 3.0 variant) launched from a compromised jump host reached via an unpatched SFTP service. Host isolated automatically in under 60 seconds; encryption limited to one staging share restored from snapshot. Patching window closed and threat-hunt sweep across all sites came back clean.",
      affected_assets: "Hamburg WMS app server, SFTP jump host, staging file share",
      cross_border_impact: false,
      status: "resolved",
      reported_to_authorities: true,
      reporter_name: "Rafael Ostermann",
      updated_at: agoDays(14),
      created_at: agoDays(21),
    },
  ];

  out.incidents = await bulkInsert(sql, "incidents",
    ["client_id", "title", "detected_at", "severity", "is_significant", "significance_criteria",
     "affected_users_count", "service_disruption_duration", "estimated_financial_loss",
     "is_continuity_triggered", "early_warning_sent_at", "intermediate_report_sent_at",
     "final_report_sent_at", "cause", "description", "affected_assets", "cross_border_impact",
     "status", "reported_to_authorities", "reporter_name", "updated_at", "created_at"],
    incidentRows);

  // ---- Completed tabletop exercise ----------------------------------------
  const exerciseRows = [{
    client_id: clientId,
    plan_id: planId,
    title: "Nordwind IR tabletop: ransomware in cross-dock operations",
    type: "tabletop",
    conductor_id: null,
    status: "completed",
    outcome: "passed-with-findings",
    notes:
      "Scenario: LockBit detonation simultaneously affecting Hamburg WMS and CargoTrack failover. Decision points exercised: activation criteria, offline-picking switch, 24h/72h NIS2 notification drafting, customer communication. Findings: (1) crisis-bridge dial-in conflicted with warehouse radio channel plan - alternate bridge documented; (2) legal review contact for NL authority missing on-call rota - added; (3) evidence-preservation step not timed - stopwatch role assigned. Follow-ups tracked below.",
    follow_up_tasks: JSON.stringify([
      "Update crisis-communication tree with alternate bridge number (owner: R. Ostermann)",
      "Add NL data-protection authority escalation contact to on-call rota (owner: Dr. A. Brandt)",
      "Schedule walkthrough of offline-picking switch in Munich site (owner: B. Van Dijk)",
    ]),
    report_url: null,
    created_at: agoDays(50),
    updated_at: agoDays(45),
    start_date: agoDays(45),
  }];

  out.plan_exercises = await bulkInsert(sql, "plan_exercises",
    ["client_id", "plan_id", "title", "type", "conductor_id", "status", "outcome", "notes",
     "follow_up_tasks", "report_url", "created_at", "updated_at", "start_date"],
    exerciseRows);

  log(`ir-seed:`, JSON.stringify(out));
  return out;
}

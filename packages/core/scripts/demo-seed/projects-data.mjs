/**
 * Security projects data + seeder (shared by standalone script and orchestrator).
 * 12 projects spanning full lifecycle: 2 completed, 6 in_progress, 2 planning, 1 testing, 1 blocked.
 */
import { Rng, agoDays, daysFromNow } from "./util.mjs";

export const SECURITY_PROJECTS = [
  {
    name: "Zero Trust Network Architecture Rollout",
    description:
      "Replace flat network model with zero trust segmentation across data centers, warehouses and cloud VPCs. Includes identity-aware proxy in front of internal apps, device posture checks via EDR + MDM signals, and micro-segmentation of operational/EDI zones. Drives implementation of ISO A.8.20–A.8.22 and reduces lateral-movement risk identified in the risk register.",
    project_type: "infra", security_criticality: "critical", status: "in_progress",
    ownerDept: "Information Security", startAgo: 90, endIn: 120,
    tasks: [
      ["Define segmentation policy & zone model (prod / corp / OT / guest)", "done", "high"],
      ["Deploy identity-aware proxy pilot for internal admin apps", "in_progress", "high"],
      ["Enforce device posture check for remote access", "in_progress", "medium"],
      ["Micro-segment warehouse and EDI gateway VLANs", "todo", "critical"],
      ["Roll out conditional access to service accounts", "todo", "medium"],
      ["Update network diagrams & asset register after re-segmentation", "backlog", "low"],
    ],
  },
  {
    name: "ISO 27001 Certification Readiness — Evidence Automation",
    description:
      "Close remaining Stage-1 gaps: automate evidence collection for access reviews, backup verification and vulnerability scan reports; complete SoA justifications for all excluded controls; run internal audit program dry-run and management review. Directly supports the certification goal set in the onboarding readiness assessment.",
    project_type: "it", security_criticality: "high", status: "in_progress",
    ownerDept: "Legal & Compliance", startAgo: 45, endIn: 75,
    tasks: [
      ["Complete SoA justification review for excluded controls", "in_progress", "high"],
      ["Automate quarterly access-review evidence export", "in_progress", "high"],
      ["Schedule & document internal audit dry-run", "todo", "critical"],
      ["Backfill evidence packages for implemented Annex A controls", "review", "medium"],
      ["Management review meeting — present readiness scorecard", "todo", "high"],
    ],
  },
  {
    name: "Phishing-Resistant MFA Migration (FIDO2)",
    description:
      "Eliminate phishing-susceptible OTP factors: roll out FIDO2 security keys to privileged users and passkeys to general staff, retire SMS/OTP, and enforce phishing-resistant authentication in conditional access policies. Addresses credential-theft risks from the phishing threat scenario and satisfies ISO A.5.17 / A.8.5.",
    project_type: "it", security_criticality: "critical", status: "completed",
    ownerDept: "IT Operations", startAgo: 240, endIn: -30,
    tasks: [
      ["Inventory MFA methods & identify OTP/SMS users", "done", "high"],
      ["Procure & register FIDO2 keys for admins/executives", "done", "high"],
      ["Passkey rollout campaign for all staff", "done", "medium"],
      ["Disable SMS/OTP in conditional access", "done", "critical"],
      ["Exception process documented for legacy service accounts", "done", "medium"],
    ],
  },
  {
    name: "EDR Coverage Expansion to Servers & OT",
    description:
      "Extend EDR agent fleet from endpoints to all servers and jump hosts; evaluate constrained-application mode for warehouse handhelds; integrate EDR detections with SIEM correlation rules. Closes the EDR coverage gap cited in ransomware risk assessments (RSK entries).",
    project_type: "infra", security_criticality: "high", status: "in_progress",
    ownerDept: "Information Security", startAgo: 60, endIn: 60,
    tasks: [
      ["Deploy agents to tier-0/tier-1 servers", "done", "critical"],
      ["Tune detection policies to reduce false positives <2%", "in_progress", "high"],
      ["SIEM integration: forward EDR telemetry", "in_progress", "high"],
      ["Assess OT handheld feasibility (constrained mode)", "todo", "medium"],
      ["Define alert runbooks for top-10 detection classes", "todo", "medium"],
    ],
  },
  {
    name: "GDPR Data Retention & Minimization Program",
    description:
      "Implement retention schedule across systems: automated deletion of expired consignee records, minimization of telemetry fields, and ROPA refresh. Includes DPIA updates for changed processing and DSAR workflow automation. Supports GDPR accountability and Art. 5(1)(e) storage limitation.",
    project_type: "privacy", security_criticality: "high", status: "in_progress",
    ownerDept: "Legal & Compliance", startAgo: 30, endIn: 150,
    tasks: [
      ["Map retention periods per system against ROPA", "done", "high"],
      ["Implement auto-deletion job for order archive DB", "in_progress", "high"],
      ["Minimize GPS telemetry fields collected", "todo", "medium"],
      ["Refresh DPIAs for telematics monitoring", "todo", "medium"],
      ["DSAR automation: connect request portal to search jobs", "backlog", "medium"],
    ],
  },
  {
    name: "Backup Immutability & Restore Assurance",
    description:
      "Harden backup infrastructure against ransomware: immutable object-lock repositories, isolated backup network zone, automated restore verification with quarterly full-scenario tests, and documented RTO/RPO evidence per system tier. Implements ISO A.8.13 and supports the BC program.",
    project_type: "infra", security_criticality: "critical", status: "testing",
    ownerDept: "IT Operations", startAgo: 120, endIn: 30,
    tasks: [
      ["Enable object-lock immutability on backup repository", "done", "critical"],
      ["Isolate backup management network", "done", "high"],
      ["Automated restore verification jobs per VM class", "review", "high"],
      ["Quarterly full DR scenario test — document results", "in_progress", "critical"],
      ["RTO/RPO evidence pack per business service", "todo", "medium"],
    ],
  },
  {
    name: "Vendor Security Assessment Uplift",
    description:
      "Reassess all critical/high vendors against the new questionnaire, execute missing DPAs, onboard trust-center monitoring, and establish annual reassessment calendar. Reduces supply-chain risk exposure flagged in vendor risk levels and NIS2 Article 21(2)(d) obligations.",
    project_type: "privacy", security_criticality: "medium", status: "in_progress",
    ownerDept: "Legal & Compliance", startAgo: 20, endIn: 100,
    tasks: [
      ["Reassess top-10 critical vendors with new questionnaire", "in_progress", "high"],
      ["Execute outstanding Art. 28 DPAs", "in_progress", "high"],
      ["Onboard trust-center feeds for SaaS vendors", "todo", "medium"],
      ["Annual reassessment calendar & ownership assignment", "todo", "low"],
    ],
  },
  {
    name: "Security Awareness & Phishing Simulation Refresh",
    description:
      "Revamp awareness program: role-based training tracks, monthly simulated phishing with adaptive difficulty, just-in-time coaching for clickers, and board-level metrics. Targets the human-factor findings from recent incident reviews and supports A.6.3 evidence chain.",
    project_type: "it", security_criticality: "medium", status: "planning",
    ownerDept: "Human Resources", startIn: 14, endIn: 200,
    tasks: [
      ["Select platform & integrate HR employee feed", "todo", "high"],
      ["Design role-based curriculum (finance/ops/engineering)", "todo", "medium"],
      ["Baseline phishing campaign to measure click rate", "backlog", "medium"],
      ["Executive KPI dashboard for awareness metrics", "backlog", "low"],
    ],
  },
  {
    name: "Secrets Management Consolidation (Vault)",
    description:
      "Eliminate hardcoded credentials: migrate all CI/CD pipelines and applications to HashiCorp Vault with dynamic secrets, AppRole auth, and rotation policies. Audit-ready secret access logs satisfy A.8.28 secure coding requirements.",
    project_type: "it", security_criticality: "high", status: "in_progress",
    ownerDept: "Software Engineering", startAgo: 75, endIn: 45,
    tasks: [
      ["Inventory secrets across repos & pipelines", "done", "high"],
      ["Migrate CI/CD pipeline secrets to Vault", "done", "high"],
      ["AppRole rollout for production services", "in_progress", "high"],
      ["Static scanning gate to block new hardcoding", "review", "medium"],
      ["Rotate & revoke legacy shared credentials", "todo", "critical"],
    ],
  },
  {
    name: "Incident Response Runbook & Tabletop Program",
    description:
      "Build practical IR capability: scenario-specific runbooks (ransomware, BEC, data breach, EDI compromise), on-call rotation with escalation tree, twice-yearly tabletop exercises with executive participation, and post-mortem template feeding corrective actions.",
    project_type: "it", security_criticality: "high", status: "blocked",
    ownerDept: "Information Security", startAgo: 40, endIn: 80,
    tasks: [
      ["Draft ransomware & BEC runbooks", "done", "high"],
      ["On-call rotation & paging tool selection", "in_progress", "medium"],
      ["Tabletop #1 scheduling — awaiting executive calendars", "todo", "high"],
      ["Post-mortem template & CAP linkage process", "backlog", "medium"],
    ],
  },
  {
    name: "Cloud Security Posture Management (CSPM) Deployment",
    description:
      "Deploy continuous cloud posture monitoring across AWS organization: CIS benchmark checks, public-exposure detection, IAM privilege analytics, and IaC scanning in GitLab CI. Prevents misconfiguration exposure risk identified in the risk register.",
    project_type: "infra", security_criticality: "high", status: "planning",
    ownerDept: "Software Engineering", startIn: 30, endIn: 180,
    tasks: [
      ["Tool evaluation & selection (open-source vs commercial)", "todo", "high"],
      ["Onboard AWS org read-only roles", "backlog", "medium"],
      ["IaC scanning gate in GitLab CI", "backlog", "medium"],
      ["Define severity SLAs for posture findings", "backlog", "low"],
    ],
  },
  {
    name: "Physical Security Modernization — Warehouse Access Control",
    description:
      "Replace legacy badge system at all warehouses: modern access control with centralized monitoring, server-room two-person rule enforcement, CCTV retention alignment to policy, and continuous (vs weekly) access-log review integrated with SIEM. Supports A.7 physical controls.",
    project_type: "infra", security_criticality: "medium", status: "completed",
    ownerDept: "Warehouse & Fleet Operations", startAgo: 300, endIn: -60,
    tasks: [
      ["Vendor selection & site survey", "done", "medium"],
      ["Rotterdam pilot deployment", "done", "medium"],
      ["Hamburg & Munich rollout", "done", "medium"],
      ["Continuous access-log review into SIEM", "done", "high"],
      ["Decommission legacy badge controllers", "done", "low"],
    ],
  },
];

export async function seedProjectsForClient(sql, clientId) {
  // idempotent: skip if already seeded
  const existing = await sql`SELECT count(*)::int n FROM projects WHERE client_id=${clientId}`;
  if (existing[0].n > 0) return { skipped: true, existing: existing[0].n };

  const rng = new Rng(9000 + clientId);
  const emps = await sql`SELECT first_name, last_name, department FROM employees WHERE client_id=${clientId}`;
  const deptHead = (d) => {
    const e = emps.find(x => x.department === d);
    return e ? `${e.first_name} ${e.last_name}` : "Security Team";
  };

  const out = [];
  for (const p of SECURITY_PROJECTS) {
    // status is free varchar on projects table; keep as authored
    const startDate = p.startAgo !== undefined ? agoDays(p.startAgo) : daysFromNow(p.startIn || 0);
    const endDate = p.endIn >= 0 ? daysFromNow(p.endIn) : agoDays(-p.endIn);
    const [proj] = await sql`
      INSERT INTO projects ${sql({
        client_id: clientId,
        name: p.name,
        description: p.description,
        status: p.status,
        project_type: p.project_type,
        security_criticality: p.security_criticality,
        owner: deptHead(p.ownerDept),
        start_date: startDate,
        end_date: endDate,
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
  return { created: out };
}

/**
 * Phase 3 bot roster: Risk Watchdog, Vulnerability Sentinel, Policy Steward,
 * BC Guardian, Anomaly Spotter.
 */
import { eq, and, isNotNull, desc, ne, sql, or, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  riskTreatments, riskScenarios, riskAppetite, riskAssessments,
  vulnerabilities,
  clientPolicies,
  bcPlans, bcTrainingRecords,
} from "../../../schema";
import type { SentinelBot, Observation } from "./types";

// ------------------------------------------------------------------
// Bot 3: Risk Watchdog
// ------------------------------------------------------------------
export const riskWatchdog: SentinelBot = {
  id: "risk-watchdog",
  name: "Risk Watchdog",
  moduleKey: "riskWatchdog",
  defaultSchedule: "daily",
  description: "Watches treatment due dates, residual-vs-appetite breaches and aging unassigned risks.",

  async observe(ctx): Promise<Observation[]> {
    const db = await getDb();
    if (!db) return [];
    const out: Observation[] = [];
    const nowMs = ctx.now.getTime();

    // Appetite threshold (residual score above which we escalate)
    let appetiteScore = 6; // default from seeded policy language
    try {
      const [app] = await db
        .select({ overall: riskAppetite.overallRiskLevel })
        .from(riskAppetite)
        .where(eq(riskAppetite.clientId, ctx.clientId))
        .limit(1);
      if (app?.overall === "high") appetiteScore = 10;
      if (app?.overall === "moderate" || app?.overall === "medium") appetiteScore = 6;
      if (app?.overall === "low") appetiteScore = 4;
    } catch { /* default stands */ }

    // 1. Treatments overdue
    const tRows = await db
      .select({
        id: riskTreatments.id,
        strategy: riskTreatments.strategy,
        status: riskTreatments.status,
        dueDate: riskTreatments.dueDate,
        owner: riskTreatments.owner,
        priority: riskTreatments.priority,
        scenarioId: riskTreatments.riskScenarioId,
      })
      .from(riskTreatments)
      .where(and(eq(riskTreatments.clientId, ctx.clientId), ne(riskTreatments.status, "implemented")));

    for (const t of tRows) {
      if (!t.dueDate) continue;
      const daysOverdue = Math.floor((nowMs - t.dueDate.getTime()) / 86400000);
      if (daysOverdue <= 0) continue;
      out.push({
        severity: daysOverdue > 30 ? "critical" : "warning",
        title: `Risk treatment (${t.strategy}) overdue by ${daysOverdue} days`,
        rationale: `A ${t.priority || "unprioritized"}-priority ${t.strategy} treatment was due ${t.dueDate.toISOString().slice(0, 10)} and remains "${t.status}" — ${daysOverdue} days overdue. Owner: ${t.owner || "unassigned"}. Until implemented, the associated risk's residual score does not reflect reality.`,
        entityType: "risk_treatment",
        entityId: t.id,
        proposedAction: {
          kind: "escalate",
          priority: daysOverdue > 30 ? "critical" : "high",
          dueInDays: 7,
        },
        dedupeKey: `treatment-overdue:${t.id}`,
        confidence: 96,
        metadata: { daysOverdue, strategy: t.strategy },
      });
    }

    // 2. Residual score above appetite
    const rRows = await db
      .select({
        id: riskScenarios.id,
        title: riskScenarios.title,
        residualScore: riskScenarios.residualScore,
        residualBand: riskScenarios.residualRisk,
        owner: riskScenarios.owner,
      })
      .from(riskScenarios)
      .where(and(eq(riskScenarios.clientId, ctx.clientId), sql`${riskScenarios.residualScore} > ${appetiteScore}`));

    for (const r of rRows.slice(0, 15)) { // cap volume
      out.push({
        severity: "critical",
        title: `Residual risk above appetite: "${r.title}" (score ${r.residualScore} > ${appetiteScore})`,
        rationale: `Risk "${r.title}" carries a residual score of ${r.residualScore} (${r.residualBand}) which exceeds the board-approved appetite threshold of ${appetiteScore}. Owner: ${r.owner || "unassigned"}. Per the risk management policy this requires either additional treatment or formal executive acceptance.`,
        entityType: "risk_scenario",
        entityId: r.id,
        proposedAction: {
          kind: "create_task",
          taskType: "risk_treatment",
          priority: "critical",
          dueInDays: 14,
        },
        dedupeKey: `appetite-breach:${r.id}`,
        confidence: 92,
        metadata: { residualScore: r.residualScore, appetite: appetiteScore },
      });
    }

    // 3. Unassigned / Orphan high-impact risk assessments
    try {
      const unassignedRisks = await db
        .select({
          id: riskAssessments.id,
          title: riskAssessments.title,
          inherentScore: riskAssessments.inherentScore,
        })
        .from(riskAssessments)
        .where(and(
          eq(riskAssessments.clientId, ctx.clientId),
          sql`${riskAssessments.inherentScore} >= 12`,
          or(isNull(riskAssessments.ownerId), eq(riskAssessments.status, "draft"))
        ));

      for (const u of unassignedRisks.slice(0, 10)) {
        out.push({
          severity: "warning",
          title: `Unassigned high-impact risk: "${u.title}"`,
          rationale: `Risk "${u.title}" has an inherent score of ${u.inherentScore} (High/Critical) but lacks an assigned risk owner in the register (ISO 27005 Clause 8.2).`,
          entityType: "risk_assessment",
          entityId: u.id,
          proposedAction: {
            kind: "escalate",
            priority: "high",
            dueInDays: 7,
          },
          dedupeKey: `orphan-risk:${u.id}`,
          confidence: 90,
          metadata: { inherentScore: u.inherentScore },
        });
      }
    } catch { /* graceful fallback */ }

    return out;
  },
};

// ------------------------------------------------------------------
// Bot 4: Vulnerability Sentinel
// ------------------------------------------------------------------
export const vulnerabilitySentinel: SentinelBot = {
  id: "vulnerability-sentinel",
  name: "Vulnerability Sentinel",
  moduleKey: "vulnerabilitySentinel",
  defaultSchedule: "daily",
  description: "Watches vulnerability ages against remediation SLAs and critical exposure.",

  async observe(ctx): Promise<Observation[]> {
    const db = await getDb();
    if (!db) return [];
    const out: Observation[] = [];
    const nowMs = ctx.now.getTime();
    const SLA_DAYS: Record<string, number> = { critical: 7, high: 14, medium: 30, low: 90 };

    const vRows = await db
      .select({
        id: vulnerabilities.id,
        vulnId: vulnerabilities.vulnerabilityId,
        cveId: vulnerabilities.cveId,
        name: vulnerabilities.name,
        severity: vulnerabilities.severity,
        status: vulnerabilities.status,
        discoveryDate: vulnerabilities.discoveryDate,
        cvssScore: vulnerabilities.cvssScore,
      })
      .from(vulnerabilities)
      .where(and(eq(vulnerabilities.clientId, ctx.clientId), ne(vulnerabilities.status, "remediated"), ne(vulnerabilities.status, "mitigated")));

    for (const v of vRows) {
      const sla = SLA_DAYS[(v.severity || "").toLowerCase()] ?? 30;
      if (!v.discoveryDate) continue;
      const ageDays = Math.floor((nowMs - v.discoveryDate.getTime()) / 86400000);
      const overBy = ageDays - sla;
      if (overBy < 0) continue;
      const sev = (v.severity || "").toLowerCase();
      out.push({
        severity: sev === "critical" && overBy > 7 ? "critical" : sev === "critical" ? "warning" : "info",
        title: `${sev.toUpperCase()} vulnerability ${(v.cveId || v.vulnId)} past ${sla}-day SLA by ${overBy} days`,
        rationale: `"${(v.name || "").slice(0, 100)}" (CVSS ${(v.cvssScore! / 10).toFixed(1)}, severity: ${v.severity}) was discovered ${ageDays} days ago and exceeds its ${sla}-day ${v.severity} remediation SLA by ${overBy} days. Unremediated ${v.severity} vulnerabilities are primary exploitation vectors.`,
        entityType: "vulnerability",
        entityId: v.id,
        proposedAction: {
          kind: "create_task",
          taskType: "control_implementation",
          priority: sev === "critical" && overBy > 7 ? "critical" : "high",
          dueInDays: sev === "critical" ? 3 : 7,
        },
        dedupeKey: `vuln-sla:${v.vulnId || v.id}:${overBy > 30 ? "30+" : overBy > 14 ? "14+" : "breached"}`,
        autoRemediationId: null,
        confidence: 98,
        metadata: { severity: v.severity, ageDays, slaDays: sla, overBy },
      });
    }

    return out;
  },
};

// ------------------------------------------------------------------
// Bot 5: Policy Steward
// ------------------------------------------------------------------
export const policySteward: SentinelBot = {
  id: "policy-steward",
  name: "Policy Steward",
  moduleKey: "policySteward",
  defaultSchedule: "weekly",
  description: "Watches acknowledgment completion rates and policies stuck in review.",

  async observe(ctx): Promise<Observation[]> {
    const db = await getDb();
    if (!db) return [];
    const out: Observation[] = [];

    // Policies stuck in "review" status > 21 days
    const stuck = await db
      .select({
        id: clientPolicies.id,
        name: clientPolicies.name,
        status: clientPolicies.status,
        updatedAt: clientPolicies.updatedAt,
      })
      .from(clientPolicies)
      .where(and(eq(clientPolicies.clientId, ctx.clientId), eq(clientPolicies.status, "review")));

    for (const p of stuck) {
      const daysStuck = Math.floor((ctx.now.getTime() - p.updatedAt!.getTime()) / 86400000);
      if (daysStuck < 21) continue;
      out.push({
        severity: "warning",
        title: `Policy "${p.name}" stuck in review for ${daysStuck} days`,
        rationale: `Policy "${p.name}" has been in "review" status since ${p.updatedAt!.toISOString().slice(0, 10)} (${daysStuck} days). Stalled reviews block approval workflows and leave the policy without an authoritative version — a standard ISO A.5.1 audit finding.`,
        entityType: "policy",
        entityId: p.id,
        proposedAction: {
          kind: "create_task",
          taskType: "policy_review",
          priority: "medium",
          dueInDays: 14,
        },
        dedupeKey: `policy-stuck-review:${p.id}:${Math.floor(daysStuck / 7)}w`,
        confidence: 93,
        metadata: { daysStuck },
      });
    }

    return out;
  },
};

// ------------------------------------------------------------------
// Bot 6: BC Guardian
// ------------------------------------------------------------------
export const bcGuardian: SentinelBot = {
  id: "bc-guardian",
  name: "BC Guardian",
  moduleKey: "bcGuardian",
  defaultSchedule: "weekly",
  description: "Watches plan test dates, training expiry and continuity readiness.",

  async observe(ctx): Promise<Observation[]> {
    const db = await getDb();
    if (!db) return [];
    const out: Observation[] = [];
    const nowMs = ctx.now.getTime();

    // Plans overdue for testing (>12 months)
    const plans = await db
      .select({
        id: bcPlans.id,
        title: bcPlans.title,
        lastTestedDate: bcPlans.lastTestedDate,
        nextTestDate: bcPlans.nextTestDate,
      })
      .from(bcPlans)
      .where(eq(bcPlans.clientId, ctx.clientId));

    for (const p of plans) {
      if (!p.nextTestDate) continue;
      const daysOverdue = Math.floor((nowMs - p.nextTestDate!.getTime()) / 86400000);
      const neverTested = !p.lastTestedDate;
      if (daysOverdue <= 0) continue;
      out.push({
        severity: daysOverdue > 60 || neverTested ? "warning" : "info",
        title: `BC plan "${p.title}" test overdue by ${daysOverdue} days${neverTested ? " (never tested)" : ""}`,
        rationale: `Business continuity plan "${p.title}" passed its scheduled test date ${p.nextTestDate!.toISOString().slice(0, 10)} — ${daysOverdue} days ago. ${neverTested ? "This plan has NEVER been tested; untested plans routinely fail during actual incidents and violate NIS2 Article 21(2)(c)." : "Untested BC plans violate NIS2 Article 21(2)(c) business continuity requirements and ISO 22301 / A.5.30."}`,
        entityType: "bc_plan",
        entityId: p.id,
        proposedAction: {
          kind: "create_task",
          taskType: "review",
          priority: "medium",
          dueInDays: 30,
        },
        dedupeKey: `bc-test-overdue:${p.id}`,
        confidence: 95,
        metadata: { nextTestDate: p.nextTestDate!.toISOString().slice(0, 10), neverTested, nis2Article: "21.2.c" },
      });
    }

    // Expired BC training
    const trainings = await db
      .select({
        id: bcTrainingRecords.id,
        trainingType: bcTrainingRecords.trainingType,
        expiryDate: bcTrainingRecords.expiryDate,
        notes: bcTrainingRecords.notes,
      })
      .from(bcTrainingRecords)
      .where(eq(bcTrainingRecords.clientId, ctx.clientId));

    const expired = trainings.filter(t => t.expiryDate && t.expiryDate.getTime() < nowMs);
    if (expired.length >= 5) {
      out.push({
        severity: "info",
        title: `${expired.length} BC training records have expired`,
        rationale: `${expired.length} of ${trainings.length} business-continuity training records show an expiry date in the past. Lapsed training undermines the competence evidence required for continuity roles named in the plans.`,
        entityType: "bc_training_record",
        proposedAction: { kind: "notify_only" },
        dedupeKey: `bc-training-expired:${new Date().toISOString().slice(0, 7)}`, // monthly
        confidence: 90,
        metadata: { expiredCount: expired.length, total: trainings.length },
      });
    }

    return out;
  },
};

// ------------------------------------------------------------------
// Bot 7: Anomaly Spotter (stretch — heuristic baseline)
// ------------------------------------------------------------------
export const anomalySpotter: SentinelBot = {
  id: "anomaly-spotter",
  name: "Anomaly Spotter",
  moduleKey: "anomalySpotter",
  defaultSchedule: "daily",
  description: "Heuristic watch on activity patterns: spikes in deletions, off-hours changes, permission churn.",

  async observe(ctx): Promise<Observation[]> {
    const db = await getDb();
    if (!db) return [];
    const out: Observation[] = [];

    // Heuristic: spike of DELETE actions in audit logs in last 24h vs prior 7-day daily average
    try {
      const [recent] = await db.execute(sql`
        SELECT count(*)::int AS n FROM audit_logs
        WHERE client_id = ${ctx.clientId}
          AND action = 'DELETE'
          AND created_at > now() - interval '24 hours'`).then((r: any) => r.rows ?? r);

      const [baseline] = await db.execute(sql`
        SELECT coalesce(avg(c),0)::float AS avg FROM (
          SELECT date_trunc('day', created_at) d, count(*)::int AS c
          FROM audit_logs
          WHERE client_id = ${ctx.clientId} AND action = 'DELETE'
            AND created_at BETWEEN now() - interval '8 days' AND now() - interval '1 day'
          GROUP BY 1
        ) x`).then((r: any) => r.rows ?? r);

      const recentN = Number(recent?.n ?? 0);
      const baseN = Number(baseline?.avg ?? 0);
      if (baseN >= 2 && recentN > baseN * 3) {
        out.push({
          severity: "warning",
          title: `Deletion activity spike: ${recentN} deletes in 24h (baseline ~${Math.round(baseN)}/day)`,
          rationale: `Audit logs recorded ${recentN} DELETE operations in the last 24 hours versus a trailing 7-day average of ${Math.round(baseN)}/day — a ${(recentN / baseN).toFixed(1)}x spike. Mass deletion can indicate data destruction, an automated job misfire, or cover-of-attack activity.`,
          entityType: "audit_log",
          proposedAction: { kind: "notify_only" },
          dedupeKey: `delete-spike:${new Date().toISOString().slice(0, 10)}`,
          confidence: 75,
          metadata: { recent24h: recentN, sevenDayAvg: Math.round(baseN * 10) / 10 },
        });
      }
    } catch {
      // audit_logs shape may differ across deployments — heuristic stays best-effort
    }

    return out;
  },
};

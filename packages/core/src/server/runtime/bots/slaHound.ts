/**
 * Bot 2: SLA Hound
 * Watches deadline clocks: questionnaires, assessments, DSARs, contracts, policies.
 */
import { eq, and, lt, isNotNull, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { questionnaires, vendorAssessmentRequests, dsarRequests, vendorContracts, clientPolicies } from "../../../schema";
import type { SentinelBot, Observation } from "./types";

export const slaHound: SentinelBot = {
  id: "sla-hound",
  name: "SLA Hound",
  moduleKey: "slaHound",
  defaultSchedule: "daily",
  description: "Tracks every deadline clock: vendor questionnaires, assessments, DSAR statutory windows, contract notice periods and policy reviews.",

  async observe(ctx): Promise<Observation[]> {
    const db = await getDb();
    if (!db) return [];
    const out: Observation[] = [];
    const nowMs = ctx.now.getTime();

    // ---- 1. Vendor questionnaires overdue / approaching ----
    const qRows = await db
      .select({
        id: questionnaires.id,
        name: questionnaires.name,
        status: questionnaires.status,
        dueDate: questionnaires.dueDate,
        vendorName: questionnaires.vendorName,
        progress: questionnaires.progress,
      })
      .from(questionnaires)
      .where(eq(questionnaires.clientId, ctx.clientId));

    for (const q of qRows) {
      if (!q.dueDate || ["completed", "cancelled"].includes(q.status || "")) continue;
      const daysOverdue = Math.floor((nowMs - q.dueDate.getTime()) / 86400000);
      if (daysOverdue < -7) continue; // more than a week away — not notable yet
      const overdue = daysOverdue >= 0;
      out.push({
        severity: overdue ? (daysOverdue > 14 ? "critical" : "warning") : "info",
        title: overdue
          ? `Questionnaire from ${q.vendorName || "vendor"} is ${daysOverdue} day(s) OVERDUE`
          : `Questionnaire from ${q.vendorName || "vendor"} due in ${Math.abs(daysOverdue)} days`,
        rationale: `Security questionnaire "${q.name}" (status: ${q.status}, progress: ${q.progress ?? 0}%) was due ${q.dueDate.toISOString().slice(0, 10)}. ${overdue ? `It is now ${daysOverdue} days overdue — the vendor's security posture cannot be verified within the assessment window.` : `Response not yet received; follow-up recommended before the deadline passes.`}`,
        entityType: "questionnaire",
        entityId: q.id,
        proposedAction: {
          kind: overdue ? "escalate" : "create_task",
          taskType: "vendor_assessment",
          priority: overdue ? "high" : "medium",
          dueInDays: overdue ? 5 : Math.abs(daysOverdue),
        },
        dedupeKey: `questionnaire-due:${q.id}:${overdue ? "overdue" : "upcoming"}`,
        autoRemediationId: "resend-questionnaire-reminder",
        confidence: 98,
        metadata: { vendor: q.vendorName, status: q.status, progress: q.progress },
      });
    }

    // ---- 2. Vendor assessment requests overdue ----
    const vaRows = await db
      .select({
        id: vendorAssessmentRequests.id,
        vendorId: vendorAssessmentRequests.vendorId,
        status: vendorAssessmentRequests.status,
        expiresAt: vendorAssessmentRequests.expiresAt,
        recipientEmail: vendorAssessmentRequests.recipientEmail,
      })
      .from(vendorAssessmentRequests)
      .where(and(eq(vendorAssessmentRequests.clientId, ctx.clientId), ne(vendorAssessmentRequests.status, "completed")));

    for (const a of vaRows) {
      if (!a.expiresAt) continue;
      const expired = a.expiresAt.getTime() < nowMs;
      if (!expired && a.status !== "pending") continue;
      out.push({
        severity: expired ? "warning" : "info",
        title: `Vendor assessment request to ${a.recipientEmail} ${expired ? "EXPIRED unanswered" : "awaiting response"}`,
        rationale: `An assessment request sent to ${a.recipientEmail} (status: ${a.status}) has ${expired ? "passed its expiry date without submission" : "not yet been viewed"}. Unassessed vendors represent unquantified third-party risk.`,
        entityType: "vendor_assessment_request",
        entityId: a.id,
        proposedAction: {
          kind: "create_task",
          taskType: "vendor_assessment",
          priority: expired ? "medium" : "low",
          dueInDays: 10,
        },
        dedupeKey: `assessment-request:${a.id}:${expired ? "expired" : "outstanding"}`,
        autoRemediationId: "resend-assessment-invite",
        confidence: 95,
      });
    }

    // ---- 3. DSAR statutory clock (GDPR 30-day window) ----
    const dRows = await db
      .select({
        id: dsarRequests.id,
        requestId: dsarRequests.requestId,
        requestType: dsarRequests.requestType,
        subjectName: dsarRequests.subjectName,
        status: dsarRequests.status,
        dueDate: dsarRequests.dueDate,
        priority: dsarRequests.priority,
      })
      .from(dsarRequests)
      .where(and(
        eq(dsarRequests.clientId, ctx.clientId),
        isNotNull(dsarRequests.dueDate),
        ne(dsarRequests.status, "completed"),
        ne(dsarRequests.status, "rejected"),
        ne(dsarRequests.status, "withdrawn"),
      ));

    for (const d of dRows) {
      if (!d.dueDate) continue;
      const daysLeft = Math.floor((d.dueDate.getTime() - nowMs) / 86400000);
      if (daysLeft > 5) continue; // only flag inside the 5-day window or overdue
      const breached = daysLeft < 0;
      out.push({
        severity: breached ? "critical" : daysLeft <= 2 ? "critical" : "warning",
        title: breached
          ? `DSAR ${d.requestId} BREACHED the 30-day statutory window`
          : `DSAR ${d.requestId} due in ${daysLeft} day(s) — GDPR Art. 12(3) deadline`,
        rationale: `Data subject access request (${d.requestType}) from ${d.subjectName || "data subject"} has its Art. 12(3) one-month deadline at ${d.dueDate.toISOString().slice(0, 10)} — ${breached ? `the statutory window has been BREACHED by ${Math.abs(daysLeft)} day(s). Late responses are enforceable by the supervisory authority.` : `${daysLeft} day(s) remain. Escalate to the DPO now if completion is at risk.`}`,
        entityType: "dsar_request",
        entityId: d.id,
        proposedAction: {
          kind: "escalate",
          priority: "critical",
          dueInDays: 1,
        },
        dedupeKey: `dsar-clock:${d.id}:${breached ? "breached" : `t-${daysLeft}`}`,
        confidence: 99,
        metadata: { requestType: d.requestType, priority: d.priority },
      });
    }

    // ---- 4. Contracts expired / entering notice period ----
    const cRows = await db
      .select({
        id: vendorContracts.id,
        title: vendorContracts.title,
        status: vendorContracts.status,
        endDate: vendorContracts.endDate,
        noticePeriod: vendorContracts.noticePeriod,
        autoRenew: vendorContracts.autoRenew,
      })
      .from(vendorContracts)
      .where(eq(vendorContracts.clientId, ctx.clientId));

    for (const c of cRows) {
      if (!c.endDate) continue;
      if (c.autoRenew) continue; // auto-renewing needs no action
      const daysToEnd = Math.floor((c.endDate.getTime() - nowMs) / 86400000);
      const inNoticeWindow = daysToEnd <= 0 && c.status === "expired";
      const approachingNotice = daysToEnd > 0 && daysToEnd <= 45;
      if (!inNoticeWindow && !approachingNotice) continue;
      out.push({
        severity: inNoticeWindow ? "warning" : "info",
        title: inNoticeWindow
          ? `Contract "${c.title}" has EXPIRED${!c.autoRenew ? " without auto-renewal" : ""}`
          : `Contract "${c.title}" ends in ${daysToEnd} days — notice period applies`,
        rationale: `"${c.title}" ends ${c.endDate.toISOString().slice(0, 10)} (notice period: ${c.noticePeriod || "unspecified"}). ${inNoticeWindow ? "The contract has lapsed — services may be running without contractual coverage." : `To avoid automatic renewal or coverage gap, a renewal/termination decision is needed before the notice window closes.`}`,
        entityType: "vendor_contract",
        entityId: c.id,
        proposedAction: {
          kind: "create_task",
          taskType: "review",
          priority: inNoticeWindow ? "high" : "medium",
          dueInDays: inNoticeWindow ? 5 : 14,
        },
        dedupeKey: `contract-window:${c.id}:${inNoticeWindow ? "lapsed" : "notice"}`,
        confidence: 95,
        metadata: { endDate: c.endDate.toISOString().slice(0, 10), notice: c.noticePeriod },
      });
    }

    // ---- 5. Policies past review date ----
    const pRows = await db
      .select({
        id: clientPolicies.id,
        name: clientPolicies.name,
        status: clientPolicies.status,
        nextReviewDate: clientPolicies.nextReviewDate,
        version: clientPolicies.version,
      })
      .from(clientPolicies)
      .where(and(eq(clientPolicies.clientId, ctx.clientId), isNotNull(clientPolicies.nextReviewDate)));

    for (const p of pRows) {
      if (!p.nextReviewDate) continue;
      if (["archived"].includes(p.status || "")) continue;
      const overdueDays = Math.floor((nowMs - p.nextReviewDate.getTime()) / 86400000);
      if (overdueDays <= 0) continue;
      out.push({
        severity: overdueDays > 60 ? "warning" : "info",
        title: `Policy "${p.name}" annual review overdue by ${overdueDays} days`,
        rationale: `Policy "${p.name}" (v${p.version}, status: ${p.status}) passed its scheduled review date ${p.nextReviewDate.toISOString().slice(0, 10)} — ${overdueDays} days ago. ISO 27001 A.5.1 requires periodic policy reviews; overdue reviews are a standard audit finding.`,
        entityType: "policy",
        entityId: p.id,
        proposedAction: {
          kind: "create_task",
          taskType: "policy_review",
          priority: overdueDays > 90 ? "medium" : "low",
          dueInDays: 30,
        },
        dedupeKey: `policy-review:${p.id}`,
        confidence: 97,
        metadata: { version: p.version, overdueDays },
      });
    }

    return out;
  },
};

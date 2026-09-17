import { getDb } from "../db";
import {
  clientControls,
  evidence,
  implementationTasks,
  implementationPlans,
  policyExceptions,
  complianceSnapshots,
} from "../schema";
import { eq, and, lt, lte, gte, sql, count, inArray } from "drizzle-orm";

export interface ComplianceDebtResult {
  debtScore: number;
  breakdown: {
    overdueControls: number;
    missingEvidence: number;
    expiredEvidence: number;
    overdueTasks: number;
    expiredExceptions: number;
    activeExceptions: number;
  };
  summary: string;
}

const WEIGHTS = {
  overdueControl: 2,
  inProgressControl: 1,
  missingEvidence: 2,
  expiredEvidence: 3,
  expiringEvidence: 2,
  overdueTask: 2,
  expiredException: 3,
  activeException: 1,
} as const;

const MAX_POSSIBLE_WEIGHTED_DEBT = 1000;

export async function computeComplianceDebt(clientId: number): Promise<ComplianceDebtResult> {
  const db = await getDb();

  // 1. Client Controls
  const allClientControls = await db
    .select({ id: clientControls.id, status: clientControls.status })
    .from(clientControls)
    .where(eq(clientControls.clientId, clientId));

  const notImplementedCount = allClientControls.filter(
    (c) => c.status === "not_implemented"
  ).length;
  const inProgressCount = allClientControls.filter(
    (c) => c.status === "in_progress"
  ).length;

  // 2. Evidence
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const allEvidence = await db
    .select({
      id: evidence.id,
      expirationDate: evidence.expirationDate,
      clientControlId: evidence.clientControlId,
      status: evidence.status,
    })
    .from(evidence)
    .where(eq(evidence.clientId, clientId));

  const expiredEvidenceItems = allEvidence.filter(
    (e) =>
      e.expirationDate &&
      new Date(e.expirationDate) < now &&
      e.status !== "not_applicable"
  ).length;

  // Missing evidence: implemented controls with no evidence
  const implementedControlIds = allClientControls
    .filter((c) => c.status === "implemented")
    .map((c) => c.id);

  let missingEvidenceCount = 0;
  if (implementedControlIds.length > 0) {
    const evidenceControlIds = new Set(
      allEvidence
        .filter((e) => e.status !== "not_applicable")
        .map((e) => e.clientControlId)
    );
    missingEvidenceCount = implementedControlIds.filter(
      (id) => !evidenceControlIds.has(id)
    ).length;
  }

  // 3. Implementation Tasks (join through implementationPlans for clientId)
  const overdueTasks = await db
    .select({ count: count() })
    .from(implementationTasks)
    .innerJoin(
      implementationPlans,
      eq(implementationTasks.implementationPlanId, implementationPlans.id)
    )
    .where(
      and(
        eq(implementationPlans.clientId, clientId),
        lt(implementationTasks.plannedEndDate, now),
        sql`${implementationTasks.status} NOT IN ('done')`
      )
    );

  const overdueTaskCount = Number(overdueTasks[0]?.count ?? 0);

  // 4. Policy Exceptions
  const allExceptions = await db
    .select({
      id: policyExceptions.id,
      status: policyExceptions.status,
      expirationDate: policyExceptions.expirationDate,
    })
    .from(policyExceptions)
    .where(eq(policyExceptions.employeeId, clientId));

  const expiredExceptionCount = allExceptions.filter(
    (e) =>
      e.status === "expired" ||
      (e.expirationDate && new Date(e.expirationDate) < now)
  ).length;

  const activeExceptionCount = allExceptions.filter(
    (e) =>
      e.status === "approved" &&
      (!e.expirationDate || new Date(e.expirationDate) >= now)
  ).length;

  // 5. Compute Weighted Score
  const weightedDebt =
    notImplementedCount * WEIGHTS.overdueControl +
    inProgressCount * WEIGHTS.inProgressControl +
    missingEvidenceCount * WEIGHTS.missingEvidence +
    expiredEvidenceItems * WEIGHTS.expiredEvidence +
    overdueTaskCount * WEIGHTS.overdueTask +
    expiredExceptionCount * WEIGHTS.expiredException +
    activeExceptionCount * WEIGHTS.activeException;

  const maxDebt = Math.max(MAX_POSSIBLE_WEIGHTED_DEBT, weightedDebt);
  const normalizedDebt = Math.min(1, weightedDebt / maxDebt);
  const debtScore = Math.round((1 - normalizedDebt) * 100);

  // 6. Build Summary
  const breakdown = {
    overdueControls: notImplementedCount,
    missingEvidence: missingEvidenceCount,
    expiredEvidence: expiredEvidenceItems,
    overdueTasks: overdueTaskCount,
    expiredExceptions: expiredExceptionCount,
    activeExceptions: activeExceptionCount,
  };

  const summary = buildSummary(debtScore, breakdown);

  return { debtScore, breakdown, summary };
}

function buildSummary(
  score: number,
  breakdown: ComplianceDebtResult["breakdown"]
): string {
  const parts: string[] = [];

  if (breakdown.overdueControls > 0) {
    parts.push(
      `${breakdown.overdueControls} overdue control${breakdown.overdueControls !== 1 ? "s" : ""}`
    );
  }
  if (breakdown.missingEvidence > 0) {
    parts.push(
      `${breakdown.missingEvidence} control${breakdown.missingEvidence !== 1 ? "s" : ""} missing evidence`
    );
  }
  if (breakdown.expiredEvidence > 0) {
    parts.push(
      `${breakdown.expiredEvidence} expired evidence item${breakdown.expiredEvidence !== 1 ? "s" : ""}`
    );
  }
  if (breakdown.overdueTasks > 0) {
    parts.push(
      `${breakdown.overdueTasks} overdue task${breakdown.overdueTasks !== 1 ? "s" : ""}`
    );
  }
  if (breakdown.expiredExceptions > 0) {
    parts.push(
      `${breakdown.expiredExceptions} expired exception${breakdown.expiredExceptions !== 1 ? "s" : ""}`
    );
  }
  if (breakdown.activeExceptions > 0) {
    parts.push(
      `${breakdown.activeExceptions} active exception${breakdown.activeExceptions !== 1 ? "s" : ""}`
    );
  }

  if (parts.length === 0) {
    return `Your compliance debt is ${score}/100. No issues found \u2014 great work!`;
  }

  const main = parts.slice(0, 2).join(" and ");
  const suffix = parts.length > 2 ? " and other items" : "";
  return `Your compliance debt is ${score}/100. ${main}${suffix} are the main contributors.`;
}

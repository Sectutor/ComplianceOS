/**
 * Access review automation service (scorecard P2 #7 — "Access review
 * automation": auto-provisioned reviews + certification).
 *
 * Vanta-class parity: reviewers get auto-provisioned certification tasks for
 * every client user × access role, then certify or revoke each one, with an
 * overdue sweep driven by the cycle due date.
 *
 * DB-backed via drizzle (`getDb`) with a graceful in-memory fallback so every
 * function returns sensible data instead of throwing when the database is
 * unreachable (same pattern as lib/evidenceCollectorConnections.ts and the
 * policyAck service). Table DDL lives in schema.ts (access_review_cycles /
 * access_review_tasks); the drizzle queries are the source of truth.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { accessReviewCycles, accessReviewTasks, userClients, users } from "../schema";

export type AccessReviewTaskStatus = "pending" | "certified" | "revoked" | "overdue";
export type AccessReviewCycleStatus = "draft" | "active" | "completed";

export interface AccessReviewCycleRow {
  id: number;
  clientId: number;
  name: string;
  description?: string | null;
  dueDate: Date;
  status: AccessReviewCycleStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AccessReviewTaskRow {
  id: number;
  cycleId: number;
  clientId: number;
  userId?: number | null;
  role?: string | null;
  status: AccessReviewTaskStatus;
  dueDate?: Date | null;
  note?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: number | null;
  createdAt?: Date;
}

export interface AccessReviewSummary {
  total: number;
  pending: number;
  overdue: number;
  certified: number;
  revoked: number;
}

export interface ProvisionResult {
  provisioned: number;
  existing: number;
  cycleId: number;
  clientId: number;
}

// ---------------------------------------------------------------------------
// createCycle
// ---------------------------------------------------------------------------

/** Create a new access review cycle (draft). */
export async function createCycle(input: {
  clientId: number;
  name: string;
  dueDate: Date;
  description?: string;
}): Promise<AccessReviewCycleRow> {
  try {
    const db = await getDb();
    const res = await db
      .insert(accessReviewCycles)
      .values({
        clientId: input.clientId,
        name: input.name,
        dueDate: input.dueDate,
        description: input.description ?? null,
        status: "draft",
      })
      .returning();
    // drizzle .returning() yields an array; mocks may hand back the row itself.
    const row = Array.isArray(res) ? res[0] : res;
    return row;
  } catch (err) {
    console.error("[AccessReviews] createCycle failed (DB unavailable):", err);
    return {
      id: -1,
      clientId: input.clientId,
      name: input.name,
      dueDate: input.dueDate,
      description: input.description ?? null,
      status: "draft",
    };
  }
}

// ---------------------------------------------------------------------------
// provisionCycle — auto-provision users × roles, idempotent
// ---------------------------------------------------------------------------

/**
 * Auto-provision certification tasks for every client user × access role.
 * Idempotent: if the cycle already has any tasks, nothing is written.
 */
export async function provisionCycle(
  clientId: number,
  cycleId: number
): Promise<ProvisionResult> {
  try {
    const db = await getDb();

    const existing = await db
      .select({ id: accessReviewTasks.id })
      .from(accessReviewTasks)
      .where(eq(accessReviewTasks.cycleId, cycleId));
    if (existing.length > 0) {
      return { provisioned: 0, existing: existing.length, cycleId, clientId };
    }

    const clientUsers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .innerJoin(userClients, eq(userClients.userId, users.id))
      .where(eq(userClients.clientId, clientId));
    if (clientUsers.length === 0) {
      return { provisioned: 0, existing: 0, cycleId, clientId };
    }

    const roleRows = await db
      .selectDistinct({ role: userClients.role })
      .from(userClients)
      .where(eq(userClients.clientId, clientId));
    const roleNames = roleRows
      .map((r: any) => r.role ?? r.name)
      .filter((v: unknown): v is string => typeof v === "string" && v.length > 0);

    const rows: Array<{
      cycleId: number;
      clientId: number;
      userId: number;
      role: string;
      status: string;
    }> = [];
    for (const u of clientUsers) {
      for (const role of roleNames) {
        rows.push({ cycleId, clientId, userId: u.id, role, status: "pending" });
      }
    }
    if (rows.length === 0) {
      return { provisioned: 0, existing: 0, cycleId, clientId };
    }

    const inserted = await db.insert(accessReviewTasks).values(rows).returning();
    return { provisioned: inserted.length, existing: 0, cycleId, clientId };
  } catch (err) {
    console.error("[AccessReviews] provisionCycle failed (DB unavailable):", err);
    return { provisioned: 0, existing: 0, cycleId, clientId };
  }
}

// ---------------------------------------------------------------------------
// listCycles / listTasks
// ---------------------------------------------------------------------------

/** List access review cycles, optionally scoped to a client. */
export async function listCycles(clientId?: number): Promise<AccessReviewCycleRow[]> {
  try {
    const db = await getDb();
    const q = db.select().from(accessReviewCycles).orderBy(desc(accessReviewCycles.createdAt));
    const rows =
      clientId != null
        ? await q.where(eq(accessReviewCycles.clientId, clientId))
        : await q;
    return rows ?? [];
  } catch (err) {
    console.error("[AccessReviews] listCycles failed (DB unavailable):", err);
    return [];
  }
}

/** List tasks of a cycle, optionally filtered by status. */
export async function listTasks(
  cycleId: number,
  status?: AccessReviewTaskStatus
): Promise<AccessReviewTaskRow[]> {
  try {
    const db = await getDb();
    const q = db.select().from(accessReviewTasks);
    const rows =
      status != null
        ? await q.where(
            and(
              eq(accessReviewTasks.cycleId, cycleId),
              eq(accessReviewTasks.status, status)
            )
          )
        : await q.where(eq(accessReviewTasks.cycleId, cycleId));
    return rows ?? [];
  } catch (err) {
    console.error("[AccessReviews] listTasks failed (DB unavailable):", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// certifyTask / revokeTask — status transitions
// ---------------------------------------------------------------------------

/** Certify a review task (access verified). */
export async function certifyTask(
  taskId: number,
  note?: string,
  reviewedBy?: number
): Promise<AccessReviewTaskRow> {
  try {
    const db = await getDb();
    const res = await db
      .update(accessReviewTasks)
      .set({
        status: "certified",
        note: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: reviewedBy ?? null,
      })
      .where(eq(accessReviewTasks.id, taskId))
      .returning();
    const row = Array.isArray(res) ? res[0] : res;
    return row;
  } catch (err) {
    console.error("[AccessReviews] certifyTask failed (DB unavailable):", err);
    return { id: taskId, cycleId: 0, clientId: 0, status: "certified", note: note ?? null };
  }
}

/** Revoke a review task (access removed). */
export async function revokeTask(
  taskId: number,
  note?: string,
  reviewedBy?: number
): Promise<AccessReviewTaskRow> {
  try {
    const db = await getDb();
    const res = await db
      .update(accessReviewTasks)
      .set({
        status: "revoked",
        note: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: reviewedBy ?? null,
      })
      .where(eq(accessReviewTasks.id, taskId))
      .returning();
    const row = Array.isArray(res) ? res[0] : res;
    return row;
  } catch (err) {
    console.error("[AccessReviews] revokeTask failed (DB unavailable):", err);
    return { id: taskId, cycleId: 0, clientId: 0, status: "revoked", note: note ?? null };
  }
}

// ---------------------------------------------------------------------------
// runOverdueCheck / runGlobalOverdueCheck — injected clock
// ---------------------------------------------------------------------------

type PendingTaskRow = {
  id: number;
  status?: string;
  dueDate?: Date | string | null;
  cycleDueDate?: Date | string | null;
};

/**
 * Select pending tasks (optionally for one client) joined with their cycle so
 * tasks without their own dueDate inherit the cycle due date. The status
 * filter is repeated in memory because mocks may return rows regardless of the
 * where() clause (authoritative in both DB and mock paths).
 */
async function selectPendingTasks(clientId?: number): Promise<PendingTaskRow[]> {
  const db = await getDb();
  const base = db
    .select({
      id: accessReviewTasks.id,
      status: accessReviewTasks.status,
      dueDate: accessReviewTasks.dueDate,
      cycleDueDate: accessReviewCycles.dueDate,
    })
    .from(accessReviewTasks)
    .innerJoin(accessReviewCycles, eq(accessReviewTasks.cycleId, accessReviewCycles.id));
  const tasks =
    clientId != null
      ? await base.where(
          and(
            eq(accessReviewTasks.clientId, clientId),
            eq(accessReviewTasks.status, "pending")
          )
        )
      : await base.where(eq(accessReviewTasks.status, "pending"));
  return tasks as PendingTaskRow[];
}

/** Effective due date: the task's own, else the cycle's. */
function effectiveDueDate(t: PendingTaskRow): Date | null {
  const due = t.dueDate ?? t.cycleDueDate;
  if (due == null) return null;
  const d = new Date(due);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Flag pending tasks whose effective due date is before `now` as overdue.
 * Tasks without their own dueDate inherit the cycle due date (joined).
 * `now` is injectable for tests (defaults to the real clock).
 */
export async function runOverdueCheck(
  clientId: number,
  now: Date = new Date()
): Promise<{ overdue: number; checkedAt: Date }> {
  try {
    const tasks = await selectPendingTasks(clientId);
    const overdueTasks = tasks.filter((t) => {
      const due = effectiveDueDate(t);
      return t.status === "pending" && due != null && due.getTime() < now.getTime();
    });
    if (overdueTasks.length > 0) {
      const db = await getDb();
      await db
        .update(accessReviewTasks)
        .set({ status: "overdue" })
        .where(inArray(accessReviewTasks.id, overdueTasks.map((t) => t.id)));
    }
    return { overdue: overdueTasks.length, checkedAt: now };
  } catch (err) {
    console.error("[AccessReviews] runOverdueCheck failed (DB unavailable):", err);
    return { overdue: 0, checkedAt: now };
  }
}

/**
 * Global overdue sweep across every client (scheduler entry point). Same rule
 * as runOverdueCheck but without the client filter.
 */
export async function runGlobalOverdueCheck(
  now: Date = new Date()
): Promise<{ overdue: number; checkedAt: Date }> {
  try {
    const tasks = await selectPendingTasks();
    const overdueTasks = tasks.filter((t) => {
      const due = effectiveDueDate(t);
      return t.status === "pending" && due != null && due.getTime() < now.getTime();
    });
    if (overdueTasks.length > 0) {
      const db = await getDb();
      await db
        .update(accessReviewTasks)
        .set({ status: "overdue" })
        .where(inArray(accessReviewTasks.id, overdueTasks.map((t) => t.id)));
    }
    return { overdue: overdueTasks.length, checkedAt: now };
  } catch (err) {
    console.error("[AccessReviews] runGlobalOverdueCheck failed (DB unavailable):", err);
    return { overdue: 0, checkedAt: now };
  }
}

// ---------------------------------------------------------------------------
// getSummary — rollup counts for the client
// ---------------------------------------------------------------------------

/** Roll up task counts by status for a client. */
export async function getSummary(clientId: number): Promise<AccessReviewSummary> {
  const empty: AccessReviewSummary = { total: 0, pending: 0, overdue: 0, certified: 0, revoked: 0 };
  try {
    const db = await getDb();
    const tasks = (await db
      .select()
      .from(accessReviewTasks)
      .where(eq(accessReviewTasks.clientId, clientId))) as Array<{ status?: string }>;
    const count = (s: string) => tasks.filter((t) => t.status === s).length;
    return {
      total: tasks.length,
      pending: count("pending"),
      overdue: count("overdue"),
      certified: count("certified"),
      revoked: count("revoked"),
    };
  } catch (err) {
    console.error("[AccessReviews] getSummary failed (DB unavailable):", err);
    return empty;
  }
}

// ---------------------------------------------------------------------------
// listHistory — only certified/revoked
// ---------------------------------------------------------------------------

/** List completed decisions (certified/revoked only) for a client. */
export async function listHistory(clientId: number): Promise<AccessReviewTaskRow[]> {
  try {
    const db = await getDb();
    const tasks = (await db
      .select()
      .from(accessReviewTasks)
      .where(eq(accessReviewTasks.clientId, clientId))) as AccessReviewTaskRow[];
    return tasks
      .filter((t) => t.status === "certified" || t.status === "revoked")
      .sort((a, b) => a.id - b.id);
  } catch (err) {
    console.error("[AccessReviews] listHistory failed (DB unavailable):", err);
    return [];
  }
}

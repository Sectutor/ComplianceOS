/**
 * Policy acknowledgment service (scorecard P1 #4 — "Policy management + ack").
 *
 * Drizzle-native, user-based acknowledgment flow backed by the
 * `policy_acknowledgements` table (added to schema.ts in cycle 3). Because the
 * local Supabase DB is migrated out-of-band, we also ensure the table exists at
 * runtime (CREATE TABLE IF NOT EXISTS), matching the pattern already used by
 * `lib/policy/policyAcknowledgmentService.ts` for its legacy employee table.
 *
 * Structure mirrors the other cycle-3 libs: pure transition logic + db-backed
 * service functions, unit tested with a mocked db.
 */
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { clientPolicies, policyAcknowledgements, userClients, users } from "../schema";
import { safeDispatchWebhookEvent } from "./webhooks/webhookEvents";

export type AckStatus = "pending" | "acknowledged" | "declined";

export const ACK_STATUSES: readonly AckStatus[] = ["pending", "acknowledged", "declined"];

/** Default age (days) after which a pending ack is flagged for a reminder. */
export const DEFAULT_ACK_REMINDER_DAYS = 3;

export interface PolicyAckRow {
  id: number;
  policyId: number;
  userId: number;
  clientId: number;
  status: AckStatus;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

export interface PolicyAckWithTitle extends PolicyAckRow {
  policyTitle?: string;
}

export interface AckSummary {
  policyId: number;
  policyTitle: string;
  total: number;
  acknowledgedCount: number;
  pendingCount: number;
  acknowledgmentRatePct: number;
}

// ---------------------------------------------------------------------------
// Pure flow logic
// ---------------------------------------------------------------------------

/** A row can only be acknowledged when it is still pending (or declined). */
export function canAcknowledge(status: string | null | undefined): boolean {
  const s = (status || "pending").toLowerCase();
  return s === "pending" || s === "declined";
}

/**
 * Resolve the target status when acknowledging. Declined rows are re-opened to
 * acknowledged (a re-acknowledgment); already acknowledged is idempotent.
 */
export function resolveAcknowledgeTransition(
  current: string | null | undefined
): { allowed: boolean; nextStatus: AckStatus; reason?: string } {
  const s = (current || "pending").toLowerCase();
  if (s === "acknowledged") return { allowed: true, nextStatus: "acknowledged" };
  if (s === "pending" || s === "declined") return { allowed: true, nextStatus: "acknowledged" };
  return { allowed: false, nextStatus: "pending", reason: `Unknown status "${s}"` };
}

// ---------------------------------------------------------------------------
// Table bootstrap (safe when migrations lag the schema)
// ---------------------------------------------------------------------------

let tableEnsured = false;

export async function ensurePolicyAckTableExists(): Promise<void> {
  if (tableEnsured) return;
  const db = await getDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS policy_acknowledgements (
        id SERIAL PRIMARY KEY,
        policy_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pa_ack_client ON policy_acknowledgements(client_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pa_ack_policy ON policy_acknowledgements(policy_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pa_ack_user ON policy_acknowledgements(user_id);`);
    tableEnsured = true;
  } catch (err) {
    // Table may already exist or DDL is unavailable (tests, read replicas).
    // Log and continue — the Drizzle queries are the source of truth.
    console.error("[PolicyAck] Could not ensure policy_acknowledgements table:", err);
  }
}

// ---------------------------------------------------------------------------
// Service functions (db-backed)
// ---------------------------------------------------------------------------

/** List acknowledgments pending for a user (optionally scoped to a client). */
export async function listPendingAcks(
  clientId: number,
  userId?: number
): Promise<PolicyAckWithTitle[]> {
  await ensurePolicyAckTableExists();
  const db = await getDb();

  const rows = (await db
    .select({
      id: policyAcknowledgements.id,
      policyId: policyAcknowledgements.policyId,
      userId: policyAcknowledgements.userId,
      clientId: policyAcknowledgements.clientId,
      status: policyAcknowledgements.status,
      acknowledgedAt: policyAcknowledgements.acknowledgedAt,
      createdAt: policyAcknowledgements.createdAt,
      policyTitle: clientPolicies.name,
    })
    .from(policyAcknowledgements)
    .innerJoin(clientPolicies, eq(policyAcknowledgements.policyId, clientPolicies.id))
    .where(
      and(
        eq(policyAcknowledgements.clientId, clientId),
        eq(policyAcknowledgements.status, "pending"),
        userId !== undefined ? eq(policyAcknowledgements.userId, userId) : undefined
      )
    )
    .orderBy(desc(policyAcknowledgements.createdAt))) as unknown as PolicyAckWithTitle[];

  return rows.map((r) => ({ ...r, policyTitle: r.policyTitle || `Policy #${r.policyId}` }));
}

/**
 * Acknowledge a policy for a user. Upserts: existing pending/declined rows are
 * flipped to acknowledged; already acknowledged is an idempotent no-op.
 */
export async function acknowledgePolicy(input: {
  clientId: number;
  userId: number;
  policyId: number;
}): Promise<PolicyAckRow> {
  await ensurePolicyAckTableExists();
  const db = await getDb();

  const [existing] = await db
    .select()
    .from(policyAcknowledgements)
    .where(
      and(
        eq(policyAcknowledgements.clientId, input.clientId),
        eq(policyAcknowledgements.userId, input.userId),
        eq(policyAcknowledgements.policyId, input.policyId)
      )
    )
    .limit(1);

  const transition = resolveAcknowledgeTransition(existing?.status);
  if (!transition.allowed) {
    throw new Error(`Cannot acknowledge policy ${input.policyId}: ${transition.reason}`);
  }
  if (existing?.status === "acknowledged") {
    return existing as unknown as PolicyAckRow;
  }

  if (existing) {
    const [updated] = await db
      .update(policyAcknowledgements)
      .set({ status: transition.nextStatus, acknowledgedAt: new Date() })
      .where(eq(policyAcknowledgements.id, existing.id))
      .returning();
    return updated as unknown as PolicyAckRow;
  }

  const [inserted] = await db
    .insert(policyAcknowledgements)
    .values({
      clientId: input.clientId,
      userId: input.userId,
      policyId: input.policyId,
      status: transition.nextStatus,
      acknowledgedAt: new Date(),
    })
    .returning();
  return inserted as unknown as PolicyAckRow;
}

/** All acknowledgment rows for a policy (client-scoped). */
export async function listAcksForPolicy(
  policyId: number,
  clientId: number
): Promise<PolicyAckWithTitle[]> {
  await ensurePolicyAckTableExists();
  const db = await getDb();

  const rows = (await db
    .select({
      id: policyAcknowledgements.id,
      policyId: policyAcknowledgements.policyId,
      userId: policyAcknowledgements.userId,
      clientId: policyAcknowledgements.clientId,
      status: policyAcknowledgements.status,
      acknowledgedAt: policyAcknowledgements.acknowledgedAt,
      createdAt: policyAcknowledgements.createdAt,
      policyTitle: clientPolicies.name,
    })
    .from(policyAcknowledgements)
    .innerJoin(clientPolicies, eq(policyAcknowledgements.policyId, clientPolicies.id))
    .where(
      and(
        eq(policyAcknowledgements.policyId, policyId),
        eq(policyAcknowledgements.clientId, clientId)
      )
    )
    .orderBy(desc(policyAcknowledgements.createdAt))) as unknown as PolicyAckWithTitle[];

  return rows.map((r) => ({ ...r, policyTitle: r.policyTitle || `Policy #${r.policyId}` }));
}

/** Per-policy sign-off stats for a client. */
export async function getAckSummary(clientId: number): Promise<AckSummary[]> {
  await ensurePolicyAckTableExists();
  const db = await getDb();

  const rows = (await db
    .select({
      policyId: policyAcknowledgements.policyId,
      policyTitle: clientPolicies.name,
      status: policyAcknowledgements.status,
    })
    .from(policyAcknowledgements)
    .innerJoin(clientPolicies, eq(policyAcknowledgements.policyId, clientPolicies.id))
    .where(eq(policyAcknowledgements.clientId, clientId))) as unknown as Array<{
    policyId: number;
    policyTitle: string | null;
    status: string;
  }>;

  const byPolicy = new Map<number, { title: string; total: number; acknowledged: number; pending: number }>();
  for (const r of rows) {
    const entry = byPolicy.get(r.policyId) || {
      title: r.policyTitle || `Policy #${r.policyId}`,
      total: 0,
      acknowledged: 0,
      pending: 0,
    };
    entry.total += 1;
    if (r.status === "acknowledged") entry.acknowledged += 1;
    else if (r.status === "pending") entry.pending += 1;
    byPolicy.set(r.policyId, entry);
  }

  return Array.from(byPolicy.entries())
    .map(([policyId, e]) => ({
      policyId,
      policyTitle: e.title,
      total: e.total,
      acknowledgedCount: e.acknowledged,
      pendingCount: e.pending,
      acknowledgmentRatePct: e.total > 0 ? Math.round((e.acknowledged / e.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Cycle-3 UI contract (policyAckApi.ts): list + acknowledge-by-id
// ---------------------------------------------------------------------------

/** Acknowledgment row as the UI expects it (title + assignee resolved). */
export interface PolicyAckRecord {
  id: number;
  policyId: number;
  policyTitle: string;
  assigneeName?: string | null;
  status: "pending" | "acknowledged" | "declined" | string;
  acknowledgedAt?: string | null;
  dueDate?: string | null;
}

/**
 * Project ack rows onto the UI contract. Pure — policiesById maps policyId ->
 * title, usersById maps userId -> { name }. Rows missing either fall back to
 * "Policy #<id>" / null.
 */
export function buildAckRecords(
  rows: PolicyAckRow[],
  policiesById: Map<number, string>,
  usersById?: Map<number, { name?: string | null }>
): PolicyAckRecord[] {
  return (rows ?? []).map((r) => ({
    id: r.id,
    policyId: r.policyId,
    policyTitle: policiesById?.get(r.policyId) || `Policy #${r.policyId}`,
    assigneeName: usersById?.get(r.userId)?.name ?? null,
    status: r.status,
    acknowledgedAt: r.acknowledgedAt ? new Date(r.acknowledgedAt).toISOString() : null,
    dueDate: null,
  }));
}

/**
 * All acknowledgment records for a client (policy title + assignee name
 * resolved). Returns [] gracefully if the table is missing or DDL is
 * unavailable (tests, read replicas, un-migrated DBs).
 */
export async function listAcks(clientId: number): Promise<PolicyAckRecord[]> {
  try {
    await ensurePolicyAckTableExists();
    const db = await getDb();

    const rows = (await db
      .select({
        id: policyAcknowledgements.id,
        policyId: policyAcknowledgements.policyId,
        userId: policyAcknowledgements.userId,
        clientId: policyAcknowledgements.clientId,
        status: policyAcknowledgements.status,
        acknowledgedAt: policyAcknowledgements.acknowledgedAt,
        createdAt: policyAcknowledgements.createdAt,
        policyTitle: clientPolicies.name,
        assigneeName: users.name,
      })
      .from(policyAcknowledgements)
      .innerJoin(clientPolicies, eq(policyAcknowledgements.policyId, clientPolicies.id))
      .leftJoin(users, eq(policyAcknowledgements.userId, users.id))
      .where(eq(policyAcknowledgements.clientId, clientId))
      .orderBy(desc(policyAcknowledgements.createdAt))) as unknown as Array<
      PolicyAckRow & { policyTitle: string | null; assigneeName: string | null }
    >;

    const policiesById = new Map<number, string>();
    const usersById = new Map<number, { name?: string | null }>();
    for (const r of rows) {
      if (r.policyTitle) policiesById.set(r.policyId, r.policyTitle);
      usersById.set(r.userId, { name: r.assigneeName });
    }

    return buildAckRecords(rows as PolicyAckRow[], policiesById, usersById);
  } catch (err) {
    // Table may be missing or DB unavailable — degrade to an empty list.
    console.error("[PolicyAck] Could not list acknowledgments:", err);
    return [];
  }
}

/**
 * Acknowledge a single acknowledgment row by id (cycle-3 contract:
 * policyAck.acknowledge { acknowledgmentId }). Idempotent — an already
 * acknowledged row is returned untouched. Throws if the row does not exist.
 */
export async function acknowledgeById(acknowledgmentId: number): Promise<PolicyAckRow> {
  await ensurePolicyAckTableExists();
  const db = await getDb();

  const [existing] = await db
    .select()
    .from(policyAcknowledgements)
    .where(eq(policyAcknowledgements.id, acknowledgmentId))
    .limit(1);

  if (!existing) {
    throw new Error(`Acknowledgment ${acknowledgmentId} not found`);
  }

  if (existing.status === "acknowledged") {
    return existing as unknown as PolicyAckRow;
  }

  const [updated] = await db
    .update(policyAcknowledgements)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(eq(policyAcknowledgements.id, acknowledgmentId))
    .returning();

  return updated as unknown as PolicyAckRow;
}

// ---------------------------------------------------------------------------
// Cycle-6 (P1 #4): assignment + reminders
// ---------------------------------------------------------------------------

/**
 * Pure: pick pending acknowledgment rows older than `overdueDays` (default 3).
 * Rows with a missing/invalid createdAt are never flagged.
 */
export function selectAcksDueForReminder(
  rows: Array<{
    id: number;
    status?: string | null;
    createdAt?: Date | string | null;
  }>,
  now: Date,
  overdueDays: number = DEFAULT_ACK_REMINDER_DAYS
): Array<{ id: number; overdueDays: number }> {
  const cutoff = now.getTime() - overdueDays * 24 * 60 * 60 * 1000;
  return (rows ?? [])
    .filter((r) => {
      if (!r || String(r.status ?? "").toLowerCase() !== "pending") return false;
      if (!r.createdAt) return false;
      const t =
        r.createdAt instanceof Date
          ? r.createdAt.getTime()
          : new Date(r.createdAt).getTime();
      return Number.isFinite(t) && t <= cutoff;
    })
    .map((r) => ({ id: r.id, overdueDays }));
}

export interface AssignPolicyResult {
  assigned: number;
  existing: number;
  userIds: number[];
}

/**
 * Assign a policy to users by creating pending acknowledgment rows
 * (idempotent — users who already have a row for this policy are skipped).
 *
 * Target users:
 *   - explicit `userIds`, and/or
 *   - every user linked to the client (via `user_clients`) when `allUsers`
 *     is set or no userIds were provided.
 */
export async function assignPolicy(input: {
  clientId: number;
  policyId: number;
  userIds?: number[];
  allUsers?: boolean;
}): Promise<AssignPolicyResult> {
  await ensurePolicyAckTableExists();
  const db = await getDb();

  let userIds = Array.isArray(input.userIds) ? input.userIds : [];
  if (input.allUsers || userIds.length === 0) {
    const links = (await db
      .select({ userId: userClients.userId })
      .from(userClients)
      .where(eq(userClients.clientId, input.clientId))) as unknown as Array<{
      userId: number;
    }>;
    const linked = (links ?? [])
      .map((l) => Number(l.userId))
      .filter((id) => Number.isFinite(id));
    userIds = Array.from(new Set([...userIds, ...linked]));
  }

  userIds = userIds.filter((id) => Number.isFinite(Number(id)));
  if (userIds.length === 0) return { assigned: 0, existing: 0, userIds: [] };

  const existing = (await db
    .select({ userId: policyAcknowledgements.userId })
    .from(policyAcknowledgements)
    .where(
      and(
        eq(policyAcknowledgements.clientId, input.clientId),
        eq(policyAcknowledgements.policyId, input.policyId),
        inArray(policyAcknowledgements.userId, userIds)
      )
    )) as unknown as Array<{ userId: number }>;

  const existingSet = new Set((existing ?? []).map((e) => Number(e.userId)));
  const missing = userIds.filter((id) => !existingSet.has(Number(id)));

  let assigned = 0;
  if (missing.length > 0) {
    await db.insert(policyAcknowledgements).values(
      missing.map((userId) => ({
        clientId: input.clientId,
        policyId: input.policyId,
        userId,
        status: "pending" as const,
      }))
    );
    assigned = missing.length;
  }

  return { assigned, existing: existingSet.size, userIds };
}

/** Pending acknowledgment rows (title resolved) older than `overdueDays`. */
export async function listOverdueAcks(
  clientId: number,
  now: Date = new Date(),
  overdueDays: number = DEFAULT_ACK_REMINDER_DAYS
): Promise<PolicyAckWithTitle[]> {
  await ensurePolicyAckTableExists();
  const db = await getDb();
  const cutoff = new Date(now.getTime() - overdueDays * 24 * 60 * 60 * 1000);

  const rows = (await db
    .select({
      id: policyAcknowledgements.id,
      policyId: policyAcknowledgements.policyId,
      userId: policyAcknowledgements.userId,
      clientId: policyAcknowledgements.clientId,
      status: policyAcknowledgements.status,
      acknowledgedAt: policyAcknowledgements.acknowledgedAt,
      createdAt: policyAcknowledgements.createdAt,
      policyTitle: clientPolicies.name,
    })
    .from(policyAcknowledgements)
    .innerJoin(clientPolicies, eq(policyAcknowledgements.policyId, clientPolicies.id))
    .where(
      and(
        eq(policyAcknowledgements.clientId, clientId),
        eq(policyAcknowledgements.status, "pending"),
        lte(policyAcknowledgements.createdAt, cutoff)
      )
    )
    .orderBy(desc(policyAcknowledgements.createdAt))) as unknown as PolicyAckWithTitle[];

  return rows.map((r) => ({ ...r, policyTitle: r.policyTitle || `Policy #${r.policyId}` }));
}

export interface AckReminderSummary {
  flagged: number;
  overdueDays: number;
  skipped: boolean;
  completedAt: Date;
}

/**
 * Run the reminder pass: select every pending ack older than `overdueDays`
 * (optionally scoped to one client) and invoke `onFlag` for each — the
 * scheduler wires logging/notification here. Db-backed but fully injectable
 * for tests.
 */
export async function runPolicyAckReminders(options: {
  db?: any;
  now?: Date;
  overdueDays?: number;
  clientId?: number;
  onFlag?: (ack: PolicyAckWithTitle) => void | Promise<void>;
} = {}): Promise<AckReminderSummary> {
  const now = options.now ?? new Date();
  const overdueDays = options.overdueDays ?? DEFAULT_ACK_REMINDER_DAYS;
  try {
    await ensurePolicyAckTableExists();
  } catch {
    /* DDL is best-effort */
  }
  const db = options.db ?? (await getDb());
  const cutoff = new Date(now.getTime() - overdueDays * 24 * 60 * 60 * 1000);

  const rows = (await db
    .select({
      id: policyAcknowledgements.id,
      policyId: policyAcknowledgements.policyId,
      userId: policyAcknowledgements.userId,
      clientId: policyAcknowledgements.clientId,
      status: policyAcknowledgements.status,
      acknowledgedAt: policyAcknowledgements.acknowledgedAt,
      createdAt: policyAcknowledgements.createdAt,
      policyTitle: clientPolicies.name,
    })
    .from(policyAcknowledgements)
    .innerJoin(clientPolicies, eq(policyAcknowledgements.policyId, clientPolicies.id))
    .where(
      and(
        options.clientId !== undefined
          ? eq(policyAcknowledgements.clientId, options.clientId)
          : undefined,
        eq(policyAcknowledgements.status, "pending"),
        lte(policyAcknowledgements.createdAt, cutoff)
      )
    )
    .orderBy(desc(policyAcknowledgements.createdAt))) as unknown as PolicyAckWithTitle[];

  const flagged = (rows ?? []).map((r) => ({
    ...r,
    policyTitle: r.policyTitle || `Policy #${r.policyId}`,
  }));

  for (const ack of flagged) {
    if (options.onFlag) await options.onFlag(ack);
    void safeDispatchWebhookEvent(ack.clientId, "policy.ack.overdue", {
      acknowledgmentId: ack.id,
      clientId: ack.clientId,
    }); // webhook event
  }

  return {
    flagged: flagged.length,
    overdueDays,
    skipped: false,
    completedAt: now,
  };
}

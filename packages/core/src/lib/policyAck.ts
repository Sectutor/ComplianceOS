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
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { clientPolicies, policyAcknowledgements, users } from "../schema";

export type AckStatus = "pending" | "acknowledged" | "declined";

export const ACK_STATUSES: readonly AckStatus[] = ["pending", "acknowledged", "declined"];

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

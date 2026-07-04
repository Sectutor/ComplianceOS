import { getDb } from '../db';
import * as schema from '../schema';
import { auditorSessions, auditorComments } from '../schema_auditor';
import { eq, and, lt, gt, count, sql, desc } from 'drizzle-orm';
import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditorSession {
  id: number;
  clientId: number;
  token: string;
  expiresAt: Date;
  scope: string | null;
  auditorEmail: string | null;
  auditorName: string | null;
  createdById: number | null;
  lastAccessedAt: Date | null;
  isRevoked: boolean | null;
  createdAt: Date | null;
}

export interface CreateSessionOptions {
  expiresInHours: number;
  scope?: string;
  auditorEmail?: string;
  auditorName?: string;
}

export interface AuditorDashboardData {
  clientName: string;
  framework: string;
  totalControls: number;
  implementedControls: number;
  evidenceCount: number;
  complianceScore: number;
  recentSnapshots: number;
  controls: Array<{
    id: number;
    controlId: string;
    name: string;
    status: string;
    category: string;
    evidence: Array<{
      id: number;
      fileName: string;
      status: string;
      collectedAt: Date | null;
      expirationDate: Date | null;
    }>;
  }>;
}

// ─── Session Management ──────────────────────────────────────────────────────

export async function createAuditorSession(
  clientId: number,
  options: CreateSessionOptions
): Promise<AuditorSession> {
  const db = await getDb();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000);

  const [session] = await db.insert(auditorSessions).values({
    clientId,
    token,
    expiresAt,
    scope: options.scope ?? 'all',
    auditorEmail: options.auditorEmail ?? null,
    auditorName: options.auditorName ?? null,
    createdById: null,
    isRevoked: false,
  }).returning();

  return session;
}

export async function getAuditorDashboard(token: string): Promise<AuditorDashboardData | null> {
  const db = await getDb();

  // Validate session
  const session = await db.query.auditorSessions.findFirst({
    where: and(
      eq(auditorSessions.token, token),
      eq(auditorSessions.isRevoked, false),
      gt(auditorSessions.expiresAt, new Date())
    ),
  });

  if (!session) return null;

  // Update last accessed
  await db.update(auditorSessions)
    .set({ lastAccessedAt: new Date() })
    .where(eq(auditorSessions.id, session.id));

  // Get client info
  const client = await db.query.clients.findFirst({
    where: eq(schema.clients.id, session.clientId),
  });

  if (!client) return null;

  // Get client controls
  const clientControls = await db.select().from(schema.clientControls)
    .where(eq(schema.clientControls.clientId, session.clientId));

  const totalControls = clientControls.length;
  const implementedControls = clientControls.filter(
    (cc: any) => cc.status === 'implemented'
  ).length;

  // Get evidence for this client
  const allEvidence = await db.select().from(schema.evidence)
    .where(eq(schema.evidence.clientId, session.clientId));

  const evidenceCount = allEvidence.length;

  // Build evidence-by-control map
  const evidenceByControl = new Map<number, any[]>();
  for (const ev of allEvidence) {
    const arr = evidenceByControl.get(ev.clientControlId) || [];
    arr.push(ev);
    evidenceByControl.set(ev.clientControlId, arr);
  }

  // Compute compliance score (percentage of implemented controls)
  const complianceScore = totalControls > 0
    ? Math.round((implementedControls / totalControls) * 100)
    : 0;

  // Build controls list with evidence
  const controls = clientControls.map((cc: any) => ({
    id: cc.id,
    controlId: cc.clientControlId || `CC-${cc.id}`,
    name: cc.clientControlId || `Control #${cc.id}`,
    status: cc.status || 'unknown',
    category: cc.category || 'General',
    evidence: (evidenceByControl.get(cc.id) || []).map((ev: any) => ({
      id: ev.id,
      fileName: ev.fileName || ev.fileName || `Evidence #${ev.id}`,
      status: ev.status || 'unknown',
      collectedAt: ev.collectedAt || ev.createdAt || null,
      expirationDate: ev.expirationDate || null,
    })),
  }));

  // Get recent snapshots count (placeholder: count monitor events)
  let recentSnapshots = 0;
  try {
    const { complianceMonitorEvents } = await import('../../schema_monitor');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const snapshotResult = await db.select({ count: count() })
      .from(complianceMonitorEvents)
      .where(and(
        eq(complianceMonitorEvents.clientId, session.clientId),
        gt(complianceMonitorEvents.createdAt, thirtyDaysAgo)
      ));
    recentSnapshots = snapshotResult[0]?.count ?? 0;
  } catch {
    recentSnapshots = 0;
  }

  // Determine primary framework
  const framework = client.industry || client.organizationId || 'SOC 2';

  return {
    clientName: client.name,
    framework,
    totalControls,
    implementedControls,
    evidenceCount,
    complianceScore,
    recentSnapshots,
    controls,
  };
}

export async function revokeAuditorSession(token: string): Promise<void> {
  const db = await getDb();
  await db.update(auditorSessions)
    .set({ isRevoked: true })
    .where(eq(auditorSessions.token, token));
}

export async function getActiveSessions(clientId: number): Promise<AuditorSession[]> {
  const db = await getDb();
  const sessions = await db.select().from(auditorSessions)
    .where(and(
      eq(auditorSessions.clientId, clientId),
      eq(auditorSessions.isRevoked, false),
      gt(auditorSessions.expiresAt, new Date())
    ))
    .orderBy(desc(auditorSessions.createdAt));
  return sessions;
}

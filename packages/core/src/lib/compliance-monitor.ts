import { getDb } from '../db';
import * as schema from '../schema';
import { complianceMonitorEvents } from '../schema_monitor';
import { eq, and, lt, gte, count, sql, desc, lte, isNull } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  totalControls: number;
  healthyControls: number;
  atRiskControls: number;
  expiringEvidence: number;
  missingEvidence: number;
  staleEvidence: number;
  overallHealth: 'good' | 'caution' | 'critical';
  timestamp: string;
  details: Array<{
    controlId: number;
    controlName: string;
    status: string;
    issues: string[];
  }>;
}

export interface DriftEvent {
  type: 'status_changed' | 'evidence_expired' | 'evidence_added' | 'evidence_removed';
  controlId: number;
  controlName?: string;
  oldValue: string;
  newValue: string;
  timestamp: Date;
}

export interface MonitorSummary {
  totalChanges: number;
  statusChanges: number;
  evidenceChanges: number;
  riskChanges: number;
  topAffectedControls: Array<{
    controlId: number;
    controlName: string;
    changeCount: number;
  }>;
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function runComplianceHealthCheck(clientId: number): Promise<HealthCheckResult> {
  const db = await getDb();

  // Fetch all client controls for this client
  const clientControls = await db.select().from(schema.clientControls)
    .where(eq(schema.clientControls.clientId, clientId));

  const totalControls = clientControls.length;
  if (totalControls === 0) {
    return {
      totalControls: 0,
      healthyControls: 0,
      atRiskControls: 0,
      expiringEvidence: 0,
      missingEvidence: 0,
      staleEvidence: 0,
      overallHealth: 'good',
      timestamp: new Date().toISOString(),
      details: [],
    };
  }

  // Fetch all evidence for this client
  const allEvidence = await db.select().from(schema.evidence)
    .where(eq(schema.evidence.clientId, clientId));

  // Build a map: clientControlId -> evidence[]
  const evidenceByControl = new Map<number, typeof allEvidence>();
  for (const ev of allEvidence) {
    const arr = evidenceByControl.get(ev.clientControlId) || [];
    arr.push(ev);
    evidenceByControl.set(ev.clientControlId, arr);
  }

  const now = new Date();
  const details: HealthCheckResult['details'] = [];

  let healthyControls = 0;
  let atRiskControls = 0;
  let expiringEvidence = 0;
  let missingEvidenceCount = 0;
  let staleEvidence = 0;

  for (const cc of clientControls) {
    const controlEvidence = evidenceByControl.get(cc.id) || [];
    const issues: string[] = [];

    // Check 1: Does the control have evidence?
    if (controlEvidence.length === 0) {
      issues.push('No evidence collected');
      missingEvidenceCount++;
    }

    // Check 2 & 3: Evidence status and expiration
    const validEvidence = controlEvidence.filter(ev =>
      (ev.status === 'collected' || ev.status === 'verified') &&
      (!ev.expirationDate || ev.expirationDate > now)
    );

    if (validEvidence.length === 0 && controlEvidence.length > 0) {
      issues.push('Evidence is expired or not in valid status');
    }

    // Check for expiring evidence (within 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiring = controlEvidence.filter(ev =>
      ev.expirationDate && ev.expirationDate > now && ev.expirationDate <= thirtyDaysFromNow
    );
    if (expiring.length > 0) {
      issues.push(`${expiring.length} evidence item(s) expiring within 30 days`);
      expiringEvidence += expiring.length;
    }

    // Check 4: Is lastVerified within review interval?
    const mostRecentVerified = controlEvidence
      .filter(ev => ev.lastVerified)
      .sort((a, b) => new Date(b.lastVerified!).getTime() - new Date(a.lastVerified!).getTime())[0];

    if (mostRecentVerified) {
      const intervalDays = mostRecentVerified.intervalDays || 365;
      const reviewWindow = new Date(now.getTime() - intervalDays * 24 * 60 * 60 * 1000);
      if (new Date(mostRecentVerified.lastVerified!) < reviewWindow) {
        issues.push('Evidence review is overdue (last verified beyond expected interval)');
        staleEvidence++;
      }
    } else if (controlEvidence.length > 0) {
      issues.push('Evidence exists but has never been verified');
      staleEvidence++;
    }

    // Determine control health
    if (issues.length === 0) {
      healthyControls++;
    } else {
      atRiskControls++;
    }

    details.push({
      controlId: cc.id,
      controlName: cc.clientControlId || `Control #${cc.id}`,
      status: cc.status,
      issues,
    });
  }

  // Compute overall health
  const healthRatio = totalControls > 0 ? healthyControls / totalControls : 1;
  let overallHealth: 'good' | 'caution' | 'critical';
  if (healthRatio >= 0.8) {
    overallHealth = 'good';
  } else if (healthRatio >= 0.5) {
    overallHealth = 'caution';
  } else {
    overallHealth = 'critical';
  }

  return {
    totalControls,
    healthyControls,
    atRiskControls,
    expiringEvidence,
    missingEvidence: missingEvidenceCount,
    staleEvidence,
    overallHealth,
    timestamp: new Date().toISOString(),
    details,
  };
}

// ─── All Clients Health Check ──────────────────────────────────────────────

export async function runAllClientHealthChecks(): Promise<{ clientId: number; score: number }[]> {
  const db = await getDb();
  const clientsList = await db.select().from(schema.clients);

  const results: { clientId: number; score: number }[] = [];

  for (const client of clientsList) {
    try {
      const health = await runComplianceHealthCheck(client.id);
      const score = health.totalControls > 0
        ? Math.round((health.healthyControls / health.totalControls) * 100)
        : 100;
      results.push({ clientId: client.id, score });
    } catch (err) {
      console.error(`[ComplianceMonitor] Health check failed for client ${client.id}:`, err);
      results.push({ clientId: client.id, score: 0 });
    }
  }

  return results;
}

// ─── Drift Detection ────────────────────────────────────────────────────────

export async function detectDrift(
  clientId: number,
  sinceMinutes: number = 60
): Promise<DriftEvent[]> {
  const db = await getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const events: DriftEvent[] = [];

  // Query control_history for recent changes
  // Since we don't have clientId on control_history directly, we get clientControls first
  const clientControls = await db.select().from(schema.clientControls)
    .where(eq(schema.clientControls.clientId, clientId));

  const controlIds = clientControls.map(cc => cc.controlId);

  if (controlIds.length > 0) {
    // We use a join approach or iterate
    for (const cc of clientControls) {
      const historyEntries = await db.select()
        .from(schema.controlHistory)
        .where(and(
          eq(schema.controlHistory.controlId, cc.controlId),
          gte(schema.controlHistory.changedAt, since)
        ))
        .orderBy(desc(schema.controlHistory.changedAt))
        .limit(5);

      for (const entry of historyEntries) {
        events.push({
          type: 'status_changed',
          controlId: cc.id,
          controlName: entry.name || cc.clientControlId || undefined,
          oldValue: '',
          newValue: JSON.stringify({ version: entry.version, note: entry.changeNote }),
          timestamp: entry.changedAt,
        });
      }
    }
  }

  // Check compliance_monitor_events for recent events (for evidence changes)
  const recentMonitorEvents = await db.select()
    .from(complianceMonitorEvents)
    .where(and(
      eq(complianceMonitorEvents.clientId, clientId),
      gte(complianceMonitorEvents.createdAt, since)
    ))
    .orderBy(desc(complianceMonitorEvents.createdAt));

  for (const ev of recentMonitorEvents) {
    events.push({
      type: mapEventType(ev.eventType),
      controlId: ev.controlId || 0,
      controlName: ev.controlName || undefined,
      oldValue: ev.oldValue || '',
      newValue: ev.newValue || '',
      timestamp: ev.createdAt,
    });
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return events.slice(0, 100);
}

function mapEventType(type: string): DriftEvent['type'] {
  switch (type) {
    case 'evidence_expired':
      return 'evidence_expired';
    case 'evidence_added':
      return 'evidence_added';
    case 'evidence_removed':
      return 'evidence_removed';
    default:
      return 'status_changed';
  }
}

// ─── Create Monitor Event ──────────────────────────────────────────────────

export async function createMonitorEvent(event: {
  clientId: number;
  eventType: string;
  controlId?: number;
  controlName?: string;
  oldValue?: string;
  newValue?: string;
  severity?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();

  await db.insert(complianceMonitorEvents).values({
    clientId: event.clientId,
    eventType: event.eventType,
    controlId: event.controlId ?? null,
    controlName: event.controlName ?? null,
    oldValue: event.oldValue ?? null,
    newValue: event.newValue ?? null,
    severity: event.severity ?? 'info',
    details: event.details ?? null,
  });
}

// ─── Get Monitor Summary ───────────────────────────────────────────────────

export async function getMonitorSummary(
  clientId: number,
  hours: number = 24
): Promise<MonitorSummary> {
  const db = await getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const events = await db.select()
    .from(complianceMonitorEvents)
    .where(and(
      eq(complianceMonitorEvents.clientId, clientId),
      gte(complianceMonitorEvents.createdAt, since)
    ))
    .orderBy(desc(complianceMonitorEvents.createdAt));

  const statusChanges = events.filter(e =>
    ['status_changed', 'compliance_status_change'].includes(e.eventType)
  ).length;
  const evidenceChanges = events.filter(e =>
    ['evidence_added', 'evidence_removed', 'evidence_expired'].includes(e.eventType)
  ).length;
  const riskChanges = events.filter(e =>
    e.severity === 'critical' || e.severity === 'warning'
  ).length;

  // Top affected controls
  const controlMap = new Map<number, { controlName: string; count: number }>();
  for (const ev of events) {
    if (ev.controlId) {
      const existing = controlMap.get(ev.controlId) || { controlName: ev.controlName || `Control #${ev.controlId}`, count: 0 };
      existing.count++;
      controlMap.set(ev.controlId, existing);
    }
  }

  const topAffectedControls = Array.from(controlMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([controlId, info]) => ({
      controlId,
      controlName: info.controlName,
      changeCount: info.count,
    }));

  return {
    totalChanges: events.length,
    statusChanges,
    evidenceChanges,
    riskChanges,
    topAffectedControls,
  };
}

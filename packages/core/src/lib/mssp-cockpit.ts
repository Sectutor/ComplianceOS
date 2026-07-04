import { getDb } from '../db';
import { clients, clientControls, evidence, complianceSnapshots, clientFrameworks } from '../schema';
import { autopilotRuns, autopilotActions } from '../schema_autopilot';
import { eq, and, desc, count } from 'drizzle-orm';
import { computeComplianceDebt } from './compliance-debt';

export interface ClientHealthSummary {
  clientId: number;
  clientName: string;
  complianceScore: number;      // 0-100 from latest snapshot or computed
  debtScore: number;            // 0-100 from compliance-debt
  controlCount: number;
  implementedPercent: number;
  evidenceHealth: 'good' | 'caution' | 'critical';
  overdueActions: number;
  lastAutopilotRun: string | null;
  daysSinceLastRun: number;
  frameworkCount: number;
  status: 'active' | 'at_risk' | 'critical' | 'inactive';
}

export interface MSSPSummary {
  totalClients: number;
  activeClients: number;
  atRiskClients: number;
  criticalClients: number;
  averageScore: number;
  totalOverdueActions: number;
  totalEvidenceItems: number;
  clientsWithAutopilot: number;
}

export interface CommonGap {
  controlCode: string;
  controlName: string;
  framework: string;
  affectedClients: number;
  totalClients: number;
  percentage: number;
}

export class MSSPCockpit {
  /** Aggregate health across ALL clients */
  static async getSummary(): Promise<MSSPSummary> {
    const db = await getDb();
    const allClients = await db.select().from(clients);
    let totalScore = 0;
    let activeCount = 0;
    let atRiskCount = 0;
    let criticalCount = 0;
    let totalOverdue = 0;
    let totalEvidence = 0;
    let autopilotCount = 0;

    for (const client of allClients) {
      const health = await this.getClientHealth(client.id);
      totalScore += health.complianceScore;
      totalOverdue += health.overdueActions;
      if (health.status === 'active') activeCount++;
      else if (health.status === 'at_risk') atRiskCount++;
      else if (health.status === 'critical') criticalCount++;
    }

    const evidenceCount = await db.select({ count: count() }).from(evidence);
    totalEvidence = evidenceCount[0]?.count || 0;

    const autopilotClients = await db.select({ count: count() })
      .from(autopilotRuns)
      .where(eq(autopilotRuns.status, 'completed'))
      .groupBy(autopilotRuns.clientId);
    autopilotCount = autopilotClients.length;

    return {
      totalClients: allClients.length,
      activeClients: activeCount,
      atRiskClients: atRiskCount,
      criticalClients: criticalCount,
      averageScore: allClients.length > 0 ? Math.round(totalScore / allClients.length) : 0,
      totalOverdueActions: totalOverdue,
      totalEvidenceItems: totalEvidence,
      clientsWithAutopilot: autopilotCount,
    };
  }

  /** Get health for ALL clients (for the main grid) */
  static async getAllClientHealths(): Promise<ClientHealthSummary[]> {
    const db = await getDb();
    const allClients = await db.select().from(clients);
    const results: ClientHealthSummary[] = [];

    for (const client of allClients) {
      const health = await this.getClientHealth(client.id);
      results.push(health);
    }

    return results.sort((a, b) => a.complianceScore - b.complianceScore);
  }

  /** Get health for a single client */
  static async getClientHealth(clientId: number): Promise<ClientHealthSummary> {
    const db = await getDb();
    const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    // Get control stats
    const controls = await db.select().from(clientControls)
      .where(eq(clientControls.clientId, clientId));
    const implemented = controls.filter(c => c.status === 'implemented').length;

    // Get debt score
    let debtScore = 0;
    try {
      const debt = await computeComplianceDebt(clientId);
      debtScore = debt.debtScore;
    } catch {
      debtScore = 50;
    }

    // Get compliance score from latest snapshot or estimate from controls
    const snapshot = await db.query.complianceSnapshots.findFirst({
      where: eq(complianceSnapshots.clientId, clientId),
      orderBy: [desc(complianceSnapshots.snapshotDate)],
    });
    const complianceScore = snapshot?.complianceScore ?? (controls.length > 0 ? Math.round((implemented / controls.length) * 100) : 0);

    // Evidence health
    const evidenceItems = await db.select().from(evidence)
      .where(eq(evidence.clientId, clientId));
    const expiredEvidence = evidenceItems.filter(e => e.expirationDate && new Date(e.expirationDate) < new Date()).length;
    const evidenceHealth: 'good' | 'caution' | 'critical' = expiredEvidence > 5 ? 'critical' : expiredEvidence > 0 ? 'caution' : 'good';

    // Overdue actions from autopilot
    const pendingActions = await db.select({ count: count() })
      .from(autopilotActions)
      .where(and(
        eq(autopilotActions.clientId, clientId),
        eq(autopilotActions.status, 'pending'),
      ));
    const overdueActions = pendingActions[0]?.count || 0;

    // Last autopilot run
    const lastRun = await db.query.autopilotRuns.findFirst({
      where: and(
        eq(autopilotRuns.clientId, clientId),
        eq(autopilotRuns.status, 'completed'),
      ),
      orderBy: [desc(autopilotRuns.startedAt)],
    });

    // Framework count
    const frameworks = await db.select({ count: count() })
      .from(clientFrameworks)
      .where(eq(clientFrameworks.clientId, clientId));
    const frameworkCount = frameworks[0]?.count || 0;

    // Status determination
    let status: 'active' | 'at_risk' | 'critical' | 'inactive';
    if (controls.length === 0) status = 'inactive';
    else if (complianceScore < 30 || expiredEvidence > 10) status = 'critical';
    else if (complianceScore < 60 || expiredEvidence > 3) status = 'at_risk';
    else status = 'active';

    return {
      clientId: client.id,
      clientName: client.name || `Client #${client.id}`,
      complianceScore,
      debtScore,
      controlCount: controls.length,
      implementedPercent: controls.length > 0 ? Math.round((implemented / controls.length) * 100) : 0,
      evidenceHealth,
      overdueActions,
      lastAutopilotRun: lastRun?.startedAt?.toISOString() || null,
      daysSinceLastRun: lastRun?.startedAt ? Math.round((Date.now() - new Date(lastRun.startedAt).getTime()) / 86400000) : 999,
      frameworkCount,
      status,
    };
  }

  /** Find common gaps across all clients */
  static async getCommonGaps(limit = 10): Promise<CommonGap[]> {
    const db = await getDb();
    const allClients = await db.select().from(clients);
    const gapMap = new Map<string, { name: string; clients: Set<number> }>();

    for (const client of allClients) {
      const cc = await db.select().from(clientControls)
        .where(and(
          eq(clientControls.clientId, client.id),
          eq(clientControls.status, 'not_implemented'),
        ));
      for (const c of cc) {
        // Group by control code pattern
        const code = c.controlId ? `control_${c.controlId}` : `cc_${c.id}`;
        const name = c.controlId ? `Control #${c.controlId}` : `Client Control #${c.id}`;
        if (!gapMap.has(code)) {
          gapMap.set(code, { name, clients: new Set() });
        }
        gapMap.get(code)!.clients.add(client.id);
      }
    }

    const totalClients = allClients.length;
    return Array.from(gapMap.entries())
      .map(([code, info]) => ({
        controlCode: code,
        controlName: info.name,
        framework: 'Cross-Framework',
        affectedClients: info.clients.size,
        totalClients,
        percentage: Math.round((info.clients.size / totalClients) * 100),
      }))
      .sort((a, b) => b.affectedClients - a.affectedClients)
      .slice(0, limit);
  }
}

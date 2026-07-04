import { getDb } from '../../db';
import { autopilotConfigs, autopilotRuns, autopilotActions } from '../../schema_autopilot';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { AutopilotConfig, AutopilotRun, AutopilotAction } from './types';

export class AutopilotEngine {
  /**
   * Run autopilot for a single client — the main orchestrator.
   * Called by cron scheduler or manually via "Run Now" button.
   */
  static async run(clientId: number): Promise<AutopilotRun> {
    const config = await this.getConfig(clientId);
    if (!config || !config.enabled) {
      throw new Error('Autopilot is not enabled for this client');
    }

    const db = await getDb();
    const startTime = Date.now();

    // Create run record
    const [run] = await db.insert(autopilotRuns).values({
      clientId,
      status: 'running',
      startedAt: new Date(),
      modulesExecuted: [],
      results: {
        evidenceCollected: 0,
        healthIssuesFound: 0,
        gapsDetected: 0,
        tasksCreated: 0,
        reportGenerated: false,
        notificationsSent: 0,
      },
    }).returning();

    const modules = config.modules;
    const executed: string[] = [];
    const results = { evidenceCollected: 0, healthIssuesFound: 0, gapsDetected: 0, tasksCreated: 0, reportGenerated: false, notificationsSent: 0 };

    try {
      // Module 1: Collect evidence via connectors
      if (modules.collectEvidence) {
        executed.push('collectEvidence');
        results.evidenceCollected = await this.runEvidenceCollection(clientId);
      }

      // Module 2: Run compliance health checks
      if (modules.runHealthChecks) {
        executed.push('runHealthChecks');
        const healthResult = await this.runHealthCheck(clientId);
        results.healthIssuesFound = healthResult.atRiskControls;
      }

      // Module 3: Detect evidence gaps
      if (modules.detectGaps) {
        executed.push('detectGaps');
        results.gapsDetected = await this.detectGaps(clientId);
      }

      // Module 4: Create remediation tasks
      if (modules.createRemediationTasks) {
        executed.push('createRemediationTasks');
        results.tasksCreated = await this.createRemediationTasks(clientId, config);
      }

      // Module 5: Generate report
      if (modules.generateReport) {
        executed.push('generateReport');
        results.reportGenerated = await this.generateReport(clientId);
      }

      // Module 6: Send notifications
      if (modules.sendNotifications) {
        executed.push('sendNotifications');
        results.notificationsSent = await this.sendSummary(clientId, results);
      }

      // Update run record
      const duration = Math.round((Date.now() - startTime) / 1000);
      await db.update(autopilotRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          modulesExecuted: executed,
          results,
          duration,
        })
        .where(eq(autopilotRuns.id, run.id));

      // Update config lastRunAt
      await db.update(autopilotConfigs)
        .set({ lastRunAt: new Date(), updatedAt: new Date() })
        .where(eq(autopilotConfigs.clientId, clientId));

      return {
        ...run,
        status: 'completed',
        completedAt: new Date(),
        modulesExecuted: executed,
        results,
        duration,
      } as unknown as AutopilotRun;
    } catch (error: any) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      await db.update(autopilotRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          modulesExecuted: executed,
          results,
          errorMessage: error.message || 'Unknown error',
          duration,
        })
        .where(eq(autopilotRuns.id, run.id));
      throw error;
    }
  }

  /** Get or create autopilot config for a client */
  static async getConfig(clientId: number): Promise<AutopilotConfig | null> {
    const db = await getDb();
    let config = await db.query.autopilotConfigs.findFirst({
      where: eq(autopilotConfigs.clientId, clientId),
    });
    if (!config) {
      // Auto-create default config
      const [newConfig] = await db.insert(autopilotConfigs).values({
        clientId,
        enabled: false,
        schedule: 'daily',
        modules: {
          collectEvidence: true,
          runHealthChecks: true,
          detectGaps: true,
          createRemediationTasks: true,
          generateReport: false,
          sendNotifications: true,
        },
        approvalMode: 'review',
      }).returning();
      config = newConfig;
    }
    return config as unknown as AutopilotConfig;
  }

  /** Update autopilot config */
  static async updateConfig(clientId: number, updates: Partial<AutopilotConfig>): Promise<void> {
    const db = await getDb();
    await db.update(autopilotConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(autopilotConfigs.clientId, clientId));
  }

  /** Get run history for a client */
  static async getRunHistory(clientId: number, limit = 10): Promise<AutopilotRun[]> {
    const db = await getDb();
    return db.select().from(autopilotRuns)
      .where(eq(autopilotRuns.clientId, clientId))
      .orderBy(desc(autopilotRuns.startedAt))
      .limit(limit) as unknown as AutopilotRun[];
  }

  /** Get pending actions that need review */
  static async getPendingActions(clientId: number): Promise<AutopilotAction[]> {
    const db = await getDb();
    return db.select().from(autopilotActions)
      .where(and(
        eq(autopilotActions.clientId, clientId),
        eq(autopilotActions.status, 'pending'),
      ))
      .orderBy(desc(autopilotActions.createdAt)) as unknown as AutopilotAction[];
  }

  /** Approve or reject an autopilot action */
  static async reviewAction(actionId: number, userId: number, status: 'approved' | 'rejected'): Promise<void> {
    const db = await getDb();
    const [action] = await db.select().from(autopilotActions)
      .where(eq(autopilotActions.id, actionId)).limit(1);
    if (!action) throw new Error('Action not found');

    await db.update(autopilotActions)
      .set({ status, reviewedAt: new Date(), reviewedBy: userId })
      .where(eq(autopilotActions.id, actionId));

    // If approved, execute the action
    if (status === 'approved') {
      await this.executeAction(action as unknown as AutopilotAction);
    }
  }

  // ---- Module implementations ----

  private static async runEvidenceCollection(clientId: number): Promise<number> {
    // Try to call the connectors SDK if available
    try {
      const { runScheduledCollectors } = await import('../../connectors/scheduler');
      const results = await runScheduledCollectors();
      return results.evidenceCollected || 0;
    } catch {
      console.warn('[Autopilot] Connector SDK not available, skipping evidence collection');
      return 0;
    }
  }

  private static async runHealthCheck(clientId: number): Promise<{ atRiskControls: number }> {
    try {
      const { runComplianceHealthCheck } = await import('../../lib/compliance-monitor');
      return await runComplianceHealthCheck(clientId);
    } catch {
      console.warn('[Autopilot] Compliance monitor not available');
      return { atRiskControls: 0 };
    }
  }

  private static async detectGaps(clientId: number): Promise<number> {
    // Query evidence gaps directly from DB
    const db = await getDb();
    const clientControls = await import('../../schema').then(m => m.clientControls);
    const evidence = await import('../../schema').then(m => m.evidence);

    // Controls with evidence
    const controlsWithEvidence = await db.select({ controlId: evidence.clientControlId })
      .from(evidence)
      .where(eq(evidence.clientId, clientId))
      .groupBy(evidence.clientControlId);

    const controlIdsWithEvidence = new Set(controlsWithEvidence.map((c: any) => c.controlId));
    const allControls = await db.select().from(clientControls)
      .where(eq(clientControls.clientId, clientId));

    const gaps = allControls.filter((c: any) => 
      c.status !== 'not_applicable' && !controlIdsWithEvidence.has(c.id)
    );

    return gaps.length;
  }

  private static async createRemediationTasks(clientId: number, config: AutopilotConfig): Promise<number> {
    // Detect gaps first
    const gaps = await this.detectGaps(clientId);
    if (gaps === 0) return 0;

    const db = await getDb();
    const clientControls = await import('../../schema').then(m => m.clientControls);
    const controls = await db.select().from(clientControls)
      .where(and(
        eq(clientControls.clientId, clientId),
        eq(clientControls.status, 'not_implemented'),
      )).limit(20);

    let created = 0;
    for (const control of controls) {
      const actionStatus = config.approvalMode === 'auto' ? 'executed' : 'pending';
      await db.insert(autopilotActions).values({
        runId: 0, // Will be linked
        clientId,
        type: 'create_task' as const,
        title: `Implement control: ${control.clientControlId || control.id}`,
        description: `Autopilot detected that control needs implementation. Review and assign.`,
        priority: 'medium',
        status: actionStatus as 'pending' | 'executed',
        targetEntity: { type: 'control', id: control.id },
        metadata: { source: 'autopilot_gap_detection' },
      });
      created++;
    }
    return created;
  }

  private static async generateReport(clientId: number): Promise<boolean> {
    try {
      const { generateReport } = await import('../../lib/evidence-report-pipeline');
      await generateReport({
        clientId,
        title: `Autopilot Weekly Summary - ${new Date().toLocaleDateString()}`,
        sections: [{ id: 'auto', title: 'Autopilot Generated', evidenceIds: [], order: 0 }],
        includeExecutiveSummary: true,
        includeTableOfContents: false,
        includeAppendices: false,
      } as any);
      return true;
    } catch {
      console.warn('[Autopilot] Report generation not available');
      return false;
    }
  }

  private static async sendSummary(clientId: number, results: any): Promise<number> {
    try {
      const db = await getDb();
      const notificationLog = await import('../../schema').then(m => m.notificationLog);
      await db.insert(notificationLog).values({
        userId: 0, // System notification
        type: 'info' as const,
        channel: 'in_app' as const,
        title: `Autopilot Run Complete — ${new Date().toLocaleDateString()}`,
        message: `Collected ${results.evidenceCollected} evidence items. Found ${results.healthIssuesFound} health issues and ${results.gapsDetected} gaps. Created ${results.tasksCreated} tasks.`,
        relatedEntityType: 'autopilot',
        sentAt: new Date(),
      } as any);
      return 1;
    } catch {
      return 0;
    }
  }

  private static async executeAction(action: AutopilotAction): Promise<void> {
    // Execute the approved action based on its type
    console.log(`[Autopilot] Executing action: ${action.type} - ${action.title}`);
    // In production, this would create actual tasks/evidence/tickets
  }
}

/** Cron handler — runs autopilot for all enabled clients */
export async function runScheduledAutopilot(): Promise<{ clientId: number; status: string }[]> {
  const db = await getDb();
  const enabledConfigs = await db.select().from(autopilotConfigs)
    .where(eq(autopilotConfigs.enabled, true));

  const results: { clientId: number; status: string }[] = [];
  for (const config of enabledConfigs) {
    try {
      await AutopilotEngine.run(config.clientId);
      results.push({ clientId: config.clientId, status: 'completed' });
    } catch (error: any) {
      console.error(`[Autopilot] Failed for client ${config.clientId}:`, error);
      results.push({ clientId: config.clientId, status: 'failed' });
    }
  }
  return results;
}

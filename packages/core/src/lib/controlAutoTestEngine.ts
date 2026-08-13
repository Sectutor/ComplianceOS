import { getDb } from "../db";
import * as schema from "../schema";
import { controlTestRuns, complianceMonitorEvents } from "../schema_monitor";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

export interface ControlTestResult {
  clientControlId: number;
  clientId: number;
  controlCode?: string;
  controlName?: string;
  status: 'pass' | 'warning' | 'fail' | 'error';
  score: number; // 0 - 100
  message: string;
  findings: Array<{
    check: string;
    status: 'pass' | 'warning' | 'fail';
    detail: string;
  }>;
  executedAt: Date;
}

export interface ClientAutoTestSummary {
  clientId: number;
  totalControlsTested: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  overallPassRate: number; // Percentage 0 - 100
  averageScore: number;
  latestExecutionAt: string;
}

let tableEnsured = false;

async function ensureTableExists(db: any) {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS control_test_runs (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        client_control_id INTEGER NOT NULL,
        control_code VARCHAR(50),
        test_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        score INTEGER DEFAULT 100,
        message TEXT,
        findings JSONB,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ctr_client ON control_test_runs(client_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ctr_control ON control_test_runs(client_control_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ctr_status ON control_test_runs(client_id, status);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_monitor_events (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        control_id INTEGER,
        control_name VARCHAR(255),
        old_value TEXT,
        new_value TEXT,
        severity VARCHAR(50) DEFAULT 'info',
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cme_client ON compliance_monitor_events(client_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cme_severity ON compliance_monitor_events(severity, created_at);`);
    tableEnsured = true;
  } catch (err) {
    console.error("[ControlAutoTestEngine] Error ensuring control_test_runs table exists:", err);
  }
}

/**
 * Execute automated verification tests for a single client control.
 */
export async function runControlAutoTest(
  clientId: number,
  clientControlId: number
): Promise<ControlTestResult> {
  const db = await getDb();
  await ensureTableExists(db);
  const startTime = Date.now();


  try {
    // 1. Fetch client control and master control details
    const [clientCtrl] = await db
      .select({
        clientControl: schema.clientControls,
        masterControl: schema.controls,
      })
      .from(schema.clientControls)
      .innerJoin(
        schema.controls,
        eq(schema.clientControls.controlId, schema.controls.id)
      )
      .where(
        and(
          eq(schema.clientControls.id, clientControlId),
          eq(schema.clientControls.clientId, clientId)
        )
      );

    if (!clientCtrl) {
      return {
        clientControlId,
        clientId,
        status: 'error',
        score: 0,
        message: `Client control #${clientControlId} not found for client #${clientId}`,
        findings: [
          {
            check: 'Control Existence',
            status: 'fail',
            detail: 'Control entry missing in database',
          },
        ],
        executedAt: new Date(),
      };
    }

    const { clientControl, masterControl } = clientCtrl;
    const findings: ControlTestResult['findings'] = [];
    let testScore = 100;

    // --- CHECK 1: Owner Assignment ---
    const effectiveOwner = clientControl.owner || masterControl.owner;
    if (effectiveOwner && effectiveOwner.trim().length > 0) {
      findings.push({
        check: 'Owner Assignment',
        status: 'pass',
        detail: `Assigned owner: ${effectiveOwner}`,
      });
    } else {
      testScore -= 15;
      findings.push({
        check: 'Owner Assignment',
        status: 'warning',
        detail: 'No dedicated owner assigned to control',
      });
    }

    // --- CHECK 2: Implementation Status ---
    if (clientControl.status === 'implemented') {
      findings.push({
        check: 'Implementation Status',
        status: 'pass',
        detail: 'Control is marked as fully implemented',
      });
    } else if (clientControl.status === 'in_progress') {
      testScore -= 20;
      findings.push({
        check: 'Implementation Status',
        status: 'warning',
        detail: 'Control implementation is in progress',
      });
    } else {
      testScore -= 40;
      findings.push({
        check: 'Implementation Status',
        status: 'fail',
        detail: `Control status is currently '${clientControl.status || 'not_implemented'}'`,
      });
    }

    // --- CHECK 3: Evidence Availability & Validity ---
    const evidenceItems = await db
      .select()
      .from(schema.evidence)
      .where(
        and(
          eq(schema.evidence.clientId, clientId),
          eq(schema.evidence.clientControlId, clientControlId)
        )
      );

    const verifiedEvidence = evidenceItems.filter(
      (ev) => ev.status === 'verified'
    );
    const expiredEvidence = evidenceItems.filter(
      (ev) => ev.status === 'expired'
    );

    if (verifiedEvidence.length > 0) {
      findings.push({
        check: 'Evidence Verification',
        status: 'pass',
        detail: `Found ${verifiedEvidence.length} verified evidence item(s)`,
      });
    } else if (expiredEvidence.length > 0) {
      testScore -= 35;
      findings.push({
        check: 'Evidence Verification',
        status: 'fail',
        detail: `All ${expiredEvidence.length} evidence item(s) are EXPIRED`,
      });
    } else if (evidenceItems.length > 0) {
      testScore -= 20;
      findings.push({
        check: 'Evidence Verification',
        status: 'warning',
        detail: `Found ${evidenceItems.length} evidence item(s), but none are verified (statuses: ${evidenceItems.map((e) => e.status).join(', ')})`,
      });
    } else {
      testScore -= 45;
      findings.push({
        check: 'Evidence Verification',
        status: 'fail',
        detail: 'No evidence items attached to this control',
      });
    }

    // --- CHECK 4: Freshness Check ---
    const now = Date.now();
    const frequency = masterControl.frequency || 'Annual';
    const maxDaysMap: Record<string, number> = {
      Daily: 2,
      Weekly: 10,
      Monthly: 35,
      Quarterly: 100,
      Annual: 370,
      "Bi-Annual": 190,
    };
    const maxDays = maxDaysMap[frequency] || 370;

    if (verifiedEvidence.length > 0) {
      const mostRecentDate = verifiedEvidence.reduce((latest, ev) => {
        const evDate = ev.lastVerified
          ? new Date(ev.lastVerified).getTime()
          : ev.updatedAt
          ? new Date(ev.updatedAt).getTime()
          : 0;
        return Math.max(latest, evDate);
      }, 0);

      const daysOld = Math.floor((now - mostRecentDate) / (1000 * 60 * 60 * 24));
      if (daysOld <= maxDays) {
        findings.push({
          check: 'Evidence Freshness',
          status: 'pass',
          detail: `Evidence verified ${daysOld} days ago (frequency requirement: ${frequency})`,
        });
      } else {
        testScore -= 20;
        findings.push({
          check: 'Evidence Freshness',
          status: 'warning',
          detail: `Evidence is ${daysOld} days old, exceeding ${frequency} frequency threshold (${maxDays}d)`,
        });
      }
    }

    // Clamp score 0 - 100
    const finalScore = Math.max(0, Math.min(100, testScore));
    let overallStatus: ControlTestResult['status'] = 'pass';
    if (finalScore < 50 || findings.some((f) => f.status === 'fail')) {
      overallStatus = 'fail';
    } else if (finalScore < 85 || findings.some((f) => f.status === 'warning')) {
      overallStatus = 'warning';
    }

    const summaryMessage =
      overallStatus === 'pass'
        ? `Control passed all automated verification checks (Score: ${finalScore}/100)`
        : overallStatus === 'warning'
        ? `Control requires attention (Score: ${finalScore}/100)`
        : `Control failed auto-testing checks (Score: ${finalScore}/100)`;

    const executedAt = new Date();

    // 2. Persist test execution log
    await db.insert(controlTestRuns).values({
      clientId,
      clientControlId,
      controlCode: masterControl.controlId,
      testType: 'AUTOMATED_RULE_ENGINE',
      status: overallStatus,
      score: finalScore,
      message: summaryMessage,
      findings,
      executedAt,
    });

    // 3. If test failed or yielded warning, record monitor event
    if (overallStatus === 'fail') {
      await db.insert(complianceMonitorEvents).values({
        clientId,
        eventType: 'control_auto_test_failed',
        controlId: clientControlId,
        controlName: masterControl.name,
        oldValue: 'healthy',
        newValue: 'failed',
        severity: 'critical',
        details: {
          controlCode: masterControl.controlId,
          score: finalScore,
          findings,
        },
      });
    }

    return {
      clientControlId,
      clientId,
      controlCode: masterControl.controlId,
      controlName: masterControl.name,
      status: overallStatus,
      score: finalScore,
      message: summaryMessage,
      findings,
      executedAt,
    };
  } catch (err: any) {
    console.error(
      `[ControlAutoTestEngine] Error testing control #${clientControlId}:`,
      err
    );
    return {
      clientControlId,
      clientId,
      status: 'error',
      score: 0,
      message: `Execution error: ${err.message}`,
      findings: [
        {
          check: 'Engine Execution',
          status: 'fail',
          detail: err.message,
        },
      ],
      executedAt: new Date(),
    };
  }
}

/**
 * Execute automated verification tests for all controls belonging to a client.
 */
export async function runAllControlAutoTestsForClient(
  clientId: number
): Promise<{
  summary: ClientAutoTestSummary;
  results: ControlTestResult[];
}> {
  const db = await getDb();
  const clientCtrls = await db
    .select()
    .from(schema.clientControls)
    .where(eq(schema.clientControls.clientId, clientId));

  const results: ControlTestResult[] = [];
  let passedCount = 0;
  let warningCount = 0;
  let failedCount = 0;
  let totalScoreSum = 0;

  for (const ctrl of clientCtrls) {
    const res = await runControlAutoTest(clientId, ctrl.id);
    results.push(res);
    totalScoreSum += res.score;

    if (res.status === 'pass') passedCount++;
    else if (res.status === 'warning') warningCount++;
    else if (res.status === 'fail' || res.status === 'error') failedCount++;
  }

  const totalTested = results.length;
  const overallPassRate =
    totalTested > 0 ? Math.round((passedCount / totalTested) * 100) : 100;
  const averageScore =
    totalTested > 0 ? Math.round(totalScoreSum / totalTested) : 100;

  const summary: ClientAutoTestSummary = {
    clientId,
    totalControlsTested: totalTested,
    passedCount,
    warningCount,
    failedCount,
    overallPassRate,
    averageScore,
    latestExecutionAt: new Date().toISOString(),
  };

  return { summary, results };
}

/**
 * Get recent control test run history for a client.
 */
export async function getClientTestRunHistory(
  clientId: number,
  limit = 50
) {
  const db = await getDb();
  await ensureTableExists(db);
  return db
    .select()
    .from(controlTestRuns)
    .where(eq(controlTestRuns.clientId, clientId))
    .orderBy(desc(controlTestRuns.executedAt))
    .limit(limit);
}

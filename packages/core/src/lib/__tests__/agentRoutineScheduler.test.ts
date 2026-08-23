import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * AgentRoutineScheduler (lib/agent/agentRoutineScheduler.ts) — unit tests
 * (QA cycle 33).
 *
 * Hermetic per the teammatesRouter.test.ts rules: PostgreSQL is never touched
 * (getDb forced to throw at the module boundary unless a test injects an
 * in-memory fake) and the memory-cortex boundary is mocked:
 *   - ../../db                  → getDb (throws by default; fakes per test)
 *   - ../memory/vfsMemoryEngine → writeNode (finish() persistence)
 *
 * The scheduler does NOT call the tool dispatcher or the LLM service, so no
 * mocks are needed at those boundaries. The engine is imported REAL.
 *
 * Fake timers freeze Date so log timestamps and sweep windows (SLA overdue,
 * NIS2 24h clocks, >7d sync staleness) are deterministic; real timers are
 * restored in afterEach.
 *
 * Contract under test (RoutineExecutionResult):
 *   { routineId, routineName, botId, botName, success, summary, logs }
 *   - every summary is derived from the queried rows — empty registers yield
 *     honest "nothing here" outcomes, never fabricated passes
 *   - unknown routineId → success:false "Unregistered Routine" via Hermes
 *   - getDb failure → success:false failed result, never a throw
 */

vi.setConfig({ testTimeout: 60_000 });

vi.mock('../../db', () => ({
  getDb: vi.fn(async () => {
    throw new Error('No database configured in unit tests');
  }),
}));

vi.mock('../memory/vfsMemoryEngine', () => ({
  vfsMemoryEngine: { writeNode: vi.fn(async () => {}) },
}));

import { getDb } from '../../db';
import { vfsMemoryEngine } from '../memory/vfsMemoryEngine';
import {
  AgentRoutineScheduler,
  agentRoutineScheduler,
} from '../agent/agentRoutineScheduler';
import type { RoutineExecutionResult } from '../agent/agentRoutineScheduler';
import {
  vendors,
  vulnerabilities,
  employees,
  accessReviewCampaigns,
  accessReviewAssignments,
  incidents,
  clientPolicies,
  riskScenarios,
  cloudConnections,
} from '../../schema';

const getDbMock = vi.mocked(getDb);
const writeNodeMock = vi.mocked(vfsMemoryEngine.writeNode);

/** Frozen instant — every relative clock in the seeds derives from this. */
const FIXED_NOW = new Date('2026-03-15T12:00:00.000Z');
const HOUR = 3600e3;
const DAY = 86400e3;

type TableRows = Partial<
  Record<
    | 'vendors'
    | 'vulnerabilities'
    | 'employees'
    | 'accessReviewCampaigns'
    | 'accessReviewAssignments'
    | 'incidents'
    | 'clientPolicies'
    | 'riskScenarios'
    | 'cloudConnections',
    any[]
  >
>;

/**
 * Minimal drizzle-shaped fake keyed by table object identity:
 * `db.select().from(table).where(...)` → seeded rows for that table.
 * `from(...)` results are also directly awaitable without .where()
 * (cloudDriftRoutine does exactly that).
 */
function dbWith(seed: TableRows) {
  const registry: Record<keyof TableRows, unknown> = {
    vendors,
    vulnerabilities,
    employees,
    accessReviewCampaigns,
    accessReviewAssignments,
    incidents,
    clientPolicies,
    riskScenarios,
    cloudConnections,
  };
  const map = new Map<unknown, any[]>(
    (Object.keys(registry) as Array<keyof TableRows>).map((k) => [
      registry[k],
      seed[k] ?? [],
    ]),
  );
  return {
    select: () => ({
      from: (table: unknown) => {
        const rows = map.get(table) ?? [];
        return {
          where: () => Promise.resolve(rows),
          then: (
            onFulfilled?: (value: any[]) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) => Promise.resolve(rows).then(onFulfilled, onRejected),
        };
      },
    }),
  } as any;
}

function useDb(seed: TableRows) {
  // mockImplementation (not ...Once): rt_aws_drift resolves getDb twice.
  getDbMock.mockImplementation(async () => dbWith(seed));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  getDbMock.mockClear();
  getDbMock.mockImplementation(async () => {
    throw new Error('No database configured in unit tests');
  });
  writeNodeMock.mockClear();
  writeNodeMock.mockImplementation(async () => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Alex — TPRM ──────────────────────────────────────────────────────────────

describe('AgentRoutineScheduler — TPRM vendor sweep', () => {
  it('rt_tprm_sweep reports register composition and findings field-by-field', async () => {
    useDb({
      vendors: [
        { clientId: 7, name: 'Acme Cloud', criticality: 'High', reviewStatus: 'approved', isSubprocessor: true, transferMechanism: null, status: 'Active' },
        { clientId: 7, name: 'Beta Analytics', criticality: 'Low', reviewStatus: 'needs_review', isSubprocessor: false, transferMechanism: 'SCCs', status: 'Active' },
        { clientId: 7, name: 'Gamma Storage', criticality: 'Medium', reviewStatus: 'approved', isSubprocessor: false, transferMechanism: null, status: 'Offboarding' },
      ],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_tprm_sweep', 7);

    expect(result.routineId).toBe('rt_tprm_sweep');
    expect(result.routineName).toBe('Automated TPRM Trust Center Sweep');
    expect(result.botId).toBe('alex_tprm');
    expect(result.botName).toBe('Alex');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('TPRM sweep of 3 vendor(s)');
    expect(result.summary).toContain('1 rated High criticality');
    expect(result.summary).toContain('1 subprocessor(s)');
    expect(result.summary).toContain('⚠️ Findings:');
    expect(result.summary).toContain('1 subprocessor(s) missing a documented transfer mechanism (Acme Cloud)');
    expect(result.summary).toContain('1 vendor(s) still flagged needs_review');
    expect(result.summary).toContain('mid-offboarding');
    // Honest provenance logging, in order:
    expect(result.logs.map((l) => l.level)).toEqual(['info', 'action', 'info', 'info']);
    expect(result.logs[0].message).toContain('Starting data-backed sweep rt_tprm_sweep for client #7');
    expect(result.logs[1].message).toBe('Queried vendor register for client #7');
    expect(result.logs[2].message).toContain('3 vendors: 1 High criticality, 1 subprocessors, 1 awaiting review');
    expect(result.logs[3].message).toContain('Summary derived from live database queries');

    // Memory cortex received the derived findings, not invented ones.
    expect(writeNodeMock).toHaveBeenCalledTimes(1);
    const [clientId, node] = writeNodeMock.mock.calls[0] as [number, any];
    expect(clientId).toBe(7);
    expect(node.metadata).toMatchObject({ bot: 'Alex', routineId: 'rt_tprm_sweep', status: 'findings' });
    expect(node.contentL2).toContain('## Open findings');
    expect(node.contentL2).toContain('missing a documented transfer mechanism');
  });

  it('rt_tprm_sweep refuses to pass an empty register — it reports the gap instead', async () => {
    useDb({ vendors: [] });

    const result = await new AgentRoutineScheduler().executeRoutine('routine_tpm_daily', 4);

    expect(result.success).toBe(true); // sweep ran fine…
    expect(result.summary).toContain('vendor register is EMPTY for client #4');
    expect(result.summary).toContain('No third-party risk can be assessed from zero vendors');
    expect((writeNodeMock.mock.calls[0][1] as any).metadata.status).toBe('clean');
  });
});

// ── Sasha — vulnerability SLA ────────────────────────────────────────────────

describe('AgentRoutineScheduler — vulnerability SLA sweep', () => {
  it('rt_cve_sweep flags open items past their remediation SLA with named evidence', async () => {
    useDb({
      vulnerabilities: [
        { id: 1, cveId: 'CVE-2026-0001', name: 'nginx RCE', clientId: 1, status: 'open', severity: 'Critical', dueDate: new Date(FIXED_NOW.getTime() - 48 * HOUR).toISOString() },
        { id: 2, cveId: 'CVE-2026-0002', name: 'libzip DoS', clientId: 1, status: 'open', severity: 'High', dueDate: new Date(FIXED_NOW.getTime() + 7 * DAY).toISOString() },
        { id: 3, cveId: 'CVE-2025-9999', name: 'old tomcat', clientId: 1, status: 'remediated', severity: 'Critical', dueDate: new Date(FIXED_NOW.getTime() - 90 * DAY).toISOString() },
      ],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_cve_sweep');

    expect(result.botId).toBe('sasha_appsec');
    expect(result.botName).toBe('Sasha');
    expect(result.routineName).toBe('Vulnerability SLA & Patch Sweep');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('2 open of 3 registered');
    expect(result.summary).toContain('(Critical: 1, High: 1)');
    expect(result.summary).toContain('PAST remediation SLA');
    expect(result.summary).toContain('nginx RCE');
    expect(result.logs.some((l) => l.message.includes('3 total / 2 open (C:1 H:1); 1 past SLA'))).toBe(true);
  });

  it('rt_cve_sweep on an empty register says zero rows is not zero risk', async () => {
    useDb({ vulnerabilities: [] });

    const result = await new AgentRoutineScheduler().executeRoutine('routine_sasha_sweep');

    expect(result.success).toBe(true);
    expect(result.summary).toContain('vulnerability register is EMPTY for client #1');
    expect(result.summary).toContain('Zero rows is not zero risk');
  });
});

// ── Riley — UAR ──────────────────────────────────────────────────────────────

describe('AgentRoutineScheduler — UAR monitor', () => {
  it('rt_uar_monitor demands a campaign when personnel exist but none was ever created', async () => {
    useDb({
      employees: [{}, {}, {}, {}],
      accessReviewCampaigns: [],
      accessReviewAssignments: [],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_uar_monitor');

    expect(result.botId).toBe('riley_evidence');
    expect(result.botName).toBe('Riley');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('4 personnel on record but ZERO access review campaigns exist');
    expect(result.summary).toContain('create a campaign to start the clock');
    const node = writeNodeMock.mock.calls[0][1] as any;
    expect(node.metadata.status).toBe('findings');
    expect(node.contentL2).toContain('- No access review campaigns configured');
  });

  it('rt_uar_monitor summarizes live campaign/assignment state including overdue work', async () => {
    useDb({
      employees: [{ clientId: 1 }],
      accessReviewCampaigns: [{ id: 'c1', clientId: 1, status: 'active', completedAt: null }],
      accessReviewAssignments: [
        { campaignId: 'c1', status: 'pending' },
        { campaignId: 'c1', status: 'pending' },
        { campaignId: 'c1', status: 'overdue' },
        { campaignId: 'c1', status: 'certified' },
      ],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_uar_monitor');

    expect(result.summary).toContain('1 campaign(s) on file (1 active)');
    expect(result.summary).toContain('4 assignments (2 pending, 1 overdue)');
    expect(result.summary).toContain('⚠️ 1 review assignment(s) overdue');
  });

  it('rt_uar_monitor flags a stale completed program when nothing is currently running', async () => {
    useDb({
      employees: [],
      accessReviewCampaigns: [
        { id: 'c9', clientId: 1, status: 'completed', completedAt: new Date(FIXED_NOW.getTime() - 100 * DAY).toISOString() },
      ],
      accessReviewAssignments: [],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_uar_monitor');

    expect(result.summary).toContain('Last completed campaign is >90 days old and nothing is currently running');
  });
});

// ── Nova — regulatory watchdog ───────────────────────────────────────────────

describe('AgentRoutineScheduler — NIS2/DORA watchdog', () => {
  it('breaches the 24h early-warning clock for significant incidents nobody reported', async () => {
    useDb({
      incidents: [
        {
          clientId: 1,
          title: 'Ransomware on file server',
          isSignificant: true,
          detectedAt: new Date(FIXED_NOW.getTime() - 48 * HOUR).toISOString(),
          earlyWarningSentAt: null,
          finalReportSentAt: null,
        },
      ],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_nova_watchdog');

    expect(result.botId).toBe('nova_incident');
    expect(result.botName).toBe('Nova');
    expect(result.routineName).toBe('NIS2 & DORA Regulatory Incident Watchdog');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('Watchdog over 1 incident(s), 1 significant');
    expect(result.summary).toContain('🚨 1 early-warning clock(s) BREACHED');
    expect(result.summary).toContain('immediate CSIRT escalation needed');
  });

  it('an empty incident register states the fact and disclaims breach likelihood', async () => {
    useDb({ incidents: [] });

    const result = await new AgentRoutineScheduler().executeRoutine('routine_nova_watchdog');

    expect(result.summary).toContain('incident register is empty');
    expect(result.summary).toContain('reports register state, not breach likelihood');
  });
});

// ── Tara — policy lifecycle ──────────────────────────────────────────────────

describe('AgentRoutineScheduler — policy lifecycle audit', () => {
  it('treats a zero-policy register as a hard gap, not a pass', async () => {
    useDb({ clientPolicies: [] });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_policy_audit');

    expect(result.botId).toBe('tara_governance');
    expect(result.botName).toBe('Tara');
    expect(result.summary).toContain('NO policies exist for client #1');
    expect(result.summary).toContain('hard gap, not a pass');
  });

  it('surfaces approval debt and overdue review dates with policy names', async () => {
    useDb({
      clientPolicies: [
        { clientId: 1, name: 'Access Control Policy', approvalStatus: 'approved', nextReviewDate: new Date(FIXED_NOW.getTime() - 30 * DAY).toISOString() },
        { clientId: 1, name: 'Draft Remote Work Policy', approvalStatus: 'draft', nextReviewDate: new Date(FIXED_NOW.getTime() + 60 * DAY).toISOString() },
        { clientId: 1, name: 'Draft AI Use Policy', approvalStatus: 'in_review', nextReviewDate: null },
      ],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_policy_audit');

    expect(result.summary).toContain('3 policy/policies on register, 1 approved');
    expect(result.summary).toContain('2 policy/policies not yet approved');
    expect(result.summary).toContain('1 policy/policies past review date (Access Control Policy)');
  });
});

// ── Marcus — FAIR risk ───────────────────────────────────────────────────────

describe('AgentRoutineScheduler — FAIR quantitative risk sweep', () => {
  it('ranks the top exposure and flags unscored scenarios honestly', async () => {
    useDb({
      riskScenarios: [
        { clientId: 1, title: 'Vendor data leak', inherentScore: 22 },
        { clientId: 1, title: 'Phishing compromise', inherentScore: 8 },
        { clientId: 1, title: 'Untyped emerging risk', inherentScore: null },
      ],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_fair_risk_monitor');

    expect(result.botId).toBe('marcus_risk');
    expect(result.botName).toBe('Marcus');
    expect(result.routineName).toBe('FAIR Quantitative Risk Re-evaluation');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('3 scenario(s), 2 scored');
    expect(result.summary).toContain('1 at High band (≥15/25)');
    expect(result.summary).toContain('. Top exposure: "Vendor data leak" at 22/25.');
    expect(result.summary).toContain('1 scenario(s) have no inherent score — cannot be quantified');
  });

  it('reports an empty risk register as empty rather than inventing an ALE', async () => {
    useDb({ riskScenarios: [] });

    const result = await new AgentRoutineScheduler().executeRoutine('routine_marcus_heat');

    expect(result.success).toBe(true);
    expect(result.summary).toContain('risk register is EMPTY');
    expect(result.summary.toLowerCase()).not.toContain('$'); // no fabricated dollars
  });
});

// ── Morgan — cloud drift ─────────────────────────────────────────────────────

describe('AgentRoutineScheduler — cloud drift scan', () => {
  it('admits no drift can be measured when no cloud account is connected', async () => {
    useDb({ cloudConnections: [] });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_aws_drift', 2);

    expect(result.botId).toBe('morgan_iac');
    expect(result.botName).toBe('Morgan');
    expect(result.routineName).toBe('Continuous Cloud Drift Scan');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('no cloud account connected for client #2');
    expect(result.summary).toContain("isn't linked");
    expect(getDbMock).toHaveBeenCalledTimes(2); // executeRoutine + cloudDriftRoutine both resolve getDb
  });

  it('reports erroring, stale, and never-synced connections with counts', async () => {
    useDb({
      cloudConnections: [
        { status: 'connected', lastSyncAt: new Date(FIXED_NOW.getTime() - 1 * HOUR).toISOString() },
        { status: 'error', lastSyncAt: new Date(FIXED_NOW.getTime() - 8 * DAY).toISOString() },
        { status: 'connected', lastSyncAt: null },
      ],
    });

    const result = await new AgentRoutineScheduler().executeRoutine('routine_aws_drift');

    expect(result.summary).toContain('3 connection(s) registered — 2 healthy');
    expect(result.summary).toContain(', 1 erroring');
    expect(result.summary).toContain(', 1 never synced');
    expect(result.summary).toContain('1 connection(s) in error state');
    expect(result.summary).toContain('1 connection(s) last synced >7 days ago');
    expect(result.summary).toContain('1 connection(s) have NEVER synced');
    expect(result.summary).toContain('Only 2/3 connections healthy');
  });
});

// ── Unknown / failing inputs ─────────────────────────────────────────────────

describe('AgentRoutineScheduler — unknown routines and failures', () => {
  it('unknown routineId yields an honest Unregistered Routine result listing the real catalog', async () => {
    useDb({});

    const result = await new AgentRoutineScheduler().executeRoutine('rt_does_not_exist');

    expect(result.success).toBe(false);
    expect(result.routineId).toBe('rt_does_not_exist');
    expect(result.routineName).toBe('Unregistered Routine');
    expect(result.botId).toBe('hermes_orchestrator');
    expect(result.botName).toBe('Hermes');
    for (const registered of [
      'rt_tprm_sweep',
      'rt_cve_sweep',
      'rt_aws_drift',
      'rt_uar_monitor',
      'rt_nova_watchdog',
      'rt_policy_audit',
      'rt_fair_risk_monitor',
    ]) {
      expect(result.summary).toContain(registered);
    }
    expect(result.logs.some((l) => l.message.includes("No data-backed routine registered for 'rt_does_not_exist'"))).toBe(true);
    expect(writeNodeMock).not.toHaveBeenCalled(); // nothing persisted for unknown sweeps
  });

  it('database unavailability degrades into a failed result — it never throws', async () => {
    // Default getDb mock throws; executeRoutine must catch and summarize.
    const result = await new AgentRoutineScheduler().executeRoutine('rt_tprm_sweep');

    expect(result).toMatchObject(<Partial<RoutineExecutionResult>>{
      routineId: 'rt_tprm_sweep',
      routineName: 'Automated Routine',
      botId: 'bot',
      botName: 'Bot',
      success: false,
      summary: 'Routine failed: No database configured in unit tests',
    });
    const lastLog = result.logs[result.logs.length - 1];
    expect(lastLog.level).toBe('error');
    expect(lastLog.message).toContain('No database configured in unit tests');
    expect(writeNodeMock).not.toHaveBeenCalled();
  });

  it('garbage inputs resolve with well-formed results instead of throwing', async () => {
    useDb({});
    const engine = new AgentRoutineScheduler();

    for (const badId of ['', '   ', '../../etc/passwd', 'rt_TPRM_SWEEP' /* wrong case */]) {
      const result = await engine.executeRoutine(badId as any);
      expect(result.routineName).toBe('Unregistered Routine');
      expect(typeof result.summary).toBe('string');
    }

    // NaN / string clientIds ride through the fake registers without crashing.
    const nanResult = await engine.executeRoutine('rt_tprm_sweep', Number.NaN);
    expect(nanResult.success).toBe(true);
    expect(nanResult.logs[0].message).toContain('for client #NaN');
    const strResult = await engine.executeRoutine('rt_tprm_sweep', '7' as any);
    expect(strResult.success).toBe(true);
    // String clientId reaches the fake registers, which hold no vendors →
    // honest empty-register summary rather than a crash or a fabricated pass.
    expect(strResult.summary).toContain('vendor register is EMPTY for client #7');
  });
});

// ── Defaults, determinism & duplicate side effects ───────────────────────────

describe('AgentRoutineScheduler — defaults and determinism', () => {
  it('defaults to client #1 when clientId is omitted', async () => {
    useDb({ vendors: [] });

    const result = await new AgentRoutineScheduler().executeRoutine('rt_tprm_sweep');

    expect(result.logs[0].message).toBe('Starting data-backed sweep rt_tprm_sweep for client #1...');
    expect(writeNodeMock.mock.calls[0][0]).toBe(1);
  });

  it('same input twice produces identical results and does not double-persist within one run', async () => {
    useDb({
      riskScenarios: [{ clientId: 1, title: 'Vendor data leak', inherentScore: 22 }],
    });
    const engine = new AgentRoutineScheduler();

    const first = await engine.executeRoutine('rt_fair_risk_monitor', 1);
    const second = await engine.executeRoutine('rt_fair_risk_monitor', 1);

    // Frozen clock ⇒ timestamps match too, so results compare fully equal.
    expect(second).toEqual(first);
    expect(first.summary).toBe(second.summary);
    expect(first.logs).toEqual(second.logs);
    // One memory write per execution — exactly two after two runs, one per run before this point:
    expect(writeNodeMock).toHaveBeenCalledTimes(2);
  });

  it('repeated unknown-routine executions stay free of duplicate side effects', async () => {
    useDb({});
    const engine = new AgentRoutineScheduler();

    await engine.executeRoutine('rt_ghost');
    await engine.executeRoutine('rt_ghost');
    await engine.executeRoutine('rt_ghost');

    expect(getDbMock).toHaveBeenCalledTimes(3); // probed each time…
    expect(writeNodeMock).not.toHaveBeenCalled(); // …but persisted nothing
  });
});

// ── Export surface ───────────────────────────────────────────────────────────

describe('AgentRoutineScheduler — exports', () => {
  it('exposes the singleton instance of the documented class', () => {
    expect(agentRoutineScheduler).toBeInstanceOf(AgentRoutineScheduler);
  });
});

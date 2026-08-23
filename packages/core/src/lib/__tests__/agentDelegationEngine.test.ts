import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * AgentDelegationEngine (lib/agent/agentDelegationEngine.ts) — unit tests
 * (QA cycle 33).
 *
 * Mirrors teammatesRouter.test.ts hermeticity rules: PostgreSQL is never
 * touched (getDb is forced to throw at the module boundary unless a test
 * injects an in-memory fake), and every side-effect boundary the engine
 * reaches is mocked:
 *   - ../../db                      → getDb (throws by default; fakes per test)
 *   - ../llm/service                → llmService.generate (dynamic import inside
 *                                     the engine resolves to this mock)
 *   - ../agent/agentChatStorage     → saveMessage (war-room persistence)
 *   - ../memory/vfsMemoryEngine     → writeNode (memory-cortex record)
 *
 * The engine itself is imported REAL — only its boundaries are doubled.
 * Fake timers freeze Date so message ids, digests, and memory paths are
 * deterministic; real timers are restored in afterEach.
 *
 * Contract under test:
 *   - critical/high/medium severities cascade; anything else is ignored
 *   - Hermes dispatch + one reply per available specialist land in war_room
 *   - no LLM provider → honest system fallback carrying the REAL context
 *   - DB unavailability / malformed input must never fabricate messages
 */

vi.setConfig({ testTimeout: 60_000 });

vi.mock('../../db', () => ({
  getDb: vi.fn(async () => {
    throw new Error('No database configured in unit tests');
  }),
}));

vi.mock('../llm/service', () => ({
  llmService: { generate: vi.fn() },
}));

vi.mock('../agent/agentChatStorage', () => ({
  agentChatStorage: { saveMessage: vi.fn(async () => {}) },
  ChatMessage: {},
}));

vi.mock('../memory/vfsMemoryEngine', () => ({
  vfsMemoryEngine: { writeNode: vi.fn(async () => {}) },
}));

import { getDb } from '../../db';
import { llmService } from '../llm/service';
import { agentChatStorage } from '../agent/agentChatStorage';
import { vfsMemoryEngine } from '../memory/vfsMemoryEngine';
import {
  AgentDelegationEngine,
  agentDelegationEngine,
} from '../agent/agentDelegationEngine';
import type { DelegationTriggerEvent } from '../agent/agentDelegationEngine';
import { vendors, riskScenarios, clientPolicies, evidence } from '../../schema';

const getDbMock = vi.mocked(getDb);
const llmGenerate = vi.mocked(llmService.generate);
const saveMessageMock = vi.mocked(agentChatStorage.saveMessage);
const writeNodeMock = vi.mocked(vfsMemoryEngine.writeNode);

/** Frozen instant — every timestamp/id below derives from this. */
const FIXED_NOW = new Date('2026-03-15T12:00:00.000Z');

type TableRows = Partial<Record<'vendors' | 'riskScenarios' | 'clientPolicies' | 'evidence', any[]>>;

/**
 * Minimal drizzle-shaped fake: `db.select().from(table).where(...)` resolves
 * to the seeded rows for that table object identity. `from(...)` results are
 * also directly awaitable (the engine awaits some queries without .where).
 */
function dbWith(seed: TableRows) {
  const map = new Map<unknown, any[]>([
    [vendors, seed.vendors ?? []],
    [riskScenarios, seed.riskScenarios ?? []],
    [clientPolicies, seed.clientPolicies ?? []],
    [evidence, seed.evidence ?? []],
  ]);
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
  getDbMock.mockImplementation(async () => dbWith(seed));
}

function triggerEvent(overrides: Partial<DelegationTriggerEvent> = {}): DelegationTriggerEvent {
  return {
    clientId: 1,
    triggerType: 'risk_created',
    title: 'Vendor SOC2 report overdue',
    severity: 'high',
    details: 'Trust portal stopped responding to evidence requests.',
    sourceBotId: 'alex_tprm',
    sourceBotName: 'Alex',
    relatedFrameworks: ['SOC 2'],
    ...overrides,
  } as DelegationTriggerEvent;
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
  saveMessageMock.mockClear();
  saveMessageMock.mockImplementation(async () => undefined);
  writeNodeMock.mockClear();
  writeNodeMock.mockImplementation(async () => undefined);
  llmGenerate.mockClear();
  // Honest default: no provider configured → engine must fall back, not fake.
  llmGenerate.mockRejectedValue(new Error('No LLM provider configured'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Happy path ───────────────────────────────────────────────────────────────

describe('AgentDelegationEngine — full cascade (LLM available)', () => {
  it('posts a Hermes dispatch followed by exactly three specialist replies for a high-severity event', async () => {
    useDb({
      vendors: [{ clientId: 1, name: 'Acme Cloud', criticality: 'High' }],
      riskScenarios: [{ title: 'Ransomware exposure', inherentScore: 16 }],
      clientPolicies: [{}, {}],
      evidence: [{}, {}, {}],
    });
    llmGenerate
      .mockResolvedValueOnce({ text: 'morgan proposal staged for approval' } as any)
      .mockResolvedValueOnce({ text: 'riley evidence plan' } as any)
      .mockResolvedValueOnce({ text: 'tara coverage assessment' } as any);

    await expect(
      new AgentDelegationEngine().handleTriggerEvent(triggerEvent()),
    ).resolves.toBeUndefined();

    expect(saveMessageMock).toHaveBeenCalledTimes(4);
    const saved = saveMessageMock.mock.calls.map((c) => c[1] as any);

    const dispatch = saved[0];
    expect(dispatch.id).toMatch(/^msg_hermes_delegation_\d+$/);
    expect(dispatch.channelId).toBe('war_room');
    expect(dispatch.senderId).toBe('hermes_orchestrator');
    expect(dispatch.senderName).toBe('Hermes');
    expect(dispatch.senderRole).toBe('Chief Compliance Orchestrator');
    expect(dispatch.timestamp).toBe('Just now');
    expect(dispatch.mentions).toEqual(['morgan_iac', 'riley_evidence', 'tara_governance']);
    expect(dispatch.delegatedTo).toBe('morgan_iac');
    expect(dispatch.content).toContain('Multi-agent delegation triggered by Alex');
    expect(dispatch.content).toContain('risk_created — "Vendor SOC2 report overdue" (HIGH)');
    expect(dispatch.content).toContain('@Morgan');
    expect(dispatch.content).toContain('@Riley');
    expect(dispatch.content).toContain('@Tara');

    expect(saved[1]).toMatchObject({
      channelId: 'war_room',
      senderId: 'morgan_iac',
      senderName: 'Morgan',
      content: 'morgan proposal staged for approval',
    });
    expect(saved[2]).toMatchObject({ senderId: 'riley_evidence', senderName: 'Riley', content: 'riley evidence plan' });
    expect(saved[3]).toMatchObject({ senderId: 'tara_governance', senderName: 'Tara', content: 'tara coverage assessment' });
  });

  it('dispatch digest quotes the live register counts gathered via getDb', async () => {
    useDb({
      vendors: [
        { clientId: 1, name: 'Acme Cloud', criticality: 'High' },
        { clientId: 1, name: 'Beta LP', criticality: 'Low' },
      ],
      riskScenarios: [{ title: 'Data breach', inherentScore: 20 }],
      clientPolicies: [{}, {}, {}],
      evidence: [{}, {}, {}, {}, {}],
    });
    llmGenerate.mockResolvedValue({ text: 'ok' } as any);

    await new AgentDelegationEngine().handleTriggerEvent(triggerEvent());

    const dispatch = saveMessageMock.mock.calls[0][1] as any;
    expect(dispatch.content).toContain('(2 vendors, 1 high-scored risks, 3 policies, 5 evidence records)');
    expect(getDbMock).toHaveBeenCalledTimes(1);
  });

  it('hands each specialist its own instruction plus the shared context digest', async () => {
    useDb({});
    llmGenerate.mockResolvedValue({ text: 'ack' } as any);

    await new AgentDelegationEngine().handleTriggerEvent(
      triggerEvent({ triggerType: 'cve_detected', title: 'CVE-2026-1337', relatedFrameworks: ['SOC 2', 'ISO 27001'] }),
    );

    expect(llmGenerate).toHaveBeenCalledTimes(3);
    expect(llmGenerate.mock.calls.map((c) => (c[0] as any).feature)).toEqual([
      'risk_analysis',
      'risk_analysis',
      'risk_analysis',
    ]);
    const meta = llmGenerate.mock.calls[0][1] as any;
    expect(meta).toEqual({ endpoint: 'agent_delegation', clientId: 1 });

    const prompts = llmGenerate.mock.calls.map((c) => (c[0] as any).systemPrompt as string);
    expect(prompts[0]).toContain('You are Morgan, cloud/IaC remediation specialist');
    expect(prompts[1]).toContain('You are Riley, evidence specialist');
    expect(prompts[2]).toContain('You are Tara, governance lead');
    for (const p of prompts) {
      expect(p).toContain('Client context:');
      expect(p).toContain('cve_detected — "CVE-2026-1337"');
      expect(p).toContain('Related frameworks: SOC 2, ISO 27001');
    }
  });

  it('records a memory node describing what actually happened (3/3 replies)', async () => {
    useDb({});
    llmGenerate.mockResolvedValue({ text: 'reply text' } as any);

    await new AgentDelegationEngine().handleTriggerEvent(triggerEvent());

    expect(writeNodeMock).toHaveBeenCalledTimes(1);
    const [clientId, node] = writeNodeMock.mock.calls[0] as [number, any];
    expect(clientId).toBe(1);
    expect(node.nodeType).toBe('fact');
    expect(node.title).toBe('Delegation: Vendor SOC2 report overdue');
    expect(node.path).toMatch(/^\/facts\/delegation_\d+_vendor_soc2_report_overdue/);
    expect(node.contentL2).toContain('LLM-generated specialist responses posted (Morgan, Riley, Tara)');
    expect(node.summaryL0).toBe('Delegation for "Vendor SOC2 report overdue": 3/3 specialist responses generated.');
    expect(node.metadata).toMatchObject({
      severity: 'high',
      sourceBot: 'Alex',
      orchestrator: 'Hermes',
      specialistReplies: 3,
      llmAvailable: true,
    });
  });

  it('keeps every generated message id unique within one cascade run', async () => {
    useDb({});
    llmGenerate.mockResolvedValue({ text: 'reply' } as any);

    await new AgentDelegationEngine().handleTriggerEvent(triggerEvent());

    const ids = saveMessageMock.mock.calls.map((c) => (c[1] as any).id as string);
    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(4);
  });
});

// ── Severity gate ────────────────────────────────────────────────────────────

describe('AgentDelegationEngine — severity gate', () => {
  it('ignores low-severity events before any query or side effect', async () => {
    await expect(
      new AgentDelegationEngine().handleTriggerEvent(triggerEvent({ severity: 'low' })),
    ).resolves.toBeUndefined();

    expect(getDbMock).not.toHaveBeenCalled();
    expect(saveMessageMock).not.toHaveBeenCalled();
    expect(writeNodeMock).not.toHaveBeenCalled();
  });

  it('treats unknown or missing severities like low: silent no-op, never a throw', async () => {
    await new AgentDelegationEngine().handleTriggerEvent(
      triggerEvent({ severity: 'catastrophic' as any }),
    );
    const missingSeverity = triggerEvent();
    delete (missingSeverity as any).severity;
    await new AgentDelegationEngine().handleTriggerEvent(missingSeverity);

    expect(getDbMock).not.toHaveBeenCalled();
    expect(saveMessageMock).not.toHaveBeenCalled();
    expect(writeNodeMock).not.toHaveBeenCalled();
  });
});

// ── Honest fallback (no LLM) ─────────────────────────────────────────────────

describe('AgentDelegationEngine — LLM unavailable fallback', () => {
  it('posts dispatch + honest system notice instead of fabricated replies when generation fails', async () => {
    useDb({
      vendors: [{ clientId: 1, name: 'Acme Cloud', criticality: 'High' }],
      riskScenarios: [],
      clientPolicies: [],
      evidence: [],
    });

    await new AgentDelegationEngine().handleTriggerEvent(triggerEvent());

    expect(llmGenerate).toHaveBeenCalledTimes(1); // stops after first failure
    expect(saveMessageMock).toHaveBeenCalledTimes(2);
    const msg = saveMessageMock.mock.calls[1][1] as any;
    expect(msg.id).toMatch(/^msg_system_delegation_/);
    expect(msg.channelId).toBe('war_room');
    expect(msg.senderId).toBe('system');
    expect(msg.senderName).toBe('Delegation System');
    expect(msg.senderRole).toBe('Automation');
    expect(msg.content).toContain('Specialist replies unavailable: no LLM provider is configured');
    expect(msg.content).toContain('No specialist actions have been taken');
    // Real context, honestly reported:
    expect(msg.content).toContain('Trigger: risk_created — "Vendor SOC2 report overdue" (severity: high)');
    expect(msg.content).toContain('1 vendors (1 High criticality), 0 risks scored ≥12/25, 0 policies, 0 evidence records');
  });

  it('digest marks empty details as "(none supplied)" instead of printing undefined', async () => {
    useDb({});
    await new AgentDelegationEngine().handleTriggerEvent(triggerEvent({ details: '' }));

    const msg = saveMessageMock.mock.calls[1][1] as any;
    expect(msg.content).toContain('Details: (none supplied)');
  });

  it('memory record reports 0/3 specialists with llmAvailable=false on total LLM failure', async () => {
    useDb({});
    await new AgentDelegationEngine().handleTriggerEvent(triggerEvent());

    const node = writeNodeMock.mock.calls[0][1] as any;
    expect(node.metadata.specialistReplies).toBe(0);
    expect(node.metadata.llmAvailable).toBe(false);
    expect(node.contentL2).toContain('Honest fallback posted (no LLM provider)');
  });

  it('a first-specialist success followed by an LLM failure still posts the good reply without inventing the rest', async () => {
    useDb({});
    llmGenerate
      .mockResolvedValueOnce({ text: 'morgan got through' } as any)
      .mockRejectedValue(new Error('provider down'));

    await new AgentDelegationEngine().handleTriggerEvent(triggerEvent());

    const senders = saveMessageMock.mock.calls.map((c) => (c[1] as any).senderId);
    expect(senders).toEqual(['hermes_orchestrator', 'morgan_iac']);
    expect(senders).not.toContain('system'); // partial success ≠ fallback scenario
    const node = writeNodeMock.mock.calls[0][1] as any;
    expect(node.metadata.specialistReplies).toBe(1);
    expect(node.metadata.llmAvailable).toBe(false);
  });

  it('vfs memory failures are swallowed and never break the cascade', async () => {
    useDb({});
    writeNodeMock.mockRejectedValue(new Error('disk full'));

    await expect(
      new AgentDelegationEngine().handleTriggerEvent(triggerEvent()),
    ).resolves.toBeUndefined();

    expect(saveMessageMock).toHaveBeenCalledTimes(2); // dispatch + fallback still posted
  });
});

// ── Degradation & malformed input ────────────────────────────────────────────

describe('AgentDelegationEngine — degradation & malformed input', () => {
  it('database unavailability rejects honestly before anything is persisted (documented gap)', async () => {
    // Default getDb mock throws. gatherContext has no try/catch of its own, so
    // the rejection propagates to the caller — asserted here as ACTUAL behavior.
    await expect(
      new AgentDelegationEngine().handleTriggerEvent(triggerEvent()),
    ).rejects.toThrow('No database configured in unit tests');

    // Nothing was fabricated or persisted before the failure.
    expect(saveMessageMock).not.toHaveBeenCalled();
    expect(writeNodeMock).not.toHaveBeenCalled();
  });

  it('malformed payloads without a meaningful severity resolve silently with zero side effects', async () => {
    await expect(new AgentDelegationEngine().handleTriggerEvent({} as any)).resolves.toBeUndefined();

    await expect(
      new AgentDelegationEngine().handleTriggerEvent({
        clientId: 'abc' as any,
        title: 42 as any,
        severity: 'HIGH' as any, // wrong case → not in allowlist
        triggerType: 'nope' as any,
      }),
    ).resolves.toBeUndefined();

    expect(getDbMock).not.toHaveBeenCalled();
    expect(saveMessageMock).not.toHaveBeenCalled();
    expect(writeNodeMock).not.toHaveBeenCalled();
  });

  it('garbage field values on a cascading severity still complete against the fake registers', async () => {
    useDb({});
    await expect(
      new AgentDelegationEngine().handleTriggerEvent(
        triggerEvent({ title: undefined as any, details: undefined as any, relatedFrameworks: undefined }),
      ),
    ).resolves.toBeUndefined();

    expect(saveMessageMock).toHaveBeenCalledTimes(2); // dispatch + fallback; no crash
  });

  it('null trigger event rejects loudly instead of failing silently (documented gap)', async () => {
    await expect(
      new AgentDelegationEngine().handleTriggerEvent(null as any),
    ).rejects.toThrow();
    expect(saveMessageMock).not.toHaveBeenCalled();
  });
});

// ── Determinism & idempotence-ish behavior ───────────────────────────────────

describe('AgentDelegationEngine — determinism', () => {
  it('two identical triggers under a frozen clock produce byte-identical dispatches', async () => {
    useDb({});
    llmGenerate.mockResolvedValue({ text: 'stable reply' } as any);
    const engine = new AgentDelegationEngine();

    await engine.handleTriggerEvent(triggerEvent());
    const first = saveMessageMock.mock.calls[0][1] as any;
    saveMessageMock.mockClear();

    await engine.handleTriggerEvent(triggerEvent());
    const second = saveMessageMock.mock.calls[0][1] as any;

    expect(second.content).toBe(first.content);
    expect(second.mentions).toEqual(first.mentions);
    expect(second.senderId).toBe(first.senderId);
    // NOTE (documented, not fixed): ids derive from Date.now(), so two events
    // in the same millisecond collide — see QA report.
    expect(second.id).toBe(first.id);
  });

  it('repeated low-severity triggers accumulate zero duplicate side effects', async () => {
    const engine = new AgentDelegationEngine();
    for (let i = 0; i < 3; i++) {
      await engine.handleTriggerEvent(triggerEvent({ severity: 'low' }));
    }
    expect(saveMessageMock).not.toHaveBeenCalled();
    expect(writeNodeMock).not.toHaveBeenCalled();
    expect(getDbMock).not.toHaveBeenCalled();
  });
});

// ── Export surface ───────────────────────────────────────────────────────────

describe('AgentDelegationEngine — exports', () => {
  it('exposes the singleton instance of the documented class', () => {
    expect(agentDelegationEngine).toBeInstanceOf(AgentDelegationEngine);
  });
});

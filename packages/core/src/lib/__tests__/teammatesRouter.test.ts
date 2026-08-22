import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';

/**
 * Teammates router (server/routers/teammatesRouter.ts) — contract tests
 * (QA cycle 28).
 *
 * Mirrors incidentTimelineRouter.test.ts: the router is a factory
 * `createTeammatesRouter(t, procedure)` tested with a tiny fake tRPC builder —
 * no tRPC server, no DB. Handlers are invoked directly with `{ input, ctx }`.
 *
 * Contract under test — exactly these 15 procedures:
 *   queries   : listTeammates, getTeammate, listTasks, listApprovals,
 *               listRoutines, listMessages
 *   mutations : createTeammate, updateTeammate, deleteTeammate, createTask,
 *               resolveApproval, toggleRoutine, triggerRoutineNow, sendMessage,
 *               takeControlSandbox
 *
 * State lives in module-level in-memory arrays that PERSIST ACROSS TESTS in
 * this file, so every mutating test asserts RELATIVE changes (counts
 * before/after, presence of returned records) instead of absolute sizes, and
 * removes the records it creates where practical. Tests depend only on
 * procedure NAMES and input/output SHAPES.
 *
 * Error-behavior contract (as implemented today):
 *   - unknown ids on getTeammate/updateTeammate/deleteTeammate/
 *     resolveApproval/toggleRoutine/triggerRoutineNow/takeControlSandbox
 *     reject with TRPCError code NOT_FOUND (hardened in cycle 28).
 *
 * Async side-effects: createTask completes its task after ~4s and
 * triggerRoutineNow settles back to active after ~3s via setTimeout — those
 * tests run under fake timers and restore real ones afterwards.
 *
 * The live-LLM dependency (lib/llm/service) is mocked: direct-channel
 * sendMessage uses the completion text when generation succeeds and falls
 * back to the built-in expert-knowledge engine when it fails — never throws.
 */

// Generous per-file budget: module graph pulls the LLM service layer and the
// OneDrive-synced tree can be slow on cold cache under parallel load.
vi.setConfig({ testTimeout: 60_000 });

vi.mock('../../lib/llm/service', () => ({
  llmService: { generate: vi.fn() },
}));

import { createTeammatesRouter } from '../../server/routers/teammatesRouter';
import { llmService } from '../../lib/llm/service';

const llmGenerate = vi.mocked(llmService.generate);

/** The documented procedure surface — names only, no schema coupling. */
const EXPECTED_PROCEDURES = [
  'listTeammates',
  'getTeammate',
  'createTeammate',
  'updateTeammate',
  'deleteTeammate',
  'listTasks',
  'createTask',
  'listApprovals',
  'resolveApproval',
  'listRoutines',
  'toggleRoutine',
  'triggerRoutineNow',
  'listMessages',
  'sendMessage',
  'takeControlSandbox',
  'getGuardrailsStatus',
  'listProvenanceLedger',
  'getAuditCertificate',
  'executeToolAction',
];

/** Minimal fake tRPC builder: `.input().query/.mutation` resolving handlers. */
function buildRouter() {
  const procedure: any = {
    input: (_schema: unknown) => procedure,
    query: (handler: any) => ({ type: 'query', handler }),
    mutation: (handler: any) => ({ type: 'mutation', handler }),
  };
  const t: any = { router: (routes: any) => routes };
  return createTeammatesRouter(t, procedure);
}

/** Invoke a captured route handler the way tRPC would. */
function call(route: any, input?: unknown): Promise<any> {
  return route.handler({ input, ctx: {} });
}

async function expectNotFound(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(TRPCError);
  await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND' });
}

let suffixCounter = 0;
function uniq(): string {
  suffixCounter += 1;
  return `qa${Date.now().toString(36)}_${suffixCounter}`;
}

function teammatePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: `QA Bot ${uniq()}`,
    role: 'QA Contract Tester',
    avatar: '🧪',
    description: 'Created by teammatesRouter contract tests',
    sandboxType: 'cli',
    model: 'test-model',
    capabilities: ['contract-testing'],
    ...overrides,
  };
}

beforeEach(() => {
  llmGenerate.mockReset();
});

afterEach(() => {
  // Safety net: never leak fake timers (or their pending callbacks) between
  // tests — timer-driven mutations would otherwise fire mid-later-test.
  vi.useRealTimers();
});

// ── Route shape ──────────────────────────────────────────────────────────────

describe('teammates router — route shape', () => {
  it('exposes exactly the 15 documented procedures, each with a callable handler', () => {
    const router = buildRouter();
    expect(Object.keys(router).sort()).toEqual([...EXPECTED_PROCEDURES].sort());
    for (const name of EXPECTED_PROCEDURES) {
      expect(router[name], `procedure "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `handler of "${name}"`).toBe('function');
    }
  });

  it('registers queries vs mutations through the stubbed procedure chain', () => {
    const procedure: any = {
      input: () => procedure,
      query: (handler: any) => ({ type: 'query', handler }),
      mutation: (handler: any) => ({ type: 'mutation', handler }),
    };
    const router = buildRouterWith(procedure);
    expect(router.listTeammates.type).toBe('query');
    expect(router.getTeammate.type).toBe('query');
    expect(router.listMessages.type).toBe('query');
    expect(router.sendMessage.type).toBe('mutation');
    expect(router.resolveApproval.type).toBe('mutation');
    expect(router.takeControlSandbox.type).toBe('mutation');
  });
});

function buildRouterWith(procedure: any) {
  const t: any = { router: (routes: any) => routes };
  return createTeammatesRouter(t, procedure);
}

// ── Teammates CRUD ───────────────────────────────────────────────────────────

describe('teammates router — teammates CRUD', () => {
  it('listTeammates returns the seeded fleet with the documented Teammate shape', async () => {
    const router = buildRouter();
    const roster = await call(router.listTeammates);

    expect(Array.isArray(roster)).toBe(true);
    const ids = roster.map((tm: any) => tm.id);
    for (const seeded of ['hermes_orchestrator', 'alex_tprm', 'morgan_iac', 'riley_evidence']) {
      expect(ids, `seeded teammate "${seeded}"`).toContain(seeded);
    }
    const hermes = roster.find((tm: any) => tm.id === 'hermes_orchestrator');
    expect(typeof hermes.name).toBe('string');
    expect(['idle', 'running', 'waiting_approval', 'paused']).toContain(hermes.status);
    expect(Array.isArray(hermes.capabilities)).toBe(true);
    expect(typeof hermes.tasksCompleted).toBe('number');
    expect(typeof hermes.lastActive).toBe('string');
  });

  it('getTeammate resolves a seeded teammate by id', async () => {
    const router = buildRouter();
    const alex = await call(router.getTeammate, { teammateId: 'alex_tprm' });
    expect(alex.id).toBe('alex_tprm');
    expect(typeof alex.role).toBe('string');
    expect(alex.sandboxType).toBe('browser');
  });

  it('getTeammate rejects NOT_FOUND for an unknown id', async () => {
    const router = buildRouter();
    await expectNotFound(call(router.getTeammate, { teammateId: 'ghost_teammate' }));
  });

  it('createTeammate persists the record: create → listTeammates/getTeammate round-trip', async () => {
    const router = buildRouter();
    const rosterBefore = await call(router.listTeammates);
    const payload = teammatePayload();

    const created = await call(router.createTeammate, payload);
    expect(created.id).toMatch(/^custom_/);
    expect(created.name).toBe(payload.name);
    expect(created.status).toBe('idle');
    expect(created.tasksCompleted).toBe(0);
    expect(created.capabilities).toEqual(payload.capabilities);

    const rosterAfter = await call(router.listTeammates);
    expect(rosterAfter.length).toBe(rosterBefore.length + 1);
    expect(rosterAfter.map((tm: any) => tm.id)).toContain(created.id);

    const fetched = await call(router.getTeammate, { teammateId: created.id });
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe(payload.name);

    await call(router.deleteTeammate, { id: created.id }); // cleanup
  });

  it('createTeammate applies the documented fallbacks for omitted optional fields', async () => {
    const router = buildRouter();
    const created = await call(
      router.createTeammate,
      teammatePayload({ avatar: undefined, model: undefined, capabilities: [] }),
    );
    expect(created.avatar).toBe('🤖');
    expect(created.model).toBe('claude-3-7-sonnet');
    expect(created.capabilities).toEqual(['Autonomous Task Execution']);
    await call(router.deleteTeammate, { id: created.id }); // cleanup
  });

  it('updateTeammate mutates the stored record while preserving identity/status', async () => {
    const router = buildRouter();
    const created = await call(router.createTeammate, teammatePayload());
    const updatedName = `Renamed ${uniq()}`;

    const updated = await call(router.updateTeammate, {
      ...teammatePayload({ name: updatedName, role: 'QA Lead Tester' }),
      id: created.id,
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe(updatedName);
    expect(updated.role).toBe('QA Lead Tester');

    const fetched = await call(router.getTeammate, { teammateId: created.id });
    expect(fetched.name).toBe(updatedName);
    expect(fetched.status).toBe('idle'); // untouched by update
    await call(router.deleteTeammate, { id: created.id }); // cleanup
  });

  it('updateTeammate rejects NOT_FOUND for an unknown id', async () => {
    const router = buildRouter();
    await expectNotFound(
      call(router.updateTeammate, { ...teammatePayload(), id: 'ghost_teammate' }),
    );
  });

  it('deleteTeammate removes the record and reports success with the id', async () => {
    const router = buildRouter();
    const created = await call(router.createTeammate, teammatePayload());

    const result = await call(router.deleteTeammate, { id: created.id });
    expect(result).toEqual({ success: true, id: created.id });
    await expectNotFound(call(router.getTeammate, { teammateId: created.id }));

    const roster = await call(router.listTeammates);
    expect(roster.map((tm: any) => tm.id)).not.toContain(created.id);
  });

  it('deleteTeammate rejects NOT_FOUND for an unknown id', async () => {
    const router = buildRouter();
    await expectNotFound(call(router.deleteTeammate, { id: 'ghost_teammate' }));
  });
});

// ── Tasks ────────────────────────────────────────────────────────────────────

describe('teammates router — tasks', () => {
  it('listTasks returns seeded tasks carrying logs/artifacts in the documented shape', async () => {
    const router = buildRouter();
    const tasks = await call(router.listTasks);

    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) {
      expect(typeof task.id).toBe('string');
      expect(typeof task.teammateId).toBe('string');
      expect(['pending', 'running', 'completed', 'failed', 'requires_approval']).toContain(task.status);
      expect(Array.isArray(task.logs)).toBe(true);
    }
    const seeded = tasks.find((t: any) => t.id === 'task_1');
    expect(seeded, 'seeded task_1').toBeDefined();
    expect(Array.isArray(seeded.artifacts)).toBe(true);
    expect(Array.isArray(seeded.browserSteps)).toBe(true);
  });

  it('createTask starts a running task at the front of the queue and flips the teammate to running, completing after ~4s', async () => {
    vi.useFakeTimers();
    const router = buildRouter();

    const rosterBefore = await call(router.listTeammates);
    const alexBefore = rosterBefore.find((tm: any) => tm.id === 'alex_tprm');
    const tasksBefore = await call(router.listTasks);

    const task = await call(router.createTask, {
      teammateId: 'alex_tprm',
      title: `QA sweep ${uniq()}`,
      type: 'vendor_soc2',
      targetUrl: 'https://example.com/trust',
      summary: 'Contract-test task execution',
    });

    // immediate effects
    expect(task.id).toMatch(/^task_/);
    expect(task.teammateId).toBe('alex_tprm');
    expect(task.status).toBe('running');
    expect(task.targetUrl).toBe('https://example.com/trust');
    expect(task.logs.length).toBeGreaterThanOrEqual(2);
    expect(task.browserSteps?.[0]?.url).toBe('https://example.com/trust');

    const tasksAfterStart = await call(router.listTasks);
    expect(tasksAfterStart.length).toBe(tasksBefore.length + 1);
    expect(tasksAfterStart[0].id).toBe(task.id); // newest task is unshifted to the front
    const alexRunning = (await call(router.listTeammates)).find((tm: any) => tm.id === 'alex_tprm');
    expect(alexRunning.status).toBe('running');

    // deferred completion side-effect (~4s simulated)
    await vi.advanceTimersByTimeAsync(4_000);
    expect(task.status).toBe('completed');
    expect(typeof task.completedAt).toBe('string');
    expect(task.logs.some((l: any) => l.level === 'info' && /finished successfully/i.test(l.message))).toBe(true);
    const alexDone = (await call(router.listTeammates)).find((tm: any) => tm.id === 'alex_tprm');
    expect(alexDone.status).toBe('idle');
    expect(alexDone.tasksCompleted).toBe(alexBefore.tasksCompleted + 1);
    vi.useRealTimers();
  });

  it('createTask without targetUrl leaves browserSteps undefined and still completes cleanly', async () => {
    vi.useFakeTimers();
    const router = buildRouter();

    const task = await call(router.createTask, {
      teammateId: 'riley_evidence',
      title: `Headless-free QA job ${uniq()}`,
      type: 'access_review',
      summary: 'No browser steps expected',
    });
    expect(task.browserSteps).toBeUndefined();
    expect(task.status).toBe('running');

    vi.advanceTimersByTime(4_000);
    expect(task.status).toBe('completed');
    const riley = (await call(router.listTeammates)).find((tm: any) => tm.id === 'riley_evidence');
    expect(riley.status).toBe('idle');
  });

  it('listTasks filters by teammateId when given, and returns everything otherwise', async () => {
    vi.useFakeTimers();
    const router = buildRouter();

    const marker = `filtered QA task ${uniq()}`;
    await call(router.createTask, {
      teammateId: 'morgan_iac',
      title: marker,
      type: 'iac_remediation',
      summary: 'Filtering probe',
    });
    vi.advanceTimersByTime(4_000); // settle background completion

    const all = await call(router.listTasks);
    const morgans = await call(router.listTasks, { teammateId: 'morgan_iac' });
    const alexs = await call(router.listTasks, { teammateId: 'alex_tprm' });

    expect(morgans.length).toBeGreaterThan(0);
    expect(morgans.every((t: any) => t.teammateId === 'morgan_iac')).toBe(true);
    expect(morgans.map((t: any) => t.title)).toContain(marker);
    expect(alexs.every((t: any) => t.teammateId === 'alex_tprm')).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(morgans.length + alexs.length);
  });
});

// ── Approvals ────────────────────────────────────────────────────────────────

describe('teammates router — approvals', () => {
  it('listApprovals returns approval items with the documented ApprovalItem shape', async () => {
    const router = buildRouter();
    const approvals = await call(router.listApprovals);

    expect(Array.isArray(approvals)).toBe(true);
    expect(approvals.length).toBeGreaterThan(0);
    for (const item of approvals) {
      expect(typeof item.id).toBe('string');
      expect(['github_pr', 'vendor_email', 'policy_update', 'aws_remediation']).toContain(item.type);
      expect(['low', 'medium', 'high', 'critical']).toContain(item.severity);
      expect(['pending', 'approved', 'rejected']).toContain(item.status);
    }
    const seeded = approvals.find((a: any) => a.id === 'appr_1');
    expect(seeded, 'seeded appr_1').toBeDefined();
  });

  it('resolveApproval transitions an item to approved and then to rejected', async () => {
    const router = buildRouter();

    const approved = await call(router.resolveApproval, { approvalId: 'appr_1', action: 'approved' });
    expect(approved.success).toBe(true);
    expect(approved.item.id).toBe('appr_1');
    expect(approved.item.status).toBe('approved');

    const rejected = await call(router.resolveApproval, {
      approvalId: 'appr_1',
      action: 'rejected',
      comment: 'needs another pass',
    });
    expect(rejected.success).toBe(true);
    expect(rejected.item.status).toBe('rejected');

    // visible through the query side
    const listed = await call(router.listApprovals);
    expect(listed.find((a: any) => a.id === 'appr_1').status).toBe('rejected');
  });

  it('resolveApproval rejects NOT_FOUND for an unknown approvalId', async () => {
    const router = buildRouter();
    await expectNotFound(
      call(router.resolveApproval, { approvalId: 'appr_ghost', action: 'approved' }),
    );
  });
});

// ── Routines ─────────────────────────────────────────────────────────────────

describe('teammates router — routines', () => {
  it('listRoutines returns routines with the documented TeammateRoutine shape', async () => {
    const router = buildRouter();
    const routines = await call(router.listRoutines);

    expect(Array.isArray(routines)).toBe(true);
    expect(routines.length).toBeGreaterThanOrEqual(3);
    for (const routine of routines) {
      expect(typeof routine.schedule).toBe('string');
      expect(['active', 'paused', 'running']).toContain(routine.status);
      expect(typeof routine.nextRun).toBe('string');
    }
  });

  it('toggleRoutine pauses and resumes a routine', async () => {
    const router = buildRouter();

    const paused = await call(router.toggleRoutine, { routineId: 'routine_uar_weekly', active: false });
    expect(paused.status).toBe('paused');

    const resumed = await call(router.toggleRoutine, { routineId: 'routine_uar_weekly', active: true });
    expect(resumed.status).toBe('active');
    expect((await call(router.listRoutines)).find((r: any) => r.id === 'routine_uar_weekly').status).toBe('active');
  });

  it('toggleRoutine rejects NOT_FOUND for an unknown routineId', async () => {
    const router = buildRouter();
    await expectNotFound(call(router.toggleRoutine, { routineId: 'routine_ghost', active: false }));
  });

  it('triggerRoutineNow marks the routine running and settles back to active/success', async () => {
    vi.useFakeTimers();
    const router = buildRouter();

    const triggered = await call(router.triggerRoutineNow, { routineId: 'routine_tpm_daily' });
    expect(triggered.status).toBe('running');
    expect(triggered.lastRun).toBe('Just now');

    vi.advanceTimersByTime(3_000);
    const settled = (await call(router.listRoutines)).find((r: any) => r.id === 'routine_tpm_daily');
    expect(settled.status).toBe('active');
    expect(settled.lastRunResult).toBe('success');
  });

  it('triggerRoutineNow rejects NOT_FOUND for an unknown routineId', async () => {
    const router = buildRouter();
    await expectNotFound(call(router.triggerRoutineNow, { routineId: 'routine_ghost' }));
  });
});

// ── Multi-agent chat ─────────────────────────────────────────────────────────

describe('teammates router — chat', () => {
  it('listMessages returns the seeded war-room thread with ChatMessage shape', async () => {
    const router = buildRouter();
    const messages = await call(router.listMessages, { channelId: 'war_room' });

    expect(messages.length).toBeGreaterThanOrEqual(4);
    for (const message of messages) {
      expect(message.channelId).toBe('war_room');
      expect(typeof message.senderId).toBe('string');
      expect(typeof message.content).toBe('string');
    }
    const seedMentions = messages.find((m: any) => Array.isArray(m.mentions));
    expect(seedMentions, 'a seeded message carries mentions').toBeDefined();
  });

  it('listMessages keeps channels separate', async () => {
    const router = buildRouter();
    const warRoom = await call(router.listMessages, { channelId: 'war_room' });
    const alexDm = await call(router.listMessages, { channelId: 'alex_tprm' });

    expect(warRoom.every((m: any) => m.channelId === 'war_room')).toBe(true);
    expect(alexDm.length).toBeGreaterThan(0);
    expect(alexDm.every((m: any) => m.channelId === 'alex_tprm')).toBe(true);
  });

  it('sendMessage appends the user message and routes a Morgan-only reply for infra asks', async () => {
    const router = buildRouter();
    const before = await call(router.listMessages, { channelId: 'war_room' });

    const result = await call(router.sendMessage, {
      channelId: 'war_room',
      content: '@morgan please review terraform drift in staging',
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.messages)).toBe(true);

    const after = await call(router.listMessages, { channelId: 'war_room' });
    expect(after.length).toBe(before.length + 2); // user message + exactly one Morgan reply
    expect(after[before.length].senderId).toBe('user');
    expect(after[before.length].content).toContain('@morgan');
    expect(after[before.length + 1].senderId).toBe('morgan_iac');
    // retrieved via the query side
    expect(result.messages.length).toBe(after.length);
  });

  it('sendMessage hands off across agents when several bots are mentioned', async () => {
    const router = buildRouter();
    const before = await call(router.listMessages, { channelId: 'war_room' });

    await call(router.sendMessage, {
      channelId: 'war_room',
      content: '@alex audit the new vendor and coordinate cloud remediation with @morgan',
    });

    const after = await call(router.listMessages, { channelId: 'war_room' });
    const appendedSenders = after.slice(before.length).map((m: any) => m.senderId);
    expect(appendedSenders[0]).toBe('user');
    expect(appendedSenders).toContain('alex_tprm');
    expect(appendedSenders).toContain('morgan_iac'); // multi-agent handover happened
  });

  it('empty war-room content still yields a graceful fallback reply and never throws', async () => {
    const router = buildRouter();
    const before = await call(router.listMessages, { channelId: 'war_room' });

    const result = await call(router.sendMessage, { channelId: 'war_room', content: '' });

    expect(result.success).toBe(true);
    const after = await call(router.listMessages, { channelId: 'war_room' });
    expect(after.length).toBe(before.length + 2); // user bubble + Alex fallback reply
    expect(after[before.length + 1].senderId).toBe('alex_tprm');
    expect(typeof after[before.length + 1].content).toBe('string');
    expect(after[before.length + 1].content.length).toBeGreaterThan(0);
  });

  it('direct-channel sendMessage uses the LLM completion text when generation succeeds', async () => {
    const router = buildRouter();
    const before = await call(router.listMessages, { channelId: 'alex_tprm' });
    const completion =
      'Live-model answer: prioritize Annex A.5 policies before the Q4 surveillance audit window.';
    llmGenerate.mockResolvedValueOnce({ text: completion } as any);

    const result = await call(router.sendMessage, {
      channelId: 'alex_tprm',
      content: 'What should we remediate first?',
    });

    expect(llmGenerate).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    const after = await call(router.listMessages, { channelId: 'alex_tprm' });
    expect(after.length).toBe(before.length + 2); // user bubble + bot reply
    const reply = after[after.length - 1];
    expect(reply.content).toBe(completion);
    expect(reply.senderId).toBe('alex_tprm');
    expect(reply.senderName).toBe('Alex');
  });

  it('direct-channel sendMessage falls back to expert knowledge when the LLM fails (402), never throwing', async () => {
    const router = buildRouter();
    const before = await call(router.listMessages, { channelId: 'alex_tprm' });
    llmGenerate.mockRejectedValueOnce(new Error('402 Insufficient Balance'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const result = await call(router.sendMessage, {
        channelId: 'alex_tprm',
        content: 'Explain ISO 27001 Annex A expectations',
      });

      expect(result.success).toBe(true);
      const after = await call(router.listMessages, { channelId: 'alex_tprm' });
      expect(after.length).toBe(before.length + 2);
      const reply = after[after.length - 1];
      expect(reply.senderId).toBe('alex_tprm');
      expect(reply.content).toContain('27001'); // built-in framework knowledge engaged
      expect(reply.content).toContain('402 Insufficient Balance'); // provider notice surfaced
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('empty direct-channel content falls back gracefully when the LLM yields nothing usable', async () => {
    const router = buildRouter();
    const before = await call(router.listMessages, { channelId: 'morgan_iac' });
    // mockReset leaves generate returning undefined → completion.text unusable
    llmGenerate.mockResolvedValueOnce(undefined as any);

    const result = await call(router.sendMessage, { channelId: 'morgan_iac', content: '' });

    expect(result.success).toBe(true);
    const after = await call(router.listMessages, { channelId: 'morgan_iac' });
    expect(after.length).toBe(before.length + 2);
    const reply = after[after.length - 1];
    expect(reply.senderName).toBe('Morgan');
    expect(typeof reply.content).toBe('string');
    expect(reply.content.length).toBeGreaterThan(0); // fallback knowledge, never empty
  });
});

// ── Sandbox control ──────────────────────────────────────────────────────────

describe('teammates router — takeControlSandbox', () => {
  it('returns a session handle for a known teammate', async () => {
    const router = buildRouter();
    const session = await call(router.takeControlSandbox, { teammateId: 'alex_tprm' });

    expect(session.success).toBe(true);
    expect(session.message).toContain('Alex');
    expect(session.sessionUrl).toContain('sandbox-alex_tprm');
  });

  it('rejects NOT_FOUND for an unknown teammate (hardened contract)', async () => {
    const router = buildRouter();
    await expectNotFound(call(router.takeControlSandbox, { teammateId: 'ghost_teammate' }));
  });
});

// ── Determinism / stability ──────────────────────────────────────────────────

describe('teammates router — determinism', () => {
  it('repeated reads return consistent results', async () => {
    const router = buildRouter();

    const teammatesA = await call(router.listTeammates);
    const teammatesB = await call(router.listTeammates);
    expect(teammatesB).toEqual(teammatesA);

    const approvalsA = await call(router.listApprovals);
    const approvalsB = await call(router.listApprovals);
    expect(approvalsB).toEqual(approvalsA);

    const routinesA = await call(router.listRoutines);
    const routinesB = await call(router.listRoutines);
    expect(routinesB).toEqual(routinesA);
  });

  it('repeating an identical war-room ask produces the same reply structure every time', async () => {
    const router = buildRouter();
    const content = '@morgan check iam key rotation posture';

    const before1 = await call(router.listMessages, { channelId: 'war_room' });
    await call(router.sendMessage, { channelId: 'war_room', content });
    const after1 = await call(router.listMessages, { channelId: 'war_room' });

    const before2 = await call(router.listMessages, { channelId: 'war_room' });
    await call(router.sendMessage, { channelId: 'war_room', content });
    const after2 = await call(router.listMessages, { channelId: 'war_room' });

    const shape1 = [after1.length - before1.length, after1[after1.length - 1].senderId];
    const shape2 = [after2.length - before2.length, after2[after2.length - 1].senderId];
    expect(shape1).toEqual([2, 'morgan_iac']);
    expect(shape2).toEqual(shape1);
  });
});

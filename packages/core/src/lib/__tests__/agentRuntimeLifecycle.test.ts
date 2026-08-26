import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Agent Runtime lifecycle contract tests (QA build-cycle 47).
 *
 * Under test: packages/core/src/server/runtime/agentRuntime.ts — exercised
 * STRICTLY through its public API: startAgentRuntime() / stopAgentRuntime() /
 * isRuntimeRunning(). No internals (tick, timer handles) are imported.
 *
 * Contracts pinned (cycle 47):
 *   1. start→stop WITHIN the 15s boot delay cancels the initial (boot) tick —
 *      nothing may fire after stop. This pins the fix that stores and clears
 *      the boot setTimeout handle; EXPECTED-RED until the backend lands.
 *   2. double-start is idempotent — one boot timeout, one interval.
 *   3. stop when idle (and double-stop) is safe.
 *   4. isRuntimeRunning flips correctly across the lifecycle.
 *   5. While running: one boot tick at ~15s, then one tick per 60s.
 *   6. A due autopilot_config reaches every sentinel bot exactly once per
 *      tick WITHOUT any real database (getDb stub + bot `observe` spied).
 *
 * Hermeticity strategy:
 *   - `../../db` is mocked so ticks run against a stub whose `execute` is a
 *     counting vi.fn — each tick issues exactly one SELECT against
 *     autopilot_configs when no config rows are seeded, giving a precise
 *     per-tick heartbeat counter.
 *   - Bot modules are deliberately NOT vi.mock'ed: vitest factory mocks do not
 *     intercept agentRuntime's LAZY dynamic imports (`await import("./bots/x")`),
 *     so real bots would load and silently no-op against the stubbed db. Instead
 *     this spec imports the REAL bot singleton objects and vi.spyOn's their
 *     `observe` method — the exact references getBots() hands back every tick —
 *     keeping the pipeline observable end-to-end without DB writes.
 *   - Clocks are PINNED with vitest fake timers (now = 2026-01-15T10:07Z):
 *     minute-of-hour 7 avoids the `getMinutes() === 0` escalation-sweep gate
 *     and hour 12(local)/10(UTC) avoids the 08:00 digest window, keeping runs
 *     deterministic regardless of wall-clock time. No real sleeps; the largest
 *     single timer jump is virtual (advanceTimersByTimeAsync).
 */
const h = vi.hoisted(() => {
  /** Reconstruct static SQL text + bound scalar params from a drizzle query object. */
  function describeQuery(q: any): { text: string; params: unknown[] } {
    const out = { text: "", params: [] as unknown[] };
    const walk = (chunk: any, depth: number): void => {
      if (chunk == null || depth > 4) return;
      const t = typeof chunk;
      if (t === "string") { out.text += chunk; return; }
      if (t === "number" || t === "boolean" || t === "bigint") { out.params.push(chunk); return; }
      if (Array.isArray(chunk)) { for (const c of chunk) walk(c, depth + 1); return; }
      if (t !== "object") return;
      if (Array.isArray((chunk as any).value) && typeof (chunk as any).value[0] === "string") {
        out.text += (chunk as any).value.join("");
        return;
      }
      if ("value" in chunk) { out.params.push((chunk as any).value); return; }
      if ((chunk as any).queryChunks) walk((chunk as any).queryChunks, depth + 1);
    };
    try { walk(q?.queryChunks ?? q, 0); } catch { /* opaque query shape — text stays empty */ }
    return out;
  }

  const state = { configRows: [] as any[] };

  const execute = vi.fn(async (q: any) => {
    const d = describeQuery(q);
    if (/FROM\s+autopilot_configs/i.test(d.text)) return { rows: state.configRows.map(r => ({ ...r })) };
    if (/INSERT\s+INTO\s+autopilot_runs/i.test(d.text)) return { rows: [{ id: 9001 }] };
    return { rows: [] };
  });

  return { state, execute };
});

vi.mock("../../db", () => ({
  getDb: vi.fn(async () => ({ execute: h.execute })),
}));

// ./bots/* dynamic imports inside agentRuntime.getBots(), mocked so ticks are
// observable without a database. Specifiers resolve from THIS file to the same
// modules the runtime loads via "./bots/<name>".
import * as rt from "../../server/runtime/agentRuntime";
// Real bot singletons — spied below, NOT vi.mock'ed: factory mocks cannot
// intercept agentRuntime's lazy dynamic imports, so we patch the observe
// method on the exact objects getBots() returns every tick.
import { complianceSentinel } from "../../server/runtime/bots/complianceSentinel";
import { slaHound } from "../../server/runtime/bots/slaHound";
import * as roster from "../../server/runtime/bots/roster";

const BOOT_DELAY_MS = 15_000; // mirrors the runtime's initial-tick delay
const TICK_INTERVAL_MS = 60_000; // mirrors TICK_INTERVAL_MS

const ALL_BOTS = [
  complianceSentinel,
  slaHound,
  roster.riskWatchdog,
  roster.vulnerabilitySentinel,
  roster.policySteward,
  roster.bcGuardian,
  roster.anomalySpotter,
] as const;

/** Pinned clock: minute ≠ 0 (no hourly sweep) and hour ≠ 08:00 (no digest). */
function usePinnedClock(): void {
  vi.useFakeTimers({ now: new Date("2026-01-15T10:07:00Z") });
}

let observeSpies: Array<{ mockRestore: () => unknown }> = [];

beforeEach(() => {
  usePinnedClock();
  // Patch observe on the REAL singletons getBots() returns each tick.
  observeSpies = ALL_BOTS.map(b => vi.spyOn(b, "observe").mockResolvedValue([]));
});

afterEach(() => {
  rt.stopAgentRuntime(); // never leak an interval into another test
  h.state.configRows.length = 0;
  observeSpies.forEach(s => s.mockRestore());
  observeSpies = [];
  vi.clearAllMocks(); // wipe call history, keep implementations
  vi.useRealTimers();
});

// ── Lifecycle flag ───────────────────────────────────────────────────────────

describe("agent runtime — public lifecycle flag", () => {
  it("starts idle, flips true on start and back to false on stop", () => {
    expect(rt.isRuntimeRunning()).toBe(false);
    rt.startAgentRuntime();
    expect(rt.isRuntimeRunning()).toBe(true);
    rt.stopAgentRuntime();
    expect(rt.isRuntimeRunning()).toBe(false);
  });

  it("stop when idle is safe — including a double stop", () => {
    expect(() => rt.stopAgentRuntime()).not.toThrow();
    expect(rt.isRuntimeRunning()).toBe(false);
    expect(() => rt.stopAgentRuntime()).not.toThrow();
    expect(rt.isRuntimeRunning()).toBe(false);
  });
});

// ── Tick scheduling ──────────────────────────────────────────────────────────

describe("agent runtime — tick scheduling", () => {
  it("fires exactly one boot tick after ~15s, then one tick per minute", async () => {
    rt.startAgentRuntime();
    await vi.advanceTimersByTimeAsync(BOOT_DELAY_MS);
    expect(h.execute).toHaveBeenCalledTimes(1); // boot tick only

    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
    expect(h.execute).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
    expect(h.execute).toHaveBeenCalledTimes(3);
  });

  it("double-start is idempotent — one boot timeout and one interval, not two", async () => {
    rt.startAgentRuntime();
    rt.startAgentRuntime();
    expect(rt.isRuntimeRunning()).toBe(true);

    // boot tick (1) + first interval tick (1) = 2 total, never 3+
    await vi.advanceTimersByTimeAsync(BOOT_DELAY_MS + TICK_INTERVAL_MS);
    expect(h.execute).toHaveBeenCalledTimes(2);
    expect(rt.isRuntimeRunning()).toBe(true);
  });

  it("[cycle 47] start→stop within the boot delay cancels the initial tick — nothing fires afterwards", async () => {
    rt.startAgentRuntime();
    await vi.advanceTimersByTimeAsync(5_000); // still inside the 15s boot window
    rt.stopAgentRuntime();
    expect(rt.isRuntimeRunning()).toBe(false);

    // Outlive both the pending boot timeout and several interval periods.
    await vi.advanceTimersByTimeAsync(BOOT_DELAY_MS + 3 * TICK_INTERVAL_MS);
    expect(h.execute).not.toHaveBeenCalled();
  });

  it("stop after boot silences the recurring interval", async () => {
    rt.startAgentRuntime();
    await vi.advanceTimersByTimeAsync(BOOT_DELAY_MS);
    rt.stopAgentRuntime();
    expect(rt.isRuntimeRunning()).toBe(false);

    await vi.advanceTimersByTimeAsync(5 * TICK_INTERVAL_MS);
    expect(h.execute).toHaveBeenCalledTimes(1); // only the boot tick ever ran
  });
});

// ── Bot pipeline wiring (observable without a database) ──────────────────────

describe("agent runtime — bot pipeline wiring (spied bots, stubbed db)", () => {
  it("a due autopilot config reaches every sentinel bot exactly once per tick without any database", async () => {
    h.state.configRows.push({
      id: 42,
      client_id: 7,
      enabled: true,
      schedule: "daily",
      modules: null,
      approval_mode: "manual",
      last_run_at: null, // never ran → immediately due
    });

    rt.startAgentRuntime();
    await vi.advanceTimersByTimeAsync(BOOT_DELAY_MS + 1_000);
    // The runtime runs clients fire-and-forget (`void runConfigForClient(...)`),
    // and getBots() resolves through REAL dynamic imports (vite-node I/O) that
    // are not pure microtasks — settle deterministically with a bounded,
    // sleep-free poll over virtual timer steps.
    for (let i = 0; i < 500 && !ALL_BOTS.every(b => b.observe.mock.calls.length > 0); i++) {
      await vi.advanceTimersByTimeAsync(1);
    }

    for (const bot of ALL_BOTS) {
      expect(bot.observe, `${bot.id} should have observed once`).toHaveBeenCalledTimes(1);
      expect(bot.observe).toHaveBeenCalledWith(expect.objectContaining({ clientId: 7 }));
    }

    // configs SELECT + run claim INSERT + run-close UPDATE + last_run UPDATE
    expect(h.execute.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});

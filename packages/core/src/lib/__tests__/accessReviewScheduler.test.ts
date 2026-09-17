import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Access Review Scheduler (cycle 7) — unit tests.
 *
 * The scheduler delegates the sweep to lib/accessReviews.runGlobalOverdueCheck
 * (covered by accessReviews.test.ts) and is therefore tested here with the
 * lib mocked away: we verify the scheduling contract (12h default interval,
 * immediate first tick, interval ticks, stop(), error resilience) without a
 * DB or timers hitting the real clock.
 */

const mocks = vi.hoisted(() => ({
  runGlobalOverdueCheck: vi.fn(),
}));

vi.mock("../../lib/accessReviews", () => ({
  runGlobalOverdueCheck: mocks.runGlobalOverdueCheck,
}));

type Scheduler = typeof import("../../server/services/accessReviewScheduler");
let sched: Scheduler;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  sched = await import("../../server/services/accessReviewScheduler");
  mocks.runGlobalOverdueCheck.mockReset();
  mocks.runGlobalOverdueCheck.mockResolvedValue({ overdue: 2, checkedAt: new Date("2026-08-16T12:00:00.000Z") });
  consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  sched.stop(); // never leak an interval into the next test
  vi.useRealTimers();
  consoleLogSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();
});

describe("accessReviewScheduler", () => {
  it("exports a 12h default interval", () => {
    expect(sched.DEFAULT_ACCESS_REVIEW_INTERVAL_MS).toBe(12 * 60 * 60 * 1000);
  });

  it("runAccessReviewSweep returns the sweep result", async () => {
    const result = await sched.runAccessReviewSweep();
    expect(result).toMatchObject({ overdue: 2 });
    expect(mocks.runGlobalOverdueCheck).toHaveBeenCalledTimes(1);
  });

  it("runAccessReviewSweep returns null when the underlying sweep throws", async () => {
    mocks.runGlobalOverdueCheck.mockRejectedValueOnce(new Error("boom"));
    const result = await sched.runAccessReviewSweep();
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("start() sweeps immediately, then on the interval; stop() halts it", async () => {
    sched.start(60 * 60 * 1000); // 1h cycle for a fast test
    expect(mocks.runGlobalOverdueCheck).toHaveBeenCalledTimes(1); // immediate first tick

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(mocks.runGlobalOverdueCheck).toHaveBeenCalledTimes(2); // first interval tick

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(mocks.runGlobalOverdueCheck).toHaveBeenCalledTimes(3); // second interval tick

    sched.stop();
    await vi.advanceTimersByTimeAsync(5 * 60 * 60 * 1000);
    expect(mocks.runGlobalOverdueCheck).toHaveBeenCalledTimes(3); // no more ticks
  });
});

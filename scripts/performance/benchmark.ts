import { performance } from "node:perf_hooks";
import { normalizeControlEffectiveness } from "../../packages/core/src/lib/riskCalculations";

function fmtMs(ms: number) {
  return `${ms.toFixed(2)}ms`;
}

function run(label: string, fn: () => void) {
  const t0 = performance.now();
  fn();
  const t1 = performance.now();
  const elapsed = t1 - t0;
  process.stdout.write(`${label}: ${fmtMs(elapsed)}\n`);
  return elapsed;
}

function baselineFullScanCleanup(iterations: number, maxSize: number) {
  const cache = new Map<string, { value: number; expires: number }>();
  const now = Date.now();

  for (let i = 0; i < iterations; i++) {
    cache.set(`k:${i}`, { value: i, expires: now + 60_000 });

    for (const [k, entry] of cache.entries()) {
      if (entry.expires <= now) cache.delete(k);
    }

    while (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  }
}

function optimizedThrottledCleanup(iterations: number, maxSize: number) {
  const cache = new Map<string, { value: number; expires: number }>();
  const now = Date.now();
  let counter = 0;

  for (let i = 0; i < iterations; i++) {
    cache.set(`k:${i}`, { value: i, expires: now + 60_000 });

    while (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }

    counter++;
    if (counter % 100 !== 0) continue;

    let scanned = 0;
    for (const [k, entry] of cache.entries()) {
      if (entry.expires <= now) cache.delete(k);
      if (++scanned >= 200) break;
    }
  }
}

function normalizeBench(iterations: number) {
  const values = [
    "Effective",
    "Partially Effective",
    "ineffective",
    "PARTIALLY-EFFECTIVE",
    "unknown",
    "",
  ];
  for (let i = 0; i < iterations; i++) {
    normalizeControlEffectiveness(values[i % values.length]);
  }
}

function main() {
  const iterations = Number(process.env.BENCH_ITERS || 200_000);
  const maxSize = Number(process.env.BENCH_MAX_SIZE || 1000);

  process.stdout.write(`Benchmark iterations=${iterations} maxSize=${maxSize}\n`);

  const baseline = run("Memory cache set + full-scan cleanup (baseline)", () =>
    baselineFullScanCleanup(iterations, maxSize),
  );

  const optimized = run("Memory cache set + throttled cleanup (optimized)", () =>
    optimizedThrottledCleanup(iterations, maxSize),
  );

  const improvementPct = ((baseline - optimized) / baseline) * 100;
  process.stdout.write(`Cleanup improvement: ${improvementPct.toFixed(1)}%\n`);

  run("normalizeControlEffectiveness", () => normalizeBench(iterations));
}

main();


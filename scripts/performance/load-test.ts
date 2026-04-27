import { performance } from "node:perf_hooks";
import { CacheManager, createCacheConfig } from "../../packages/core/src/lib/cache/manager";

async function main() {
  const durationMs = Number(process.env.LOAD_DURATION_MS || 5000);
  const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
  const keySpace = Number(process.env.LOAD_KEY_SPACE || 2000);

  const config = createCacheConfig();
  config.monitoring.enabled = false;
  const cache = new CacheManager(config);

  const start = performance.now();
  let ops = 0;

  async function worker(id: number) {
    while (performance.now() - start < durationMs) {
      const key = `k:${(ops + id) % keySpace}`;
      if ((ops + id) % 3 === 0) {
        await cache.set(key, { v: ops }, 30);
      } else {
        await cache.get(key);
      }
      ops++;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
  const elapsed = performance.now() - start;
  const opsPerSec = (ops / elapsed) * 1000;

  process.stdout.write(
    `Load test duration=${durationMs}ms concurrency=${concurrency} ops=${ops} ops/s=${opsPerSec.toFixed(0)}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});


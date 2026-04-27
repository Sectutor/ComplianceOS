import { CacheManager, createCacheConfig } from "../../packages/core/src/lib/cache/manager";

async function main() {
  const config = createCacheConfig();
  config.monitoring.enabled = false;

  const cache = new CacheManager(config);

  await cache.set("test:key", { ok: true }, 5);
  const v = await cache.get<{ ok: boolean }>("test:key");

  if (!v?.ok) {
    throw new Error("CacheManager basic set/get failed");
  }

  const health = await cache.healthCheck();
  if (!health.healthy) {
    throw new Error("CacheManager healthCheck reported unhealthy");
  }

  process.stdout.write("Performance smoke test OK\n");
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});


import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock("../logger", () => ({
  logger: loggerMock,
}));

class RedisMock {
  static lastInstance: RedisMock | null = null;
  static lastOptions: any = null;
  store = new Map<string, string>();
  connected = false;
  shouldPingFail = false;

  constructor(opts: unknown) {
    RedisMock.lastInstance = this;
    RedisMock.lastOptions = opts;
  }

  async connect() {
    this.connected = true;
  }

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async setex(key: string, _ttl: number, value: string) {
    this.store.set(key, value);
    return "OK";
  }

  async del(...keys: string[]) {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async flushdb() {
    this.store.clear();
    return "OK";
  }

  async ping() {
    if (this.shouldPingFail) throw new Error("ping failed");
    return "PONG";
  }

  async disconnect() {
    this.connected = false;
  }
}

vi.mock("ioredis", () => ({
  default: RedisMock,
}));

async function loadCacheModule() {
  return await import("../cache/manager");
}

describe("CacheManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
    RedisMock.lastInstance = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("stores and retrieves values from memory cache", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 1, maxSize: 2 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.set("a", { x: 1 }, 10);
    await expect(cache.get("a")).resolves.toEqual({ x: 1 });
  });

  it("expires entries based on TTL", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 1, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.set("a", "value", 1);
    await expect(cache.get("a")).resolves.toBe("value");
    vi.advanceTimersByTime(1001);
    await expect(cache.get("a")).resolves.toBeNull();
  });

  it("evicts least-recently-used items when maxSize is exceeded", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 2 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.set("a", 1, 10);
    await cache.set("b", 2, 10);
    await expect(cache.get("a")).resolves.toBe(1);
    await cache.set("c", 3, 10);

    await expect(cache.get("a")).resolves.toBe(1);
    await expect(cache.get("b")).resolves.toBeNull();
    await expect(cache.get("c")).resolves.toBe(3);
  });

  it("initializes Redis and uses prefixed keys for reads/writes", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 100 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    expect(redis.connected).toBe(true);

    await cache.set("k1", { ok: 1 }, 60);
    expect(await redis.get("compliance:k1")).toBeTruthy();
    expect(await redis.get("k1")).toBeNull();

    await expect(cache.get("k1")).resolves.toEqual({ ok: 1 });
  });

  it("falls back to legacy unprefixed Redis keys on get", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 100 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await redis.setex("legacyKey", 60, JSON.stringify({ legacy: true }));

    await expect(cache.get("legacyKey")).resolves.toEqual({ legacy: true });
  });

  it("deletes both prefixed and legacy keys", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 100 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await redis.setex("compliance:toDel", 60, JSON.stringify({ a: 1 }));
    await redis.setex("toDel", 60, JSON.stringify({ a: 2 }));

    await cache.del("toDel");
    expect(await redis.get("compliance:toDel")).toBeNull();
    expect(await redis.get("toDel")).toBeNull();
  });

  it("collects metrics and triggers alerts when thresholds are exceeded", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 1 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: true, collectInterval: 1000, alertThresholds: { hitRate: 100, memoryUsage: 0, errorRate: 0 } },
    });

    await cache.initialize();
    await cache.set("a", 1, 60);
    await cache.get("missing");

    vi.advanceTimersByTime(1000);
    const m = cache.getMetrics();
    expect(typeof m.hitRate).toBe("number");
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it("triggers error-rate alerts when errors occur", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: true, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 0 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await redis.setex("compliance:bad2", 60, "{not-json}");
    await cache.get("bad2");

    vi.advanceTimersByTime(1000);
    expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining("[CACHE ALERT] High error rate"));
  });

  it("healthCheck reports redisConnected true when ping succeeds", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const result = await cache.healthCheck();
    expect(result.redisConnected).toBe(true);
  });

  it("healthCheck returns redisConnected false when ping fails but stays healthy", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 30000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    redis.shouldPingFail = true;

    const result = await cache.healthCheck();
    expect(result.healthy).toBe(true);
    expect(result.redisConnected).toBe(false);
  });

  it("shutdown disconnects Redis and clears memory", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: true, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    await cache.set("a", 1, 60);

    await cache.shutdown();
    const redis = RedisMock.lastInstance!;
    expect(redis.connected).toBe(false);
    await expect(cache.get("a")).resolves.toBeNull();
  });

  it("clear flushes Redis and clears memory", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await cache.set("a", 1, 60);
    expect(redis.store.size).toBeGreaterThan(0);

    await cache.clear();
    expect(redis.store.size).toBe(0);
    await expect(cache.get("a")).resolves.toBeNull();
  });

  it("handles Redis initialization failures and falls back to memory-only mode", async () => {
    const originalConnect = RedisMock.prototype.connect;
    RedisMock.prototype.connect = vi.fn(async () => {
      throw new Error("connect failed");
    }) as unknown as RedisMock["connect"];

    try {
      const { CacheManager } = await loadCacheModule();
      const cache = new CacheManager({
        redis: { host: "localhost", port: 6379, db: 0 },
        tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
        monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
      });

      await cache.initialize();
      await cache.set("a", 1, 60);
      await expect(cache.get("a")).resolves.toBe(1);
      expect(loggerMock.error).toHaveBeenCalled();
    } finally {
      RedisMock.prototype.connect = originalConnect;
    }
  });

  it("supports Redis usage without a keyPrefix (legacy mode)", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60 }],
      monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await cache.set("k1", { ok: 1 }, 60);
    expect(await redis.get("k1")).toBeTruthy();

    await cache.del("k1");
    expect(await redis.get("k1")).toBeNull();
  });

  it("returns null and records an error when Redis contains invalid JSON", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await redis.setex("compliance:bad", 60, "{not-json}");

    await expect(cache.get("bad")).resolves.toBeNull();
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it("supports Redis caching even when tiers omit a redis config entry", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }],
      monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await cache.set("kNoTier", { ok: 1 }, 60);
    expect(await redis.get("kNoTier")).toBeTruthy();
  });

  it("runs periodic maintenance scans on the memory cache", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    for (let i = 0; i < 100; i++) {
      await cache.set(`k:${i}`, i, 60);
    }

    await expect(cache.get("k:1")).resolves.toBe(1);
  });

  it("clear works without Redis initialized", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
    });

    await cache.set("a", 1, 60);
    await cache.clear();
    await expect(cache.get("a")).resolves.toBeNull();
  });
});

describe("CacheKeys", () => {
  it("builds stable API response keys", async () => {
    const { CacheKeys } = await loadCacheModule();
    const k1 = CacheKeys.apiResponse("/v1/example", "a=1&b=2");
    const k2 = CacheKeys.apiResponse("/v1/example", "a=1&b=2");
    const k3 = CacheKeys.apiResponse("/v1/example", "a=2&b=2");

    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1.startsWith("api:/v1/example:")).toBe(true);
  });

  it("generates expected key prefixes for common data types", async () => {
    const { CacheKeys, createCacheConfig } = await loadCacheModule();
    const cfg = createCacheConfig();
    expect(cfg.tiers[0]?.type).toBe("memory");
    expect(cfg.tiers[1]?.type).toBe("redis");

    expect(CacheKeys.dashboard(1)).toBe("dashboard:1");
    expect(CacheKeys.complianceScore(2)).toBe("compliance:score:2");
    expect(CacheKeys.riskRegister(3)).toBe("risk:register:3");
    expect(CacheKeys.controls(4)).toBe("controls:4");
    expect(CacheKeys.policies(5)).toBe("policies:5");
    expect(CacheKeys.evidence(6, "e1")).toBe("evidence:6:e1");
    expect(CacheKeys.userSession("u1")).toBe("session:user:u1");
    expect(CacheKeys.clientConfig(7)).toBe("config:client:7");
    expect(CacheKeys.framework("f1")).toBe("framework:f1");
    expect(CacheKeys.threatIntel("t1")).toBe("threat:t1");
    expect(CacheKeys.vendor("v1")).toBe("vendor:v1");
  });
});

describe("CacheManager error handling & edge cases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
    RedisMock.lastInstance = null;
    RedisMock.lastOptions = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  function baseCacheConfig(overrides: Record<string, unknown> = {}) {
    return {
      redis: { host: "localhost", port: 6379, db: 0 },
      tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }],
      monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } },
      ...overrides,
    };
  }

  it("records a set error when Redis write fails but keeps the memory copy", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig() as never);
    await cache.initialize();

    const originalSetex = RedisMock.prototype.setex;
    RedisMock.prototype.setex = vi.fn(async () => { throw new Error("write failed"); }) as unknown as RedisMock["setex"];
    try {
      await cache.set("failKey", { v: 1 }, 60);
      expect(loggerMock.error).toHaveBeenCalled();
      await expect(cache.get("failKey")).resolves.toEqual({ v: 1 });
    } finally {
      RedisMock.prototype.setex = originalSetex;
    }
  });

  it("records a delete error when Redis delete fails", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig() as never);
    await cache.initialize();

    const originalDel = RedisMock.prototype.del;
    RedisMock.prototype.del = vi.fn(async () => { throw new Error("del failed"); }) as unknown as RedisMock["del"];
    try {
      await cache.set("k", 1, 60);
      await cache.del("k");
      expect(loggerMock.error).toHaveBeenCalled();
    } finally {
      RedisMock.prototype.del = originalDel;
    }
  });

  it("records a clear error when Redis flushdb fails", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig() as never);
    await cache.initialize();
    await cache.set("a", 1, 60);

    const originalFlushdb = RedisMock.prototype.flushdb;
    RedisMock.prototype.flushdb = vi.fn(async () => { throw new Error("flush failed"); }) as unknown as RedisMock["flushdb"];
    try {
      await cache.clear();
      expect(loggerMock.error).toHaveBeenCalled();
    } finally {
      RedisMock.prototype.flushdb = originalFlushdb;
    }
  });

  it("returns null and logs when Redis get throws", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig() as never);
    await cache.initialize();

    const originalGet = RedisMock.prototype.get;
    RedisMock.prototype.get = vi.fn(async () => { throw new Error("get failed"); }) as unknown as RedisMock["get"];
    try {
      await expect(cache.get("boom")).resolves.toBeNull();
      expect(loggerMock.error).toHaveBeenCalled();
    } finally {
      RedisMock.prototype.get = originalGet;
    }
  });

  it("configures a bounded exponential retry strategy for Redis", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig() as never);
    await cache.initialize();

    const opts = RedisMock.lastOptions as { retryStrategy?: (times: number) => number };
    expect(typeof opts?.retryStrategy).toBe("function");
    expect(opts!.retryStrategy!(1)).toBe(100);
    expect(opts!.retryStrategy!(20)).toBe(2000);
    expect(opts!.retryStrategy!(100)).toBe(2000);
  });

  it("reads redis values directly when no keyPrefix is configured", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig({ tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 60 }] }) as never);
    await cache.initialize();
    const redis = RedisMock.lastInstance!;
    await redis.setex("directKey", 60, JSON.stringify({ direct: true }));

    await expect(cache.get("directKey")).resolves.toEqual({ direct: true });
    await expect(cache.get("missingDirect")).resolves.toBeNull();
  });

  it("falls back to tier TTL when ttl argument is omitted", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig({ tiers: [{ type: "memory", ttl: 60, maxSize: 10 }, { type: "redis", ttl: 120, keyPrefix: "compliance:" }] }) as never);
    await cache.initialize();

    const setexSpy = vi.spyOn(RedisMock.prototype, "setex");
    await cache.set("noTtl", 1);
    expect(setexSpy).toHaveBeenCalledWith("compliance:noTtl", 120, "1");
    setexSpy.mockRestore();
  });

  it("defaults to 300s TTL when no ttl and no redis tier exists", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig({ tiers: [{ type: "memory", ttl: 60, maxSize: 10 }] }) as never);
    await cache.initialize();

    const setexSpy = vi.spyOn(RedisMock.prototype, "setex");
    await cache.set("noTtlNoTier", 2);
    expect(setexSpy).toHaveBeenCalledWith("noTtlNoTier", 300, "2");
    setexSpy.mockRestore();
  });

  it("works with an empty tiers list and falls back to default TTLs", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig({ tiers: [] }) as never);
    await cache.initialize();
    const redis = RedisMock.lastInstance!;

    await redis.setex("bareKey", 60, JSON.stringify("bare"));
    await expect(cache.get("bareKey")).resolves.toBe("bare");

    await cache.set("bareSet", "x");
    expect(await redis.get("bareSet")).toBe(JSON.stringify("x"));
  });

  it("reports healthy with redis disconnected when not initialized", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig() as never);

    const result = await cache.healthCheck();
    expect(result.healthy).toBe(true);
    expect(result.redisConnected).toBe(false);
  });

  it("shutdown is safe when monitoring and redis are not active", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager(baseCacheConfig() as never);
    await cache.set("a", 1, 60);

    await cache.shutdown();
    await expect(cache.get("a")).resolves.toBeNull();
    expect(loggerMock.info).toHaveBeenCalled();
  });
});
describe("CacheManager maintenance & idle metrics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.debug.mockClear();
    RedisMock.lastInstance = null;
    RedisMock.lastOptions = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });
  it("cleans expired entries and caps the maintenance scan at 200", async () => {
    const { CacheManager } = await loadCacheModule();
    // Memory-only path: redis is NOT initialized so L2 cannot resurrect expired values
    const cache = new CacheManager({ redis: { host: "localhost", port: 6379, db: 0 }, tiers: [{ type: "memory", ttl: 60 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }], monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } } });

    for (let i = 0; i < 99; i++) {
      await cache.set("exp:" + i, i, 1);
    }
    vi.advanceTimersByTime(2000);

    // 100th set triggers the maintenance scan, which removes the 99 expired entries
    await cache.set("trigger100", "x", 60);

    // Grow the cache past the 200-entry scan cap (scan at set #300 will break at 200)
    for (let i = 100; i < 302; i++) {
      await cache.set("k:" + i, i, 60);
    }

    // Overwriting an existing key exercises the memory-cache delete-then-set path
    await cache.set("dup", 1, 60);
    await cache.set("dup", 2, 60);

    // Delete with no redis attached exercises the memory-only del path
    await cache.del("nope");

    await expect(cache.get("exp:0")).resolves.toBeNull();
    await expect(cache.get("trigger100")).resolves.toBe("x");
    await expect(cache.get("k:298")).resolves.toBe(298);
    await expect(cache.get("dup")).resolves.toBe(2);
  });
  it("reports zero metrics when no requests have been recorded", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({ redis: { host: "localhost", port: 6379, db: 0 }, tiers: [{ type: "memory", ttl: 60 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }], monitoring: { enabled: true, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } } });
    await cache.initialize();

    vi.advanceTimersByTime(1000);
    const m = cache.getMetrics();
    expect(m.hitRate).toBe(0);
    expect(m.missRate).toBe(0);
    expect(m.errorRate).toBe(0);
    expect(m.totalRequests).toBe(0);
  });
  it("survives a degenerate negative maxSize without crashing (eviction loop defensive break)", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({ redis: { host: "localhost", port: 6379, db: 0 }, tiers: [{ type: "memory", ttl: 60, maxSize: -1 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }], monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } } });

    // maxSize -1 keeps the cache permanently over budget: evictCount = size + 1,
    // so the loop drains the map and must stop via the `if (!oldestKey) break`
    // guard instead of throwing (regression coverage for manager.ts eviction).
    await cache.set("a", 1, 60);
    await cache.set("b", 2, 60);

    await expect(cache.get("a")).resolves.toBeNull();
    await expect(cache.get("b")).resolves.toBeNull();
  });
  it("treats maxSize 0 as unset (no eviction) — documents the falsy-maxSize quirk", async () => {
    const { CacheManager } = await loadCacheModule();
    const cache = new CacheManager({ redis: { host: "localhost", port: 6379, db: 0 }, tiers: [{ type: "memory", ttl: 60, maxSize: 0 }, { type: "redis", ttl: 60, keyPrefix: "compliance:" }], monitoring: { enabled: false, collectInterval: 1000, alertThresholds: { hitRate: 0, memoryUsage: 9999, errorRate: 1 } } });

    // `maxSize && size > maxSize` treats 0 as falsy, so a zero maxSize never
    // triggers eviction (it silently behaves like "unlimited").
    await cache.set("a", 1, 60);
    await cache.set("b", 2, 60);

    await expect(cache.get("a")).resolves.toBe(1);
    await expect(cache.get("b")).resolves.toBe(2);
  });
});
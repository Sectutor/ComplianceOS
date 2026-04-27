import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

describe("envValidation.validateEnv", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns errors when required env vars are missing", async () => {
    const { validateEnv } = await import("../envValidation");
    delete process.env.DATABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DATABASE_URL"),
        expect.stringContaining("SUPABASE_URL"),
        expect.stringContaining("SUPABASE_ANON_KEY"),
      ]),
    );
  });

  it("returns warnings for optional integrations not configured", async () => {
    const { validateEnv } = await import("../envValidation");
    process.env.DATABASE_URL = "postgres://example";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.FORGE_API_KEY;

    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("does not warn when optional integrations are configured", async () => {
    const { validateEnv } = await import("../envValidation");
    process.env.DATABASE_URL = "postgres://example";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
    process.env.FORGE_API_KEY = "forge_dummy";

    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});

describe("envValidation.logValidationResults", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("logs errors and warnings through the logger", async () => {
    const { logValidationResults } = await import("../envValidation");
    const { logger } = await import("../logger");

    logValidationResults({ valid: false, errors: ["e1"], warnings: ["w1"] });
    expect(logger.error).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("logs successful validation through the logger", async () => {
    const { logValidationResults } = await import("../envValidation");
    const { logger } = await import("../logger");

    logValidationResults({ valid: true, errors: [], warnings: [] });
    expect(logger.info).toHaveBeenCalled();
  });
});

describe("envValidation.healthCheck", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.DATABASE_URL = "postgres://example";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("reports healthy when database check succeeds and Stripe is not configured", async () => {
    vi.doMock("../../db", () => ({
      getDb: vi.fn(async () => ({ execute: vi.fn(async () => [{ ok: 1 }]) })),
    }));

    const { healthCheck } = await import("../envValidation");
    const result = await healthCheck();

    expect(result.status).toBe("healthy");
    expect(result.services.database).toBe(true);
  });

  it("reports unhealthy when database check fails", async () => {
    vi.doMock("../../db", () => ({
      getDb: vi.fn(async () => {
        throw new Error("db down");
      }),
    }));

    const { healthCheck } = await import("../envValidation");
    const result = await healthCheck();

    expect(result.status).toBe("unhealthy");
    expect(result.services.database).toBe(false);
  });

  it("reports unhealthy when getDb returns null", async () => {
    vi.doMock("../../db", () => ({
      getDb: vi.fn(async () => null),
    }));

    const { healthCheck } = await import("../envValidation");
    const result = await healthCheck();

    expect(result.status).toBe("unhealthy");
    expect(result.services.database).toBe(false);
  });

  it("reports degraded when database works but Stripe check fails", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

    vi.doMock("../../db", () => ({
      getDb: vi.fn(async () => ({ execute: vi.fn(async () => [{ ok: 1 }]) })),
    }));

    vi.doMock("stripe", () => ({
      default: class StripeMock {
        balance = { retrieve: vi.fn(async () => { throw new Error("stripe down"); }) };
        constructor() {}
      },
    }));

    const { healthCheck } = await import("../envValidation");
    const result = await healthCheck();

    expect(result.status).toBe("degraded");
    expect(result.services.database).toBe(true);
    expect(result.services.stripe).toBe(false);
  });

  it("reports healthy when database and Stripe checks succeed", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

    vi.doMock("../../db", () => ({
      getDb: vi.fn(async () => ({ execute: vi.fn(async () => [{ ok: 1 }]) })),
    }));

    vi.doMock("stripe", () => ({
      default: class StripeMock {
        balance = { retrieve: vi.fn(async () => ({ available: [] })) };
        constructor() {}
      },
    }));

    const { healthCheck } = await import("../envValidation");
    const result = await healthCheck();

    expect(result.status).toBe("healthy");
    expect(result.services.database).toBe(true);
    expect(result.services.stripe).toBe(true);
  });
});

describe("envValidation without process env", () => {
  it("returns valid results when process.env is unavailable", async () => {
    const g = globalThis as unknown as { process?: unknown };
    const savedProcess = g.process;
    g.process = undefined;

    try {
      vi.resetModules();
      const { validateEnv, healthCheck } = await import("../envValidation");
      expect(validateEnv()).toEqual({ valid: true, errors: [], warnings: [] });
      const hc = await healthCheck();
      expect(hc.status).toBe("healthy");
    } finally {
      g.process = savedProcess;
    }
  });
});

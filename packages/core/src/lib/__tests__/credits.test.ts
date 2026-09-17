import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * AI token credit system (lib/tokens/credits.ts) — unit tests.
 *
 * estimateTokenCost is fully pure and exercised without any mocks. The DB
 * operations are covered against a minimal chainable drizzle stub following
 * the established repo pattern (cf. vfsMemoryEngineDb.test.ts): ../../db is
 * replaced by a FIFO-stub getDb, ../../schema by placeholder tables, so no
 * database or environment is ever touched. addPurchasedTokens' pack
 * validation runs BEFORE any db access, which lets us prove the unknown-pack
 * rejection happens without touching the database at all.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: dbMocks.getDb }));

vi.mock("../../schema", () => ({
  clients: {
    id: "clients.id",
    tokenBalance: "clients.tokenBalance",
    tokenUsed: "clients.tokenUsed",
  },
  tokenTransactions: { clientId: "tokenTransactions.clientId" },
}));

import {
  addPurchasedTokens,
  consumeTokens,
  estimateTokenCost,
  getTokenBalance,
  hasSufficientTokens,
} from "../tokens/credits";

/** Minimal chainable drizzle stub with a FIFO of result sets. */
function makeDb(results: any[][] = []) {
  const queue = [...results];
  const take = () => (queue.length ? queue.shift() : []);
  const chain: any = {};
  for (const m of ["select", "from", "innerJoin", "on", "insert", "values", "update", "set", "delete"]) {
    chain[m] = vi.fn(() => chain);
  }
  const terminator = () => {
    const t: any = {};
    t.orderBy = vi.fn(() => Promise.resolve(take()));
    t.limit = vi.fn(() => Promise.resolve(take()));
    t.returning = vi.fn(() => Promise.resolve(take()));
    t.then = (resolve: any, reject: any) => Promise.resolve(take()).then(resolve, reject);
    return t;
  };
  chain.where = vi.fn(() => terminator());
  chain.orderBy = vi.fn(() => Promise.resolve(take()));
  chain.limit = vi.fn(() => Promise.resolve(take()));
  chain.returning = vi.fn(() => Promise.resolve(take()));
  chain.execute = vi.fn(async () => undefined);
  // consumeTokens runs its read-modify-write inside a transaction on the same chain
  chain.transaction = vi.fn(async (fn: (tx: any) => any) => fn(chain));
  return chain;
}

let currentDb: ReturnType<typeof makeDb>;
const insertedValues = () =>
  currentDb.values.mock.calls.map((args: any[]) => (Array.isArray(args[0]) ? args[0][0] : args[0]));
const updatedSets = () => currentDb.set.mock.calls.map((args: any[]) => args[0]);

beforeEach(() => {
  currentDb = makeDb();
  dbMocks.getDb.mockReset();
  dbMocks.getDb.mockImplementation(async () => currentDb);
});

describe("estimateTokenCost", () => {
  it("uses ~4 characters per token for an unknown model at simple complexity", () => {
    expect(estimateTokenCost("unknown-model", 400)).toBe(100);
    expect(estimateTokenCost("", 400)).toBe(100); // empty model -> default multiplier
  });

  it("rounds up partial tokens", () => {
    expect(estimateTokenCost("any", 401)).toBe(101);
    expect(estimateTokenCost("any", 7)).toBe(2);
    expect(estimateTokenCost("any", 1)).toBe(1);
  });

  it("applies the x2.5 multiplier for complex operations (with ceil)", () => {
    expect(estimateTokenCost("any", 8, "complex")).toBe(5); // ceil(2 * 2.5)
    expect(estimateTokenCost("any", 10, "complex")).toBe(8); // base ceils first: ceil(ceil(10/4) * 2.5) = ceil(7.5)
  });

  it.each([
    ["gpt-4", 8, 4], // x2.0 expensive model
    ["claude-3-opus", 8, 4], // x2.0
    ["deepseek-chat", 8, 1], // x0.5 cheap model
    ["qwen-72b", 8, 1], // x0.5
    ["llama-3", 8, 2], // x1.0 default
  ])("applies the model multiplier for %p", (model, chars, expected) => {
    expect(estimateTokenCost(model, chars)).toBe(expected);
  });

  it("matches model names as case-sensitive substrings (documents current behavior)", () => {
    expect(estimateTokenCost("gpt-4o-mini", 8)).toBe(4); // contains 'gpt-4'
    expect(estimateTokenCost("GPT-4-turbo", 8)).toBe(2); // uppercase NOT matched
    expect(estimateTokenCost("DeepSeek-V3", 8)).toBe(2); // mixed case NOT matched
    expect(estimateTokenCost("my-deepseek-x", 8)).toBe(1); // lowercase IS matched
  });

  it("combines complexity and model multipliers before the final ceil", () => {
    // base ceil(30/4)=8; 8 * 2.5 * 0.5 = 10
    expect(estimateTokenCost("deepseek-chat", 30, "complex")).toBe(10);
    // base ceil(6/4)=2; 2 * 2.5 * 2.0 = 10
    expect(estimateTokenCost("gpt-4", 6, "complex")).toBe(10);
  });

  it("costs nothing for empty input and never costs less with more input", () => {
    expect(estimateTokenCost("any", 0)).toBe(0);
    let previous = 0;
    for (const chars of [1, 50, 400, 401, 2000, 8000]) {
      const cost = estimateTokenCost("any", chars);
      expect(cost).toBeGreaterThanOrEqual(previous);
      previous = cost;
    }
  });

  it("is deterministic for repeated identical calls", () => {
    const a = estimateTokenCost("gpt-4", 123, "complex");
    const b = estimateTokenCost("gpt-4", 123, "complex");
    expect(a).toBe(b);
  });

  it("never throws on malformed numeric input (returns NaN/negative as-is)", () => {
    expect(() => estimateTokenCost("any", NaN)).not.toThrow();
    expect(estimateTokenCost("any", NaN)).toBeNaN(); // Math.ceil(NaN) propagates
    expect(() => estimateTokenCost("any", -8)).not.toThrow();
    expect(estimateTokenCost("any", -8)).toBe(-2); // documented current behavior
  });
});

describe("getTokenBalance", () => {
  it("returns zero balance/used when the client row is missing (zero state)", async () => {
    currentDb = makeDb([[]]);
    await expect(getTokenBalance(7)).resolves.toEqual({ balance: 0, used: 0 });
  });

  it("returns the stored balance and used counters", async () => {
    currentDb = makeDb([[{ balance: 4200, used: 800 }]]);
    await expect(getTokenBalance(7)).resolves.toEqual({ balance: 4200, used: 800 });
  });
});

describe("hasSufficientTokens", () => {
  it("is true when balance equals cost (inclusive boundary)", async () => {
    currentDb = makeDb([[{ balance: 50, used: 0 }]]);
    await expect(hasSufficientTokens(7, 50)).resolves.toBe(true);
  });

  it("is false when balance is below the cost", async () => {
    currentDb = makeDb([[{ balance: 49, used: 0 }]]);
    await expect(hasSufficientTokens(7, 50)).resolves.toBe(false);
  });
});

describe("consumeTokens", () => {
  it("rejects without updating anything when the balance is insufficient", async () => {
    currentDb = makeDb([[{ balance: 10, used: 5 }]]);
    await expect(consumeTokens(7, 25)).rejects.toThrow(
      "Insufficient tokens. Have 10, need 25",
    );
    expect(updatedSets()).toHaveLength(0);
    expect(insertedValues()).toHaveLength(0);
  });

  it("deducts the cost, bumps the used counter and records a consumption transaction", async () => {
    currentDb = makeDb([[{ balance: 100, used: 20 }]]);
    await expect(consumeTokens(7, 30)).resolves.toEqual({ remaining: 70 });
    expect(updatedSets()[0]).toEqual({ tokenBalance: 70, tokenUsed: 50 });
    expect(insertedValues()[0]).toMatchObject({
      clientId: 7,
      amount: -30,
      type: "consumption",
      description: "AI API call",
    });
  });

  it("honours a custom description on the recorded transaction", async () => {
    currentDb = makeDb([[{ balance: 100, used: 0 }]]);
    await consumeTokens(7, 5, "quarterly report generation");
    expect(insertedValues()[0].description).toBe("quarterly report generation");
  });
});

describe("addPurchasedTokens", () => {
  it("rejects unknown pack names BEFORE touching the database", async () => {
    const getDbCallsBefore = dbMocks.getDb.mock.invocationCallOrder.length;
    await expect(addPurchasedTokens(7, "mega_pack")).rejects.toThrow(
      /Unknown token pack: mega_pack\. Available: starter_pack, pro_pack, enterprise_pack/,
    );
    expect(dbMocks.getDb.mock.invocationCallOrder.length).toBe(getDbCallsBefore);
    expect(updatedSets()).toHaveLength(0);
  });

  it("credits the pack size onto the existing balance and records a purchase", async () => {
    currentDb = makeDb([[{ balance: 5000 }]]);
    await expect(addPurchasedTokens(7, "pro_pack")).resolves.toEqual({
      added: 250000,
      balance: 255000,
    });
    expect(updatedSets()[0]).toEqual({ tokenBalance: 255000 });
    expect(insertedValues()[0]).toMatchObject({
      clientId: 7,
      amount: 250000,
      type: "purchase",
    });
    expect(String(insertedValues()[0].description)).toContain("$39");
  });

  it("treats a missing client row as a zero starting balance", async () => {
    currentDb = makeDb([[]]);
    await expect(addPurchasedTokens(7, "starter_pack")).resolves.toEqual({
      added: 50000,
      balance: 50000,
    });
  });
});

/**
 * Regression tests for getDb() — the boot-time failure path.
 *
 * Historical bug: when Postgres was unreachable, a race between concurrent
 * getDb() callers published a drizzle instance over a pool whose connection
 * test had failed, and the fallback was only assigned AFTER an
 * `await _sql.end()` that could hang forever in postgres.js. Every
 * DB-touching request — including POST /api/auth/local-login — then hung with
 * no response and no error after every server restart.
 *
 * These tests simulate a dead pool whose end() never settles and assert that
 * getDb() still resolves into a usable fallback quickly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('postgres', () => {
  const mkDeadPool = () => {
    const fn: any = () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:59999'));
    // The original hang: postgres.js end() can never settle with in-flight
    // connection attempts. getDb() must not wait on it.
    fn.end = vi.fn(() => new Promise(() => { }));
    fn.options = { parsers: {}, serializers: {} };
    return fn;
  };
  return { default: vi.fn(() => mkDeadPool()) };
});

async function freshDbModule() {
  vi.resetModules();
  return await import('../packages/core/src/db');
}

beforeEach(() => {
  // Truthy URL forces the real-path init (which must fail and fall back);
  // an empty URL would take the trivial no-URL fallback branch.
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:59999/postgres';
});

describe('getDb resilience when Postgres is unreachable', () => {
  it('resolves into a usable fallback instead of hanging when end() never settles', async () => {
    const dbModule = await freshDbModule();

    const db = await Promise.race([
      dbModule.getDb(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('getDb() hung — regression of the boot-time DB race')), 5000)),
    ]);

    expect(db).toBeTruthy();
    expect(typeof (db as any).select).toBe('function');
    expect(typeof (db as any).execute).toBe('function');
    // The fallback must not be a thenable, or `await getDb()` adopts a broken
    // `then` and hangs every caller.
    expect((db as any).then).toBeUndefined();
  });

  it('serves concurrent callers the same fallback instance without blocking', async () => {
    const dbModule = await freshDbModule();

    const [a, b, c] = await Promise.race([
      Promise.all([dbModule.getDb(), dbModule.getDb(), dbModule.getDb()]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('concurrent getDb() hung — init not memoized')), 5000)),
    ]);

    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('query builders on the fallback resolve with demo data', async () => {
    const dbModule = await freshDbModule();
    const db: any = await dbModule.getDb();

    const rows = await db.select().from('clients');
    expect(Array.isArray(rows)).toBe(true);

    const found = await db.query.users.findFirst({ where: { id: 1 } });
    expect(found).toBeTruthy();
  });
});

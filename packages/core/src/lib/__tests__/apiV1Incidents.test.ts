// cycle-39 GAP-18 spec — endpoints land in parallel
//
// The backend agent is adding GET /api/v1/incidents and GET /api/v1/incidents/:id
// to packages/core/src/server/routers/api-v1.ts WHILE these tests are authored.
// This file encodes the agreed REST contract; until the endpoints land the file
// is expected RED, and it must go GREEN once they merge. Contract under test:
//
//   GET /api/v1/incidents
//     - optional query: clientId(int) · status(open|investigating|mitigated|
//       resolved|reported) · severity(low|medium|high|critical) ·
//       limit(default 100, max 200 — bounded read)
//     - invalid values            -> 400 { code: 'BAD_REQUEST' }
//     - success                   -> { data, total } ordered detectedAt desc
//
//   GET /api/v1/incidents/:id
//     - non-numeric id            -> 400 { code: 'BAD_REQUEST' }
//     - unknown id                -> 404 { code: 'NOT_FOUND' }
//     - found                     -> 200 bare incident row JSON
//     - DB throw                  -> 500 { code: 'INTERNAL_ERROR' } (both routes)
//
// Harness notes:
//   - package.json has NO supertest devDependency (checked), so the exported
//     `apiV1Router` express Router is mounted on a throwaway app and driven
//     over real HTTP via node:http — no new dependencies.
//   - `../../db` is mocked (the module path api-v1.ts imports getDb from).
//     A tiny drizzle-condition walker (eq/inArray/and over queryChunks) lets
//     the fake actually EVALUATE where/orderBy/limit so filter branches are
//     behavioural, not just "db was called".
//   - The API-key middleware snapshots process.env.COMPLIANCE_API_KEY at module
//     load; the root vitest setup loads .env (which QA must not read), so we
//     force dev-mode open access BEFORE dynamically importing the router.

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import express from "express";
import http from "http";
import type { AddressInfo } from "net";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  onboardClient: vi.fn(),
}));

vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
  onboardClient: dbMocks.onboardClient,
}));

/** Dev mode (no key configured) => middleware passes everyone through. */
process.env.COMPLIANCE_API_KEY = "";

/** Generous budget: OneDrive-synced tree can be slow under parallel load. */
vi.setConfig({ testTimeout: 60_000 });

const { apiV1Router } = await import("../../server/routers/api-v1");

// ── Tiny drizzle condition walker ────────────────────────────────────────────

type Row = Record<string, any>;

function isSqlLike(n: any): boolean {
  return !!n && typeof n === "object" && Array.isArray(n.queryChunks);
}

/**
 * Flatten a drizzle SQL fragment into ordered tokens:
 *   { k:'col', name } for Column chunks (duck-typed: string `.name`, no value)
 *   { k:'val', v }    for Param chunks (`{ value }`)
 *   { k:'str', s }    for raw SQL text (operators like ` = `, ` and `, ` desc`)
 */
function walkTokens(node: any, out: any[] = []): any[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => walkTokens(n, out));
    return out;
  }
  if (isSqlLike(node)) {
    node.queryChunks.forEach((c: any) => walkTokens(c, out));
    return out;
  }
  if (typeof node.name === "string" && !("value" in node)) {
    out.push({ k: "col", name: node.name });
    return out;
  }
  if ("value" in node) {
    // drizzle StringChunk: { value: string[] } -> raw SQL text (operators
    // like ` = `, ` and `, ` desc`). Params carry a scalar .value.
    if (Array.isArray(node.value)) {
      out.push({ k: "str", s: node.value.join("") });
    } else {
      out.push({ k: "val", v: node.value });
    }
    return out;
  }
  if (typeof node.getSQL === "function") {
    return walkTokens(node.getSQL(), out);
  }
  return out;
}

/** Split a token stream into AND/OR segments at top-level operator keywords. */
function segments(tokens: any[]): any[][] {
  const segs: any[][] = [[]];
  for (const tok of tokens) {
    if (tok.k === "str" && /^\s*(and|or)\s*$/i.test(tok.s)) {
      segs.push([]);
      continue;
    }
    segs[segs.length - 1].push(tok);
  }
  return segs.filter((s) => s.length > 0);
}

/** Resolve a row value by drizzle DB column name, tolerating the camelCase
 *  JS keys used in fixtures (client_id -> clientId). */
function rowValue(row: Row, name: string): any {
  if (name in row) return row[name];
  const camel = name.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
  return row[camel];
}

/** Evaluate one eq-style segment (1 column + 1 value, or column IN list). */
function evalSegment(seg: any[], row: Row): boolean {
  // Drop operator strings (` = `) -- only cols and vals decide equality.
  const cols = seg.filter((t) => t.k === "col").map((t) => t.name as string);
  const vals = seg.filter((t) => t.k === "val").map((t) => t.v);
  // Unrecognizable shape (raw SQL etc.) — pass through rather than fail.
  if (cols.length !== 1 || vals.length === 0) return true;
  const col = cols[0];
  if (vals.length > 1) return vals.some((v) => rowValue(row, col) === v); // inArray
  const v = vals[0];
  if (v === null || v === undefined) return rowValue(row, col) == null;
  return rowValue(row, col) === v || String(rowValue(row, col)) === String(v);
}

function evalWhere(cond: any, row: Row): boolean {
  if (!cond) return true;
  return segments(walkTokens(cond)).every((seg) => evalSegment(seg, row));
}

/** Extract [{ col, desc }] from orderBy expressions (desc(x) → '… desc'). */
function orderSpecs(exprs: any[]): { col: string; desc: boolean }[] {
  return exprs.map((e) => {
    const tokens = walkTokens(e);
    return {
      col: tokens.find((t) => t.k === "col")?.name ?? "",
      desc: tokens.some((t) => t.k === "str" && /desc/i.test(t.s)),
    };
  });
}

/**
 * Fake connection serving a fixed `incidents` dataset through the real chain
 * shape used by api-v1 handlers: select([...]).from(incidents)
 *   [.where(cond)][.orderBy(...)][.limit(n)]  → rows
 * Also tolerates a separate COUNT select (object-shaped columns arg) by
 * returning common count aliases of the filtered length.
 */
function mockIncidentsDb(rows: Row[], opts: { reject?: boolean } = {}) {
  let selectCalls = 0;

  async function run(s: any): Promise<any> {
    if (opts.reject) throw new Error("database exploded");
    let out = rows.filter((r) => evalWhere(s._cond, r));
    const specs = orderSpecs(s._order ?? []);
    if (specs.length) {
      out = [...out].sort((a, b) => {
        for (const { col, desc } of specs) {
          const rawA = rowValue(a, col);
          const rawB = rowValue(b, col);
          const av = rawA instanceof Date ? rawA.getTime() : rawA;
          const bv = rawB instanceof Date ? rawB.getTime() : rawB;
          if (av === bv) continue;
          const cmp = av > bv ? 1 : -1;
          return desc ? -cmp : cmp;
        }
        return 0;
      });
    }
    if (s._countMode) return { count: out.length, total: out.length, value: out.length };
    if (typeof s._limit === "number") out = out.slice(0, s._limit);
    return out;
  }

  function makeSelect(colsArg?: any): any {
    const s: any = {
      _countMode:
        !!colsArg &&
        typeof colsArg === "object" &&
        !Array.isArray(colsArg),
      _cond: null,
      _order: [] as any[],
      _limit: null as number | null,
    };
    s.from = () => s;
    s.where = (cond: any) => ((s._cond = cond), s);
    s.orderBy = (...exprs: any[]) => ((s._order = exprs), s);
    s.limit = (n: number) => ((s._limit = n), s);
    s.offset = () => s;
    s.leftJoin = s.innerJoin = s.rightJoin = () => s;
    s.groupBy = () => s;
    s.then = (resolve: any, reject: any) => run(s).then(resolve, reject);
    return s;
  }

  const db: any = {
    select: (colsArg?: any) => {
      selectCalls++;
      return makeSelect(colsArg);
    },
    insert: () => ({ values: async () => [] }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
    delete: () => ({ where: async () => {} }),
    execute: async () => ({ rows: [] }),
  };
  dbMocks.getDb.mockReset();
  dbMocks.getDb.mockResolvedValue(db);
  return db;
}

// ── HTTP harness over the real stacked Router ────────────────────────────────

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", apiV1Router);
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://${addr.address}:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function req(
  method: "GET",
  path: string
): Promise<{ status: number; body: any }> {
  // node:http directly — the happy-dom environment replaces global fetch with
  // a CORS-enforcing browser shim that refuses localhost cross-origin calls.
  return new Promise((resolve, reject) => {
    const r = http.request(
      `${baseUrl}${path}`,
      { method },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let body: any = null;
          try {
            body = JSON.parse(raw);
          } catch {
            body = raw;
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    r.on("error", reject);
    r.end();
  });
}

// ── Fixtures (detectedAt deliberately shuffled; sorting is the endpoint's job
//    via its orderBy(desc(detectedAt)) which our fake evaluates) ──────────────

const ROWS: Row[] = [
  { id: 3, clientId: 7, title: "Old phishing", detectedAt: "2026-08-01T10:00:00.000Z", status: "resolved", severity: "low" },
  { id: 1, clientId: 7, title: "Ransomware on file server", detectedAt: "2026-08-20T09:00:00.000Z", status: "open", severity: "critical" },
  { id: 4, clientId: 8, title: "Other client breach", detectedAt: "2026-08-19T09:00:00.000Z", status: "open", severity: "high" },
  { id: 2, clientId: 7, title: "Credential stuffing", detectedAt: "2026-08-15T12:30:00.000Z", status: "investigating", severity: "medium" },
];

beforeEach(() => {
  mockIncidentsDb(ROWS.map((r) => ({ ...r })));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── List happy path & ordering ───────────────────────────────────────────────

describe("GET /api/v1/incidents — happy path", () => {
  it("returns { data, total } ordered detectedAt descending", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents");

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(body.total).toBe(4);
    expect(body.data.map((r: Row) => r.id)).toEqual([1, 4, 2, 3]); // desc by detectedAt
    expect(body.data[0]).toMatchObject({ id: 1, title: "Ransomware on file server" });
  });

  it("returns an empty result set without error when no incidents exist", async () => {
    mockIncidentsDb([]);
    const { status, body } = await req("GET", "/api/v1/incidents");
    expect(status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});

// ── Filter branches ──────────────────────────────────────────────────────────

describe("GET /api/v1/incidents — filters", () => {
  it("filters by clientId", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?clientId=7");
    expect(status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.data.every((r: Row) => r.clientId === 7)).toBe(true);
    expect(body.data.map((r: Row) => r.id)).toEqual([1, 2, 3]);
  });

  it("filters by status", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?status=open");
    expect(status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.data.every((r: Row) => r.status === "open")).toBe(true);
  });

  it("filters by severity", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?severity=critical");
    expect(status).toBe(200);
    expect(body.data.map((r: Row) => r.id)).toEqual([1]);
    expect(body.data[0].severity).toBe("critical");
  });

  it("combines multiple filters conjunctively", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?clientId=7&status=investigating");
    expect(status).toBe(200);
    expect(body.data.map((r: Row) => r.id)).toEqual([2]);
    expect(body.total).toBe(1);
  });

  it("accepts every documented enum member for status and severity", async () => {
    for (const s of ["open", "investigating", "mitigated", "resolved", "reported"]) {
      const { status } = await req("GET", `/api/v1/incidents?status=${s}`);
      expect(status, `status=${s}`).toBe(200);
    }
    for (const s of ["low", "medium", "high", "critical"]) {
      const { status } = await req("GET", `/api/v1/incidents?severity=${s}`);
      expect(status, `severity=${s}`).toBe(200);
    }
  });
});

// ── Validation edges ─────────────────────────────────────────────────────────

describe("GET /api/v1/incidents — validation (400 BAD_REQUEST)", () => {
  it("rejects an invalid status enum value", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?status=pwned");
    expect(status).toBe(400);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("rejects an invalid severity enum value", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?severity=apocalyptic");
    expect(status).toBe(400);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("rejects a non-numeric clientId", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?clientId=seven");
    expect(status).toBe(400);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("rejects a non-numeric limit", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?limit=lots");
    expect(status).toBe(400);
    expect(body.code).toBe("BAD_REQUEST");
  });
});

// ── Limit semantics ──────────────────────────────────────────────────────────

describe("GET /api/v1/incidents — limit handling", () => {
  it("defaults to 100 rows when no limit is supplied", async () => {
    mockIncidentsDb(Array.from({ length: 150 }, (_, i) => ({ id: i + 1, clientId: 7, title: `i${i}`, detectedAt: new Date(Date.now() + i).toISOString(), status: "open", severity: "low" })));
    const { status, body } = await req("GET", "/api/v1/incidents");
    expect(status).toBe(200);
    expect(body.data).toHaveLength(100);
  });

  it("clamps limit above the 200 maximum", async () => {
    mockIncidentsDb(Array.from({ length: 600 }, (_, i) => ({ id: i + 1, clientId: 7, title: `i${i}`, detectedAt: new Date(Date.now() + i).toISOString(), status: "open", severity: "low" })));
    const { status, body } = await req("GET", "/api/v1/incidents?limit=5000");
    expect(status).toBe(200);
    expect(body.data).toHaveLength(200);
    expect(Number.isInteger(body.total)).toBe(true);
  });

  it("honours a valid custom limit below the cap", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents?limit=2");
    expect(status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.map((r: Row) => r.id)).toEqual([1, 4]); // still desc order
  });
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /api/v1/incidents/:id", () => {
  it("returns the bare incident row JSON for a known id", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents/2");
    expect(status).toBe(200);
    expect(body).toEqual({
      id: 2,
      clientId: 7,
      title: "Credential stuffing",
      detectedAt: "2026-08-15T12:30:00.000Z",
      status: "investigating",
      severity: "medium",
    });
  });

  it("returns 400 BAD_REQUEST for a NaN id", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents/not-a-number");
    expect(status).toBe(400);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 404 NOT_FOUND for an id that does not exist", async () => {
    const { status, body } = await req("GET", "/api/v1/incidents/99999");
    expect(status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });
});

// ── Failure paths ────────────────────────────────────────────────────────────

describe("incident endpoints — DB failure surfaces INTERNAL_ERROR", () => {
  it("list maps a DB throw to 500 { code: 'INTERNAL_ERROR' }", async () => {
    mockIncidentsDb([], { reject: true });
    const { status, body } = await req("GET", "/api/v1/incidents");
    expect(status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it(":id maps a DB throw to 500 { code: 'INTERNAL_ERROR' }", async () => {
    mockIncidentsDb([], { reject: true });
    const { status, body } = await req("GET", "/api/v1/incidents/1");
    expect(status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});

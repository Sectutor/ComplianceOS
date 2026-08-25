import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * OSCAL import/validation engine (lib/federal/oscalImport.ts) — QA cycle 41,
 * GAP-19. Pure deterministic engine contract:
 *
 *   validateOscalDocument(input)  -> { valid, errors[], warnings[] }
 *   normalizeOscalDocument(input) -> { ok:true, document } | { ok:false, errors }
 *
 * House rules asserted here: stable kebab-case issue codes
 * (not-an-object / missing-field / invalid-uuid / invalid-date /
 * invalid-type / unsupported-oscal-type / size-exceeded), NEVER throws on any
 * input (nulls, primitives, arrays, hostile getters), deterministic output,
 * injected size cap for the size-exceeded guard, controls deduped LAST-WINS
 * and sorted controlId asc (tie-break source uuid asc). A static source scan
 * proves the engine stays DB-free (pure passthrough surface for importOscal).
 */

import {
  validateOscalDocument,
  normalizeOscalDocument,
  detectOscalDocType,
  OSCAL_MAX_SERIALIZED_LENGTH,
} from "../federal/oscalImport";

/**
 * Cycle-43 namespace handle. `oscalUuidFromSeed` lands with the concurrent
 * backend drop, so it is read OFF THE NAMESPACE (never a named import): a
 * missing export then only reddens the individual gates below instead of
 * failing module evaluation for this entire file.
 */
import * as OscalEngine from "../federal/oscalImport";

const UUID = (n: number) =>
  `${String(n).repeat(8)}-${String(n).repeat(4)}-${String(n).repeat(4)}-${String(n).repeat(4)}-${String(n).repeat(12)}`;

/** Minimal valid envelope for a given docType (+ optional extras). */
function validDoc(docType: string, extra: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    oscalVersion: "1.1.2",
    uuid: UUID(1),
    metadata: { title: "T", lastModified: "2026-08-24T12:00:00.000Z", version: "1" },
    ...extra,
  };
  switch (docType) {
    case "assessment-results":
      return { ...base, results: [{ uuid: UUID(2), controlId: "ac-2", result: "pass", title: "AC-2 ok" }] };
    case "component-definition":
      return {
        ...base,
        components: [
          {
            uuid: UUID(3),
            title: "C",
            controlImplementations: [
              { uuid: UUID(4), implementedRequirements: [{ uuid: UUID(5), controlId: "cm-2", statement: "s" }] },
            ],
          },
        ],
      };
    case "plan":
      return { ...base, assessmentActivities: [{ controlId: "ca-2", statement: "plan s", status: "planned" }] };
    case "system-security-plan":
      return { ...base, systemCharacteristics: {}, controls: [{ controlId: "ac-2", statement: "s", status: "implemented" }] };
    case "poam":
      return { ...base, tasks: [{ uuid: UUID(6), controlId: "ac-2", title: "fix", status: "open" }] };
    default:
      throw new Error(`unknown docType ${docType}`);
  }
}

const codes = (r: { errors: { code: string }[] }) => r.errors.map((e) => e.code);

describe("oscalImport — docType detection", () => {
  it("detects all five supported models structurally", () => {
    expect(detectOscalDocType(validDoc("assessment-results"))).toBe("assessment-results");
    expect(detectOscalDocType(validDoc("component-definition"))).toBe("component-definition");
    expect(detectOscalDocType(validDoc("plan"))).toBe("plan");
    expect(detectOscalDocType(validDoc("system-security-plan"))).toBe("system-security-plan");
    expect(detectOscalDocType(validDoc("poam"))).toBe("poam");
  });

  it("honors explicit metadata.oscalModel aliases before sniffing; unknown marker -> unsupported", () => {
    const wrap = (model: string, body: Record<string, unknown>) => ({
      ...body,
      metadata: { ...((body.metadata as Record<string, unknown>) ?? {}), oscalModel: model },
    });
    // 'poa&m' alias wins even though structural keys would say something else first
    expect(
      detectOscalDocType(wrap("poa&m", validDoc("assessment-results") as Record<string, unknown>))
    ).toBe("poam");
    expect(
      detectOscalDocType(wrap("ssp", validDoc("assessment-results") as Record<string, unknown>))
    ).toBe("system-security-plan");
    expect(detectOscalDocType(wrap("not-a-model", { results: [] }))).toBe("unsupported");
    expect(detectOscalDocType(wrap("ASSESSMENT-RESULTS", { results: [] }))).toBe("assessment-results"); // trimmed/lowercased
  });

  it("non-object input is unsupported", () => {
    expect(detectOscalDocType(null)).toBe("unsupported");
    expect(detectOscalDocType(42)).toBe("unsupported");
    expect(detectOscalDocType([{}])).toBe("unsupported");
  });
});

describe("oscalImport — validation happy paths", () => {
  for (const t of ["assessment-results", "component-definition", "plan", "system-security-plan", "poam"]) {
    it(`validates a minimal ${t} document`, () => {
      const r = validateOscalDocument(validDoc(t));
      expect(r.valid).toBe(true);
      expect(r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    });
  }

  it("accepts root-level version fallback when metadata.version absent", () => {
    const d = validDoc("poam") as Record<string, unknown>;
    (d.metadata as Record<string, unknown>) = { title: "T", lastModified: "2026-08-24T12:00:00.000Z" };
    d.version = "9";
    const r = validateOscalDocument(d);
    expect(r.errors).toEqual([]);
  });

  it("tolerates space-separated datetimes and Date instances for lastModified", () => {
    const d = validDoc("plan") as Record<string, unknown>;
    (d.metadata as Record<string, unknown>).lastModified = "2026-08-24 12:00:00";
    expect(validateOscalDocument(d).valid).toBe(true);

    const d2 = validDoc("plan") as Record<string, unknown>;
    (d2.metadata as Record<string, unknown>).lastModified = new Date("2026-01-02T03:04:05Z");
    expect(validateOscalDocument(d2).valid).toBe(true);
  });

  it("empty required collection is a WARNING (empty-collection), not an error", () => {
    const r = validateOscalDocument({ ...validDoc("poam"), tasks: [] });
    expect(r.valid).toBe(true);
    expect(r.warnings.map((w) => w.code)).toEqual(["empty-collection"]);
    expect(r.warnings[0].path).toBe("tasks");
  });
});

describe("oscalImport — error-code boundaries", () => {
  it("not-an-object for every primitive/array/null input", () => {
    for (const bad of [null, undefined, 0, 3.14, "", "doc", true, false, [], [{}]]) {
      const r = validateOscalDocument(bad);
      expect(r.valid).toBe(false);
      expect(codes(r)).toEqual(["not-an-object"]);
    }
  });

  it("unsupported-oscal-type for objects without any model signal", () => {
    expect(codes(validateOscalDocument({}))).toEqual(["unsupported-oscal-type"]);
    expect(codes(validateOscalDocument({ foo: 1 }))).toEqual(["unsupported-oscal-type"]);
  });

  it("missing-field fires for each required envelope member (and names its path)", () => {
    const strip = (key: string, path?: string) => {
      const d: Record<string, unknown> = { ...validDoc("assessment-results") };
      if (!path) delete d[key];
      else {
        const parts = path.split(".");
        const host = d[parts[0]] as Record<string, unknown>;
        delete host[parts[1]];
      }
      return d;
    };

    expect(codes(validateOscalDocument(strip("oscalVersion")))).toContain("missing-field");
    expect(codes(validateOscalDocument(strip("uuid")))).toContain("missing-field");
    expect(codes(validateOscalDocument(strip("metadata")))).toContain("missing-field");
    const noTitle = validateOscalDocument(strip("title", "metadata.title"));
    expect(noTitle.errors.find((e) => e.path === "metadata.title")?.code).toBe("missing-field");
    const noLastMod = validateOscalDocument(strip("lastModified", "metadata.lastModified"));
    expect(noLastMod.errors.find((e) => e.path === "metadata.lastModified")?.code).toBe("missing-field");

    const d = validDoc("assessment-results") as Record<string, unknown>;
    delete (d.metadata as Record<string, unknown>).version;
    const noVersion = validateOscalDocument(d);
    expect(noVersion.errors.find((e) => e.path === "metadata.version")?.code).toBe("missing-field");

    // NOTE: for most docTypes the required collection is also the type signal
    // (removing `results` re-detects the doc as unsupported) — assert against
    // system-security-plan, whose systemCharacteristics keeps the docType
    // stable while `controls` goes missing.
    const noControls = validDoc("system-security-plan") as Record<string, unknown>;
    delete noControls.controls;
    const r = validateOscalDocument(noControls);
    expect(r.errors.find((e) => e.code === "missing-field" && e.path === "controls")).toBeTruthy();
  });

  it("invalid-type vs invalid-uuid vs invalid-date boundaries", () => {
    let d = validDoc("poam") as Record<string, unknown>;
    d.uuid = 12345;
    expect(codes(validateOscalDocument(d))).toContain("invalid-type");

    d = validDoc("poam") as Record<string, unknown>;
    d.uuid = "not-a-uuid";
    expect(codes(validateOscalDocument(d))).toContain("invalid-uuid");

    d = validDoc("poam") as Record<string, unknown>;
    (d.metadata as Record<string, unknown>).lastModified = "24/08/2026";
    expect(codes(validateOscalDocument(d))).toContain("invalid-date");

    d = validDoc("poam") as Record<string, unknown>;
    (d.metadata as Record<string, unknown>).lastModified = "2026-13-45T99:00:00Z"; // regex+parse both fail
    expect(codes(validateOscalDocument(d))).toContain("invalid-date");

    d = validDoc("poam") as Record<string, unknown>;
    (d.metadata as Record<string, unknown>).lastModified = 42;
    expect(codes(validateOscalDocument(d))).toContain("invalid-type");

    d = validDoc("poam") as Record<string, unknown>;
    d.tasks = "nope";
    const typed = validateOscalDocument(d);
    expect(typed.errors.find((e) => e.code === "invalid-type" && e.path === "tasks")).toBeTruthy();

    d = validDoc("plan") as Record<string, unknown>;
    (d.metadata as Record<string, unknown>).title = ["array", "title"];
    expect(codes(validateOscalDocument(d))).toContain("invalid-type");
  });

  it("size-exceeded honors the default 5MB cap and an injected smaller cap", () => {
    expect(OSCAL_MAX_SERIALIZED_LENGTH).toBe(5_000_000);
    const big = validDoc("poam") as Record<string, unknown>;
    big.tasks = [{ controlId: "ac-2", note: "x".repeat(50_000) }];
    const r = validateOscalDocument(big, { maxSerializedLength: 1000 });
    expect(r.valid).toBe(false);
    expect(codes(r)).toEqual(["size-exceeded"]);
    // same document under the default cap passes structure (may still be valid)
    expect(validateOscalDocument(big).errors.filter((e) => e.code === "size-exceeded")).toHaveLength(0);
  });

  it("every issued code is kebab-case lowercase", () => {
    const d = { uuid: "bad", metadata: { lastModified: 7 }, results: 9 } as Record<string, unknown>;
    const r = validateOscalDocument(d);
    for (const e of [...r.errors, ...r.warnings]) {
      expect(e.code).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(typeof e.path).toBe("string");
      expect(typeof e.message).toBe("string");
    }
  });
});

describe("oscalImport — never throws on hostile input", () => {
  it("survives hostile getters, deep nesting, Dates, symbols and circular-ish structures", () => {
    const hostile = {
      get results() {
        throw new Error("boom");
      },
      metadata: {
        get title() {
          throw new Error("boom-title");
        },
      },
    };
    expect(() => validateOscalDocument(hostile)).not.toThrow();
    expect(() => normalizeOscalDocument(hostile)).not.toThrow();
    expect(validateOscalDocument(hostile).valid).toBe(false);
    // Cycle 43 (C4): a throwing getter makes JSON.stringify refuse, which now
    // fails CLOSED as a single unserializable-document issue (was: the gate
    // silently skipped, detection fell through to unsupported-oscal-type).
    expect(codes(validateOscalDocument(hostile))).toEqual(["unserializable-document"]);

    const sym = { metadata: {}, results: Symbol("x") };
    expect(() => validateOscalDocument(sym)).not.toThrow();
    expect(validateOscalDocument(sym).valid).toBe(false);
    // Symbol-valued members are SKIPPED by JSON.stringify (not an error), so
    // they must NOT trip the unserializable gate — plain structural failure.
    expect(codes(validateOscalDocument(sym))).not.toContain("unserializable-document");

    const deep: Record<string, unknown> = { a: null };
    deep.self = deep; // JSON.stringify throws on circularity -> C4 fail-closed
    expect(() => validateOscalDocument(deep)).not.toThrow();
    expect(() => normalizeOscalDocument(deep)).not.toThrow();
    const vd = validateOscalDocument(deep);
    expect(vd.valid).toBe(false);
    expect(codes(vd)).toEqual(["unserializable-document"]);
    const nd = normalizeOscalDocument(deep);
    expect(nd.ok).toBe(false);
    if (!nd.ok) expect(nd.errors).toEqual(vd.errors); // exact issue agreement

    expect(() => normalizeOscalDocument(null)).not.toThrow();
    expect(normalizeOscalDocument(null)).toMatchObject({ ok: false });
  });
});

describe("oscalImport — normalization", () => {
  it("produces the canonical shape for an SSP (controls sorted by controlId)", () => {
    const d = validDoc("system-security-plan") as Record<string, unknown>;
    d.controls = [
      { controlId: "cm-2", statement: "B" },
      { controlId: "ac-2", description: "A", status: "implemented" },
      { controlId: "au-6", status: "partial" },
    ];
    const n = normalizeOscalDocument(d);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.document.controls?.map((c) => c.controlId)).toEqual(["ac-2", "au-6", "cm-2"]);
    expect(n.document.controls?.[0]).toMatchObject({ controlId: "ac-2", description: "A", status: "implemented" });
    expect(n.document.lastModified).toBe("2026-08-24T12:00:00.000Z");
  });

  it("dedupes identical controlIds LAST-WINS, tie-breaking sort by source uuid", () => {
    const d = validDoc("system-security-plan") as Record<string, unknown>;
    d.controls = [
      { controlId: "ac-2", statement: "first", uuid: UUID(7) },
      { controlId: "ac-2", statement: "second", uuid: UUID(8) },
    ];
    const n = normalizeOscalDocument(d);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.document.controls).toHaveLength(1);
    expect(n.document.controls?.[0].statement).toBe("second");
  });

  it("extracts findings only for assessment-results, sorted controlId asc then uuid asc", () => {
    const d = validDoc("assessment-results") as Record<string, unknown>;
    d.results = [
      { uuid: UUID(9), controlId: "cm-2", result: "fail", title: "CM-2 gap" },
      { uuid: UUID(2), controlId: "ac-2", result: "pass", title: "AC-2 ok" },
    ];
    const n = normalizeOscalDocument(d);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.document.findings?.map((f) => f.controlId)).toEqual(["ac-2", "cm-2"]);
    expect(n.document.controls?.map((c) => c.controlId)).toEqual(["ac-2", "cm-2"]); // results double as control refs

    const other = normalizeOscalDocument(validDoc("poam"));
    expect(other.ok && other.document.findings === undefined).toBe(true);
  });

  it("walks component-definition controlImplementations.implementedRequirements", () => {
    const n = normalizeOscalDocument(validDoc("component-definition"));
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.document.controls?.map((c) => c.controlId)).toEqual(["cm-2"]);
  });

  it("maps poam associatedControls into one normalized control per id", () => {
    const d = validDoc("poam") as Record<string, unknown>;
    d.tasks = [
      { uuid: UUID(6), controlId: "ac-2", title: "fix both", associatedControls: ["au-6", { controlId: "cm-2" }] },
    ];
    const n = normalizeOscalDocument(d);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.document.controls?.map((c) => c.controlId)).toEqual(["ac-2", "au-6", "cm-2"]);
    expect(n.document.controls?.every((c) => c.description === "fix both")).toBe(true);
  });

  it("is deterministic: identical input normalizes to a deep-identical document twice", () => {
    const d = validDoc("assessment-results");
    const a = normalizeOscalDocument(d);
    const b = normalizeOscalDocument(d);
    expect(a).toEqual(b);
    const v1 = validateOscalDocument(d);
    const v2 = validateOscalDocument(d);
    expect(v1).toEqual(v2);
  });

  it("rejects what validation rejects, returning the exact same issues", () => {
    const bad = { results: "not-an-array" };
    const v = validateOscalDocument(bad);
    const n = normalizeOscalDocument(bad);
    expect(n.ok).toBe(false);
    if (n.ok) return;
    expect(n.errors).toEqual(v.errors);
  });
});

describe("oscalImport — static purity gate", () => {
  it("engine source has zero DB/framework imports (pure passthrough surface)", () => {
    const src = fs.readFileSync(
      path.resolve("packages/core/src/lib/federal/oscalImport.ts"),
      "utf8",
    );
    const imports = [...src.matchAll(/^\s*import\s.+from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    expect(imports).toEqual([]); // zero runtime deps, not even node builtins
    expect(src).not.toMatch(/\bgetDb\b|drizzle-orm|\.\.\/\.\.\/db\b/);
    // Cycle 43: the seed→uuid derivation must stay dependency-free — in
    // particular no node:crypto smuggle-in and no PRNG nondeterminism.
    expect(src, "node:crypto import must stay absent from the engine").not.toMatch(
      /from\s+["']node?:crypto["']|\brequire\(\s*["']node?:crypto["']\s*\)/,
    );
    expect(src, "no Math.random in the deterministic engine").not.toMatch(/Math\.random\b/);
  });
});

// ═══ GAP-19 QA-cycle additions: boundaries, hostile inputs, agreement ════════

describe("oscalImport — serialized-length boundary at the default 5_000_000 cap", () => {
  // Self-calibrating padding: adding a trailing top-level `pad` string key
  // grows the serialization by pad.length + measured overhead (comma, quotes,
  // colon), computed here instead of hand-counted.
  const paddedTo = (target: number) => {
    const base = validDoc("poam") as Record<string, unknown>;
    const overhead =
      JSON.stringify({ ...base, pad: "" }).length - JSON.stringify(base).length;
    return { ...base, pad: "x".repeat(target - JSON.stringify(base).length - overhead) };
  };

  it("a document serializing to exactly OSCAL_MAX_SERIALIZED_LENGTH characters stays fully valid", () => {
    const atLimit = paddedTo(OSCAL_MAX_SERIALIZED_LENGTH);
    expect(JSON.stringify(atLimit).length).toBe(OSCAL_MAX_SERIALIZED_LENGTH);
    const r = validateOscalDocument(atLimit);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("one character over the default cap is rejected with a lone size-exceeded issue", () => {
    const over = paddedTo(OSCAL_MAX_SERIALIZED_LENGTH + 1);
    expect(JSON.stringify(over).length).toBe(OSCAL_MAX_SERIALIZED_LENGTH + 1);
    const r = validateOscalDocument(over);
    expect(r.valid).toBe(false);
    expect(codes(r)).toEqual(["size-exceeded"]);
    expect(r.warnings).toEqual([]);
    expect(r.errors[0].path).toBe("");
    expect(r.errors[0].message).toContain(String(OSCAL_MAX_SERIALIZED_LENGTH));
    expect(normalizeOscalDocument(over)).toMatchObject({ ok: false });
  });
});

describe("oscalImport — injected maxSerializedLength boundaries", () => {
  const mkObj = (bodyLen: number) => ({ k: "x".repeat(bodyLen) });
  const lenOf = (n: number) => JSON.stringify(mkObj(n)).length;

  it("guard is exclusive: serialized length === cap passes the gate, cap+1 trips it before structure", () => {
    const cap = lenOf(20); // calibrate the cap to an exactly achievable length
    expect(lenOf(20)).toBe(cap);
    // At-cap object clears the size gate (then fails structurally as unsupported)
    expect(codes(validateOscalDocument(mkObj(20), { maxSerializedLength: cap }))).toEqual([
      "unsupported-oscal-type",
    ]);
    // One char longer is size-rejected before any structural check
    expect(codes(validateOscalDocument(mkObj(21), { maxSerializedLength: cap }))).toEqual([
      "size-exceeded",
    ]);
  });

  it("cap 0 rejects every non-empty object; invalid option values fall back to the 5MB default", () => {
    expect(codes(validateOscalDocument({}, { maxSerializedLength: 0 }))).toEqual(["size-exceeded"]);

    const normal = validDoc("poam");
    for (const bogus of [Number.NaN, -1, -1000, Infinity, -Infinity]) {
      const r = validateOscalDocument(normal, { maxSerializedLength: bogus });
      expect(r.errors.filter((e) => e.code === "size-exceeded")).toHaveLength(0);
      expect(r.valid).toBe(true); // fell back to the default cap
    }
  });

  it("C4 totality: docs refusing serialization (BigInt members, circular refs) fail CLOSED with exactly one unserializable-document issue in BOTH entry points", () => {
    const bigintDoc: Record<string, unknown> = {
      results: [],
      oscalVersion: "1.1.2",
      uuid: UUID(1),
      metadata: { title: "T", lastModified: "2026-08-24T12:00:00.000Z", version: "1" },
      hostile: BigInt(1),
    };
    expect(() => validateOscalDocument(bigintDoc)).not.toThrow();
    expect(() => normalizeOscalDocument(bigintDoc)).not.toThrow();
    const rb = validateOscalDocument(bigintDoc);
    expect(rb.valid).toBe(false);
    // Exactly ONE issue — no size/structural codes, no fallthrough.
    expect(codes(rb)).toEqual(["unserializable-document"]);
    expect(rb.warnings).toEqual([]);
    const nb = normalizeOscalDocument(bigintDoc);
    expect(nb.ok).toBe(false);
    if (!nb.ok) expect(nb.errors).toEqual(rb.errors); // validate/normalize agree exactly

    const circ: Record<string, unknown> = { note: "circular" };
    circ.self = circ; // JSON.stringify throws -> serializedLength -1 -> fail closed
    const rc = validateOscalDocument(circ);
    expect(rc.valid).toBe(false);
    expect(codes(rc)).toEqual(["unserializable-document"]);
    const nc = normalizeOscalDocument(circ);
    expect(nc.ok).toBe(false);
    if (!nc.ok) expect(nc.errors).toEqual(rc.errors);
  });

  it("C4 precedence: serialization refusal outranks injected caps and structural checks", () => {
    const bigintDoc: Record<string, unknown> = {
      results: [],
      oscalVersion: "1.1.2",
      uuid: UUID(1),
      metadata: { title: "T", lastModified: "2026-08-24T12:00:00.000Z", version: "1" },
      hostile: BigInt(1),
    };
    // An injected zero cap cannot reinterpret refusal as size-exceeded.
    expect(codes(validateOscalDocument(bigintDoc, { maxSerializedLength: 0 }))).toEqual([
      "unserializable-document",
    ]);
    // Structural damage is masked: ONLY the serialization issue is reported.
    delete (bigintDoc.metadata as Record<string, unknown>).title;
    expect(codes(validateOscalDocument(bigintDoc))).toEqual(["unserializable-document"]);
  });
});

describe("oscalImport — malformed-input sweep: never throws, validate/normalize agree", () => {
  const MALFORMED: unknown[] = [
    null,
    undefined,
    0,
    -7,
    Number.NaN,
    "",
    "null",
    "{}", // string that LOOKS like a document — still just a string
    '{"results":[]}',
    true,
    false,
    [],
    [[]],
    [{ results: [] }],
    new Date(0), // object-shaped non-document
    Symbol("doc"),
    () => "fn",
    { results: { deep: [{}] } }, // right key, wrong shape
    { metadata: { oscalModel: { nested: {} } }, results: [] }, // non-string marker
    { metadata: "not-an-object", results: ["entry"] }, // unwrappable metadata
  ];

  it("every malformed input yields a structured failure from BOTH entry points without throwing", () => {
    for (const bad of MALFORMED) {
      const label =
        typeof bad === "symbol" || typeof bad === "function"
          ? `${typeof bad} input`
          : String(JSON.stringify(bad) ?? bad);
      expect(() => validateOscalDocument(bad), label).not.toThrow();
      expect(() => normalizeOscalDocument(bad), label).not.toThrow();

      const v = validateOscalDocument(bad);
      const n = normalizeOscalDocument(bad);
      expect(v.valid, label).toBe(false);
      expect(v.warnings, label).toEqual([]);
      expect(v.errors.length, label).toBeGreaterThan(0);
      expect(n.ok, label).toBe(false);
      if (!n.ok) expect(n.errors, label).toEqual(v.errors); // exact issue agreement
    }
  });
});

describe("oscalImport — hostile Proxy robustness", () => {
  const makeTrapProxy = () =>
    new Proxy(
      {},
      {
        get() {
          throw new Error("get-boom");
        },
        has() {
          throw new Error("has-boom");
        },
        ownKeys() {
          throw new Error("ownKeys-boom");
        },
      },
    );

  it("a Proxy throwing on get/in/ownKeys yields a stable unsupported verdict, deterministic across calls", () => {
    expect(() => validateOscalDocument(makeTrapProxy())).not.toThrow();
    expect(() => normalizeOscalDocument(makeTrapProxy())).not.toThrow();

    const r1 = validateOscalDocument(makeTrapProxy());
    const r2 = validateOscalDocument(makeTrapProxy());
    expect(r1).toEqual(r2);
    expect(r1.valid).toBe(false);
    // Cycle 43 (C4): a proxy refusing even key enumeration refuses
    // serialization, which now fails closed as unserializable-document
    // (previously: unsupported-oscal-type via detection fallthrough).
    expect(codes(r1)).toEqual(["unserializable-document"]);
    expect(normalizeOscalDocument(makeTrapProxy())).toMatchObject({
      ok: false,
      errors: [{ code: "unserializable-document" }],
    });
  });
});

describe("oscalImport — docType detection matrix completion", () => {
  it("resolves every MODEL_ALIASES alias, including trim/case normalization", () => {
    const cases: [string, string][] = [
      ["assessment-results", "assessment-results"],
      ["component-definition", "component-definition"],
      ["assessment-plan", "plan"],
      ["plan", "plan"],
      ["system-security-plan", "system-security-plan"],
      ["ssp", "system-security-plan"],
      ["plan-of-action-and-milestones", "poam"],
      ["poam", "poam"],
      ["poa&m", "poam"],
      ["  SSP  ", "system-security-plan"],
      ["Plan-Of-Action-And-Milestones", "poam"],
    ];
    for (const [marker, expected] of cases) {
      expect(detectOscalDocType({ metadata: { oscalModel: marker } }), marker).toBe(expected);
    }
  });

  it("non-string markers force unsupported even when structural keys would match", () => {
    for (const marker of [42, null, true, {}, []]) {
      expect(
        detectOscalDocType({ metadata: { oscalModel: marker }, results: [] }),
        String(marker),
      ).toBe("unsupported");
    }
  });

  it("structural sniffing follows the fixed precedence results > components > ssp > plan > poam keys", () => {
    expect(
      detectOscalDocType({ results: [], components: [], controls: [], observations: [] }),
    ).toBe("assessment-results");
    expect(detectOscalDocType({ components: [], controls: [], milestones: [] })).toBe(
      "component-definition",
    );
    expect(detectOscalDocType({ controls: [], assessmentActivities: [], tasks: [] })).toBe(
      "system-security-plan",
    );
    expect(detectOscalDocType({ assessmentActivities: [], observations: [] })).toBe("plan");
    expect(detectOscalDocType({ observations: [], tasks: [], milestones: [] })).toBe("poam");
  });

  it("non-object metadata does not block structural sniffing", () => {
    expect(detectOscalDocType({ metadata: "legacy", tasks: [] })).toBe("poam");
  });
});

describe("oscalImport — validate/normalize agreement across structured inputs", () => {
  it("normalize mirrors validation verdicts (exact same issues) for every broken variant", () => {
    const broken: Record<string, unknown>[] = [
      {},
      { results: [] },
      { ...validDoc("poam"), uuid: "nope" },
      { ...validDoc("poam"), tasks: "not-an-array" },
      (() => {
        const d = validDoc("system-security-plan") as Record<string, unknown>;
        delete d.controls; // systemCharacteristics keeps docType stable
        return d;
      })(),
      (() => {
        const d = validDoc("plan") as Record<string, unknown>;
        delete (d.metadata as Record<string, unknown>).lastModified;
        return d;
      })(),
      (() => {
        const d = validDoc("component-definition") as Record<string, unknown>;
        delete d.components; // loses its type signal -> unsupported
        return d;
      })(),
      (() => {
        const d = validDoc("assessment-results") as Record<string, unknown>;
        (d.metadata as Record<string, unknown>).version = ""; // empty string -> missing-field
        return d;
      })(),
    ];
    for (const doc of broken) {
      const v = validateOscalDocument(doc);
      expect(v.valid).toBe(false);
      const n = normalizeOscalDocument(doc);
      expect(n.ok).toBe(false);
      if (!n.ok) expect(n.errors).toEqual(v.errors);
    }
  });

  it("normalized docType matches detection for all five supported models", () => {
    for (const t of ["assessment-results", "component-definition", "plan", "system-security-plan", "poam"]) {
      const n = normalizeOscalDocument(validDoc(t));
      expect(n.ok).toBe(true);
      if (n.ok) {
        expect(n.document.docType).toBe(t);
        expect(n.document.docType).toBe(detectOscalDocType(validDoc(t)));
      }
    }
  });

  it("repeated normalization of the same document is stable across three runs", () => {
    const d = validDoc("poam");
    const runs = [
      normalizeOscalDocument(d),
      normalizeOscalDocument(d),
      normalizeOscalDocument(d),
    ];
    expect(runs[0]).toEqual(runs[1]);
    expect(runs[1]).toEqual(runs[2]);
  });
});

// ═════ GAP-19 QA-cycle-43: oscalUuidFromSeed gates + router-export round-trip ═════

/** Strict lowercase RFC-4122 matcher with the v4 version/variant nibbles baked in. */
const V4_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Lazily resolved off the namespace (see import note at top): while the
 * backend drop is pending this stays undefined and only the tests below go
 * red ([expected-red-pending-backend]) — the rest of the file stays green.
 */
const oscalUuidFromSeed = (OscalEngine as unknown as Record<string, unknown>)
  .oscalUuidFromSeed as ((seed: string) => string) | undefined;

describe("oscalImport — oscalUuidFromSeed (cycle 43 seed→v4-uuid derivation)", () => {
  // Router seeds post-C2/C3 (roots, observations, tasks) plus edge shapes.
  const SEEDS = [
    "",
    "x",
    "oscal-ssp-3-7",
    "oscal-ssp-999-123456",
    "oscal-poam-8-7",
    "oscal-poam-obs-8-101",
    "oscal-poam-obs-8-102",
    "oscal-poam-task-8-101",
    "üñíçødé-seed-🔑",
    "\u0000\u0007\n\t seed-with-control-chars",
    "x".repeat(10_000), // very long seed
    "x".repeat(10_001), // …and its one-char-longer sibling (distinctness pair)
  ];
  const label = (s: string) => JSON.stringify(s.length > 24 ? s.slice(0, 24) + "…" : s);

  it("derives lowercase RFC-4122 v4 uuids (regex + idx14='4' + idx19∈{8,9,a,b}) for every seed shape", () => {
    expect(typeof oscalUuidFromSeed).toBe("function");
    for (const seed of SEEDS) {
      const u = oscalUuidFromSeed!(seed);
      expect(typeof u, label(seed)).toBe("string");
      expect(u, label(seed)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(u[14], `version nibble for ${label(seed)}`).toBe("4");
      expect(["8", "9", "a", "b"], `variant nibble for ${label(seed)}`).toContain(u[19]);
      expect(V4_UUID_RE.test(u), `combined v4 form for ${label(seed)}`).toBe(true);
    }
  });

  it("is deterministic: the same seed yields the identical uuid across repeated calls", () => {
    expect(typeof oscalUuidFromSeed).toBe("function");
    for (const seed of ["oscal-ssp-3-7", "", "üñíçødé-seed-🔑", "x".repeat(4096)]) {
      const first = oscalUuidFromSeed!(seed);
      for (let i = 0; i < 5; i++) {
        expect(oscalUuidFromSeed!(seed), `run ${i} for ${label(seed)}`).toBe(first);
      }
    }
  });

  it("keeps distinct seeds distinct, including near-collisions one character apart", () => {
    expect(typeof oscalUuidFromSeed).toBe("function");
    const nearPairs: [string, string][] = [
      ["oscal-poam-obs-8-101", "oscal-poam-obs-8-102"],
      ["oscal-poam-obs-8-101", "oscal-poam-task-8-101"],
      ["oscal-ssp-3-7", "oscal-ssp-37-"],
      ["seed-a", "seed-b"],
      ["aaaaaaaa", "aaaaaaab"],
      ["x".repeat(64) + "!", "x".repeat(63) + "!"],
    ];
    const all = [...new Set([...SEEDS.filter((s) => s.length <= 128), ...nearPairs.flat()])];
    const outs = all.map((s) => oscalUuidFromSeed!(s));
    expect(new Set(outs).size, "every distinct seed maps to a distinct uuid").toBe(all.length);
    for (const [a, b] of nearPairs) {
      expect(oscalUuidFromSeed!(a), `${label(a)} vs ${label(b)}`).not.toBe(oscalUuidFromSeed!(b));
    }
  });
});

// ── Router-shaped round-trip payloads (post-C2/C3 export byte-shapes) ────────

/**
 * Shape witnesses of what exportSspOscal / exportPoamOscal emit AFTER the
 * cycle-43 fix — same key layout and value types as the handlers produce,
 * with RFC-4122 v4 uuids standing in for the oscalUuidFromSeed(...) digests
 * (the derivation gates above pin the emitted values to exactly this format).
 */
const SSP_ROUND_TRIP = {
  oscalVersion: "1.1.2",
  uuid: "9f0c3a52-6d41-4b8e-a27c-0e5d81f43ba7", // ≙ oscalUuidFromSeed("oscal-ssp-3-7")
  metadata: {
    title: "APEX Core SSP",
    lastModified: "2026-08-24T09:30:00.000Z",
    version: "2",
    oscalModel: "system-security-plan",
  },
  systemCharacteristics: {
    systemName: "APEX Core",
    description: "The APEX production boundary",
    securitySensitivityLevel: "moderate",
    systemOperationalStatus: { status: "operational" },
  },
  controlImplementationSrc: [
    {
      controlId: "cm-6",
      implementedRequirement: {
        description: "Baseline configs enforced",
        responsibleRole: "Ops",
        status: "partial",
        evidenceLinks: [],
      },
    },
    {
      controlId: "ac-2",
      implementedRequirement: {
        description: "Account reviews monthly",
        responsibleRole: "ISO",
        status: "implemented",
        evidenceLinks: ["ev-1"],
      },
    },
  ],
};

const POAM_ROUND_TRIP = {
  oscalVersion: "1.1.2",
  uuid: "5b21e7d8-90af-4c63-b1d2-73ea9c04f586", // ≙ oscalUuidFromSeed("oscal-poam-8-7")
  metadata: {
    title: "POA&M — Remediation",
    lastModified: "2026-08-24T09:30:00.000Z",
    version: "1", // String(poam.version ?? 1) — the C2/C3-added metadata field
    oscalModel: "plan-of-action-and-milestones",
  },
  milestones: [],
  observations: [
    {
      uuid: "2c94d1f0-38a7-4e25-9b60-d1fa07c85e93", // ≙ oscalUuidFromSeed("oscal-poam-obs-8-101")
      title: "Weak patching",
      description: "Servers unpatched",
      methods: ["EXAMINE", "INTERVIEW"],
      relevantEvidence: [],
    },
    {
      uuid: "77e03b4a-51cd-49f8-8a92-6cb20fe31d70", // ≙ oscalUuidFromSeed("oscal-poam-obs-8-102")
      title: "Old finding",
      description: "Fixed",
      methods: ["EXAMINE"],
      relevantEvidence: ["doc-1"],
    },
  ],
  tasks: [
    {
      uuid: "aa1b6c95-7de2-4f30-84b7-90ec5da61c48", // ≙ oscalUuidFromSeed("oscal-poam-task-8-101")
      title: "Weak patching",
      description: "Patch monthly",
      timing: { onDate: "2026-09-30T00:00:00.000Z" },
      associatedControls: ["si-2"],
      status: "in-progress",
      riskRating: "high",
    },
    {
      uuid: "bd47f209-6831-4ad5-92ce-1f0a83be67d4", // ≙ oscalUuidFromSeed("oscal-poam-task-8-102")
      title: "Old finding",
      description: "",
      associatedControls: [],
      status: "completed",
      riskRating: "low",
    },
  ],
};

describe("oscalImport — router-export round-trip (cycle 43 pinning)", () => {
  it("detects and fully validates the post-fix SSP export shape", () => {
    expect(detectOscalDocType(SSP_ROUND_TRIP)).toBe("system-security-plan");
    const r = validateOscalDocument(SSP_ROUND_TRIP);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("normalizes the SSP export into the canonical document (controls sorted, envelope intact)", () => {
    const n = normalizeOscalDocument(SSP_ROUND_TRIP);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.document.docType).toBe("system-security-plan");
    expect(n.document.uuid).toBe(SSP_ROUND_TRIP.uuid);
    expect(n.document.title).toBe("APEX Core SSP");
    expect(n.document.version).toBe("2");
    expect(n.document.lastModified).toBe("2026-08-24T09:30:00.000Z");
    expect(n.document.controls?.map((c) => c.controlId)).toEqual(["ac-2", "cm-6"]);
    expect(n.document.controls?.[0]).toMatchObject({
      description: "Account reviews monthly",
      status: "implemented",
    });
  });

  it("detects and validates the post-fix POA&M export shape (empty milestones[] is warning-only)", () => {
    expect(detectOscalDocType(POAM_ROUND_TRIP)).toBe("poam");
    const r = validateOscalDocument(POAM_ROUND_TRIP);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => ({ code: w.code, path: w.path }))).toEqual([
      { code: "empty-collection", path: "milestones" },
    ]);
  });

  it("normalizes the POA&M export: version '1', associatedControls flattened, control-less task dropped", () => {
    const n = normalizeOscalDocument(POAM_ROUND_TRIP);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.document.docType).toBe("poam");
    expect(n.document.version).toBe("1");
    expect(n.document.controls?.map((c) => c.controlId)).toEqual(["si-2"]);
    expect(n.document.controls?.[0]?.description).toBe("Patch monthly"); // task description passthrough
  });
});

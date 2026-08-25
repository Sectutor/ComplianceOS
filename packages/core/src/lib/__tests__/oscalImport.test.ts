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

    const sym = { metadata: {}, results: Symbol("x") };
    expect(() => validateOscalDocument(sym)).not.toThrow();
    expect(validateOscalDocument(sym).valid).toBe(false);

    const deep: Record<string, unknown> = { a: null };
    deep.self = deep; // JSON.stringify throws on circularity -> guard must swallow
    expect(() => validateOscalDocument(deep)).not.toThrow();
    expect(() => normalizeOscalDocument(deep)).not.toThrow();

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
  });
});

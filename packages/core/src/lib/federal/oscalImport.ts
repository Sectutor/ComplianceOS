/**
 * OSCAL document import/validation engine (GAP-19).
 *
 * Pure, deterministic, ZERO runtime deps, NEVER throws on ANY input
 * (null / primitives / arrays / deep structures / throwing getters /
 * circular references / hostile Proxies). House style mirrors the other
 * lib engines (see nis2ControlHealth.ts): every property read goes through
 * a guarded accessor, every collection is type-checked before iteration,
 * and both entry points carry a catastrophic-catch backstop.
 *
 *   validateOscalDocument(input)   -> { valid, errors, warnings }
 *   normalizeOscalDocument(input)  -> { ok: true, document } | { ok: false, errors }
 *
 * Detected root docTypes: assessment-results | component-definition | plan |
 * system-security-plan | poam — anything else (including unrecognized
 * metadata.oscalModel markers) is `unsupported`.
 *
 * Structural checks: oscalVersion, uuid (RFC-4122 format), metadata.title,
 * metadata.lastModified (ISO-8601), version (metadata.version with root
 * `version` fallback), plus the per-docType required collection. Present-but-
 * empty collections surface as `empty-collection` WARNINGS, not errors.
 */

/* ── Public types ──────────────────────────────────────────────────────────── */

export type OscalDocType =
  | "assessment-results"
  | "component-definition"
  | "plan"
  | "system-security-plan"
  | "poam"
  | "unsupported";

export type SupportedOscalDocType = Exclude<OscalDocType, "unsupported">;

/** Stable issue shape shared by errors and warnings. Codes are kebab-case. */
export interface OscalIssue {
  code: string;
  path: string;
  message: string;
}

export interface OscalValidationResult {
  valid: boolean;
  errors: OscalIssue[];
  warnings: OscalIssue[];
}

export interface NormalizedOscalControl {
  controlId: string;
  statement?: string;
  description?: string;
  status?: string;
}

export interface NormalizedOscalFinding {
  uuid?: string;
  controlId?: string;
  result?: string;
  title?: string;
  description?: string;
}

export interface NormalizedOscalDocument {
  oscalVersion: string;
  docType: SupportedOscalDocType;
  uuid: string;
  title: string;
  /** ISO-8601 timestamp string. */
  lastModified: string;
  version: string;
  controls?: NormalizedOscalControl[];
  /** Only for assessment-results documents. */
  findings?: NormalizedOscalFinding[];
}

export type OscalNormalizationResult =
  | { ok: true; document: NormalizedOscalDocument }
  | { ok: false; errors: OscalIssue[] };

export interface OscalEngineOptions {
  /**
   * Serialized-length cap for the `size-exceeded` guard, in JSON-text
   * characters. Defaults to OSCAL_MAX_SERIALIZED_LENGTH. Injecting a small
   * cap keeps the guard unit-testable without building multi-megabyte blobs.
   */
  maxSerializedLength?: number;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

/** Reject serialized documents above ~5 MB of JSON text. */
export const OSCAL_MAX_SERIALIZED_LENGTH = 5_000_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ISO-8601 date or date-time (space separator tolerated, timezone optional). */
const ISO_8601_RE =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Explicit model markers (checked first, before structural sniffing). */
const MODEL_ALIASES: Record<string, OscalDocType> = {
  "assessment-results": "assessment-results",
  "component-definition": "component-definition",
  "assessment-plan": "plan",
  plan: "plan",
  "system-security-plan": "system-security-plan",
  ssp: "system-security-plan",
  "plan-of-action-and-milestones": "poam",
  poam: "poam",
  "poa&m": "poam",
};

/**
 * Per-docType required collections. A doc satisfies the requirement when ANY
 * alternative key is present as an array; the first present key (fixed order)
 * wins. Absent entirely -> `missing-field`; wrong type -> `invalid-type`;
 * present-but-empty -> `empty-collection` warning.
 */
const REQUIRED_COLLECTIONS: Record<SupportedOscalDocType, { primary: string; keys: string[] }[]> = {
  "assessment-results": [{ primary: "results", keys: ["results"] }],
  "component-definition": [{ primary: "components", keys: ["components"] }],
  plan: [
    {
      primary: "assessmentActivities",
      keys: ["assessmentActivities", "assessment-activities", "localDefinitions", "local-definitions"],
    },
  ],
  "system-security-plan": [
    {
      primary: "controls",
      keys: ["controls", "controlImplementationSrc", "controlImplementation", "control-implementations"],
    },
  ],
  poam: [{ primary: "tasks", keys: ["tasks", "observations", "milestones"] }],
};

/* ── Guarded primitives (never throw, even on hostile objects) ─────────────── */

function safeGet(host: unknown, key: string): unknown {
  try {
    if (host === null || typeof host !== "object") return undefined;
    return (host as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function safeHas(host: unknown, key: string): boolean {
  try {
    return host !== null && typeof host === "object" && key in (host as object);
  } catch {
    return false;
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function describeType(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function truncate(s: string, n = 48): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function firstDefined<T>(...vals: T[]): T | undefined {
  for (const v of vals) if (v !== undefined) return v;
  return undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Serialized length in characters; -1 when JSON.stringify refuses (circular, BigInt…). */
function serializedLength(input: unknown): number {
  try {
    const s = JSON.stringify(input);
    return s === undefined ? -1 : s.length;
  } catch {
    return -1;
  }
}

function isIso8601(v: unknown): boolean {
  if (v instanceof Date) return Number.isFinite(v.getTime());
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!ISO_8601_RE.test(s)) return false;
  const probe = s.replace(" ", "T");
  try {
    return Number.isFinite(Date.parse(probe));
  } catch {
    return false;
  }
}

/* ── docType detection ─────────────────────────────────────────────────────── */

/**
 * Detect the OSCAL root model. Order of operations is fixed so identical
 * input always yields the identical answer:
 *   1. explicit metadata.oscalModel marker (alias table; unknown marker ->
 *      unsupported),
 *   2. structural sniffing in priority order:
 *      results -> assessment-results, components -> component-definition,
 *      systemCharacteristics/controlImplementationSrc/controls -> SSP,
 *      assessmentActivities/localDefinitions -> plan,
 *      observations/tasks/milestones -> poam.
 */
export function detectOscalDocType(input: unknown): OscalDocType {
  try {
    if (!isObj(input)) return "unsupported";

    const meta = safeGet(input, "metadata");
    const model = isObj(meta) ? safeGet(meta, "oscalModel") : undefined;
    if (model !== undefined) {
      if (typeof model !== "string") return "unsupported";
      const mapped = MODEL_ALIASES[model.trim().toLowerCase()];
      return mapped ?? "unsupported";
    }

    if (safeHas(input, "results")) return "assessment-results";
    if (safeHas(input, "components")) return "component-definition";
    if (
      safeHas(input, "systemCharacteristics") ||
      safeHas(input, "controlImplementationSrc") ||
      safeHas(input, "controlImplementation") ||
      safeHas(input, "controls")
    ) {
      return "system-security-plan";
    }
    if (
      safeHas(input, "assessmentActivities") ||
      safeHas(input, "assessment-activities") ||
      safeHas(input, "localDefinitions") ||
      safeHas(input, "local-definitions")
    ) {
      return "plan";
    }
    if (safeHas(input, "observations") || safeHas(input, "tasks") || safeHas(input, "milestones")) {
      return "poam";
    }
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

/* ── Field-level checks ────────────────────────────────────────────────────── */

function checkNonEmptyString(host: unknown, key: string, path: string, errors: OscalIssue[]): void {
  const v = safeGet(host, key);
  if (v === undefined) {
    errors.push({ code: "missing-field", path, message: `${path} is required` });
    return;
  }
  if (typeof v !== "string") {
    errors.push({
      code: "invalid-type",
      path,
      message: `${path} must be a string (received ${describeType(v)})`,
    });
    return;
  }
  if (v.trim() === "") {
    errors.push({ code: "missing-field", path, message: `${path} must be a non-empty string` });
  }
}

function checkLastModified(
  meta: Record<string, unknown>,
  errors: OscalIssue[],
): void {
  const v = safeGet(meta, "lastModified");
  const path = "metadata.lastModified";
  if (v === undefined) {
    errors.push({ code: "missing-field", path, message: `${path} is required` });
    return;
  }
  if (!(typeof v === "string" || v instanceof Date)) {
    errors.push({
      code: "invalid-type",
      path,
      message: `${path} must be an ISO-8601 string (received ${describeType(v)})`,
    });
    return;
  }
  if (!isIso8601(v)) {
    errors.push({
      code: "invalid-date",
      path,
      message: `${path} must be a valid ISO-8601 timestamp (received "${truncate(
        typeof v === "string" ? v : v.toISOString(),
      )}")`,
    });
  }
}

function resolveEffectiveVersion(doc: Record<string, unknown>): { host: unknown; path: string } | null {
  const meta = safeGet(doc, "metadata");
  if (isObj(meta) && safeGet(meta, "version") !== undefined) return { host: meta, path: "metadata.version" };
  if (safeGet(doc, "version") !== undefined) return { host: doc, path: "version" };
  return null;
}

/* ── validateOscalDocument ─────────────────────────────────────────────────── */

function validateImpl(input: unknown, options: OscalEngineOptions): OscalValidationResult {
  const errors: OscalIssue[] = [];
  const warnings: OscalIssue[] = [];

  if (!isObj(input)) {
    return {
      valid: false,
      warnings,
      errors: [
        {
          code: "not-an-object",
          path: "",
          message: `OSCAL document must be a JSON object (received ${describeType(input)})`,
        },
      ],
    };
  }

  const cap =
    typeof options.maxSerializedLength === "number" &&
    Number.isFinite(options.maxSerializedLength) &&
    options.maxSerializedLength >= 0
      ? Math.floor(options.maxSerializedLength)
      : OSCAL_MAX_SERIALIZED_LENGTH;
  const len = serializedLength(input);
  if (len >= 0 && len > cap) {
    return {
      valid: false,
      warnings,
      errors: [
        {
          code: "size-exceeded",
          path: "",
          message: `Serialized OSCAL document is ${len} characters, exceeding the limit of ${cap}`,
        },
      ],
    };
  }

  const docType = detectOscalDocType(input);
  if (docType === "unsupported") {
    errors.push({
      code: "unsupported-oscal-type",
      path: "",
      message:
        "Could not detect a supported OSCAL document type (assessment-results, component-definition, assessment-plan, system-security-plan, plan-of-action-and-milestones)",
    });
    return { valid: false, errors, warnings };
  }

  // Common envelope fields.
  checkNonEmptyString(input, "oscalVersion", "oscalVersion", errors);

  const uuid = safeGet(input, "uuid");
  if (uuid === undefined) {
    errors.push({ code: "missing-field", path: "uuid", message: "uuid is required" });
  } else if (typeof uuid !== "string") {
    errors.push({
      code: "invalid-type",
      path: "uuid",
      message: `uuid must be a string (received ${describeType(uuid)})`,
    });
  } else if (!UUID_RE.test(uuid.trim())) {
    errors.push({
      code: "invalid-uuid",
      path: "uuid",
      message: `uuid must be an RFC-4122 UUID (received "${truncate(uuid)}")`,
    });
  }

  const meta = safeGet(input, "metadata");
  if (!isObj(meta)) {
    errors.push({ code: "missing-field", path: "metadata", message: "metadata object is required" });
  } else {
    checkNonEmptyString(meta, "title", "metadata.title", errors);
    checkLastModified(meta, errors);

    const versionRef = resolveEffectiveVersion(input);
    if (!versionRef) {
      errors.push({
        code: "missing-field",
        path: "metadata.version",
        message: "metadata.version is required (root-level version is accepted as a fallback)",
      });
    } else {
      checkNonEmptyString(versionRef.host, versionRef.path.split(".").pop() as string, versionRef.path, errors);
    }
  }

  // Per-docType required collections (+ empty-collection anomaly warnings).
  for (const req of REQUIRED_COLLECTIONS[docType]) {
    const presentKeys = req.keys.filter((k) => safeHas(input, k));
    if (presentKeys.length === 0) {
      errors.push({
        code: "missing-field",
        path: req.primary,
        message: `A ${docType} document requires one of [${req.keys.join(", ")}]`,
      });
      continue;
    }
    const winner = presentKeys[0];
    const val = safeGet(input, winner);
    if (!Array.isArray(val)) {
      errors.push({
        code: "invalid-type",
        path: winner,
        message: `${winner} must be an array (received ${describeType(val)})`,
      });
      continue;
    }
    if (val.length === 0) {
      warnings.push({
        code: "empty-collection",
        path: winner,
        message: `${winner} is present but contains no entries`,
      });
    }
    // Additional present alternatives that are empty are anomalies too.
    for (const alt of presentKeys.slice(1)) {
      const altVal = safeGet(input, alt);
      if (Array.isArray(altVal) && altVal.length === 0) {
        warnings.push({
          code: "empty-collection",
          path: alt,
          message: `${alt} is present but contains no entries`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an untrusted OSCAL document. Never throws: any input — including
 * null, primitives, arrays, circular structures, throwing getters and
 * hostile Proxies — produces a structured result.
 */
export function validateOscalDocument(
  input: unknown,
  options: OscalEngineOptions = {},
): OscalValidationResult {
  try {
    return validateImpl(input, options);
  } catch {
    return {
      valid: false,
      warnings: [],
      errors: [
        {
          code: "not-an-object",
          path: "",
          message: "OSCAL document could not be interpreted as a JSON object",
        },
      ],
    };
  }
}

/* ── Control/finding extraction ────────────────────────────────────────────── */

interface RawControl {
  controlId: string;
  statement?: string;
  description?: string;
  status?: string;
  /** Source-entry uuid — used ONLY as the deterministic sort tie-breaker. */
  sourceUuid: string;
}

function controlFromEntry(entry: unknown): RawControl | null {
  if (!isObj(entry)) return null;
  try {
    const controlId = asString(
      firstDefined(safeGet(entry, "controlId"), safeGet(entry, "control-id")),
    );
    const ir = firstDefined(safeGet(entry, "implementedRequirement"), safeGet(entry, "implemented-requirement"));
    const irObj = isObj(ir) ? ir : undefined;
    const statement = asString(
      firstDefined(
        safeGet(entry, "statement"),
        safeGet(entry, "remarks"),
        irObj ? safeGet(irObj, "statement") : undefined,
      ),
    );
    const description = asString(
      firstDefined(safeGet(entry, "description"), irObj ? safeGet(irObj, "description") : undefined),
    );
    const status = asString(
      firstDefined(safeGet(entry, "status"), safeGet(entry, "outcome"), irObj ? safeGet(irObj, "status") : undefined),
    );
    const sourceUuid = asString(safeGet(entry, "uuid")) ?? "";
    if (controlId === undefined && statement === undefined && description === undefined && status === undefined) {
      return null;
    }
    return { controlId: controlId ?? "", statement, description, status, sourceUuid };
  } catch {
    return null;
  }
}

function asArrayOrEmpty(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function extractControlsForDocType(doc: Record<string, unknown>, docType: SupportedOscalDocType): RawControl[] {
  try {
    if (docType === "system-security-plan") {
      const keys = REQUIRED_COLLECTIONS["system-security-plan"][0].keys;
      const winner = keys.find((k) => Array.isArray(safeGet(doc, k)));
      if (!winner) return [];
      return asArrayOrEmpty(safeGet(doc, winner))
        .map(controlFromEntry)
        .filter((c): c is RawControl => c !== null);
    }

    if (docType === "component-definition") {
      const out: RawControl[] = [];
      for (const comp of asArrayOrEmpty(safeGet(doc, "components"))) {
        if (!isObj(comp)) continue;
        const impls = firstDefined(
          safeGet(comp, "controlImplementations"),
          safeGet(comp, "control-implementations"),
        );
        for (const impl of asArrayOrEmpty(impls)) {
          const reqs = firstDefined(
            safeGet(impl, "implementedRequirements"),
            safeGet(impl, "implemented-requirements"),
          );
          for (const req of asArrayOrEmpty(reqs)) {
            const c = controlFromEntry(req);
            if (c) out.push(c);
          }
        }
      }
      return out;
    }

    if (docType === "poam") {
      const out: RawControl[] = [];
      for (const task of asArrayOrEmpty(safeGet(doc, "tasks"))) {
        if (!isObj(task)) continue;
        const direct = asString(firstDefined(safeGet(task, "controlId"), safeGet(task, "control-id")));
        const assoc = asArrayOrEmpty(safeGet(task, "associatedControls"))
          .map((a) => (typeof a === "string" ? a : asString(safeGet(a, "controlId"))))
          .filter((a): a is string => typeof a === "string");
        const ids = direct !== undefined ? [direct, ...assoc] : assoc;
        if (ids.length === 0) continue;
        const base = controlFromEntry(task);
        for (const id of ids) {
          out.push({
            controlId: id,
            statement: base?.statement,
            description: base?.description ?? asString(safeGet(task, "title")),
            status: base?.status,
            sourceUuid: base?.sourceUuid ?? "",
          });
        }
      }
      return out;
    }

    if (docType === "plan") {
      const keys = REQUIRED_COLLECTIONS.plan[0].keys;
      const winner = keys.find((k) => Array.isArray(safeGet(doc, k)));
      if (!winner) return [];
      return asArrayOrEmpty(safeGet(doc, winner))
        .map(controlFromEntry)
        .filter((c): c is RawControl => c !== null);
    }

    // assessment-results: results double as control references.
    return asArrayOrEmpty(safeGet(doc, "results"))
      .map(controlFromEntry)
      .filter((c): c is RawControl => c !== null);
  } catch {
    return [];
  }
}

/** Dedupe identical controlIds (LAST wins) and sort by controlId asc, then source uuid asc. */
function dedupeAndSortControls(raw: RawControl[]): NormalizedOscalControl[] {
  const byId = new Map<string, { item: NormalizedOscalControl; sortUuid: string }>();
  for (const rc of raw) {
    const item: NormalizedOscalControl = { controlId: rc.controlId };
    if (rc.statement !== undefined) item.statement = rc.statement;
    if (rc.description !== undefined) item.description = rc.description;
    if (rc.status !== undefined) item.status = rc.status;
    // Named controlIds dedupe LAST-WINS; entries without a controlId get a
    // unique synthetic key so they survive dedupe (an empty controlId is not
    // a reference to "the same control") and order deterministically.
    const key = rc.controlId === "" ? `\u0000anon-${byId.size}` : rc.controlId;
    byId.set(key, { item, sortUuid: rc.sourceUuid }); // Map.set = last-wins
  }
  const merged = [...byId.values()];
  merged.sort((a, b) => cmpStr(a.item.controlId, b.item.controlId) || cmpStr(a.sortUuid, b.sortUuid));
  return merged.map((m) => m.item);
}

function extractFindings(doc: Record<string, unknown>): NormalizedOscalFinding[] {
  const findings: NormalizedOscalFinding[] = [];
  for (const r of asArrayOrEmpty(safeGet(doc, "results"))) {
    if (!isObj(r)) continue;
    const uuid = asString(safeGet(r, "uuid"));
    const controlId = asString(firstDefined(safeGet(r, "controlId"), safeGet(r, "control-id")));
    const result = asString(firstDefined(safeGet(r, "result"), safeGet(r, "outcome")));
    const title = asString(safeGet(r, "title"));
    const description = asString(safeGet(r, "description"));
    const f: NormalizedOscalFinding = {};
    if (uuid !== undefined) f.uuid = uuid;
    if (controlId !== undefined) f.controlId = controlId;
    if (result !== undefined) f.result = result;
    if (title !== undefined) f.title = title;
    if (description !== undefined) f.description = description;
    findings.push(f);
  }
  findings.sort(
    (a, b) =>
      cmpStr(a.controlId ?? "", b.controlId ?? "") || cmpStr(a.uuid ?? "", b.uuid ?? ""),
  );
  return findings;
}

/* ── normalizeOscalDocument ────────────────────────────────────────────────── */

function normalizeImpl(input: unknown, options: OscalEngineOptions): OscalNormalizationResult {
  const verdict = validateOscalDocument(input, options);
  if (!verdict.valid) {
    return { ok: false, errors: verdict.errors };
  }

  const doc = input as Record<string, unknown>;
  const meta = safeGet(doc, "metadata") as Record<string, unknown>;
  const docType = detectOscalDocType(doc) as SupportedOscalDocType;

  let effectiveVersion: unknown = safeGet(meta, "version");
  if (effectiveVersion === undefined) effectiveVersion = safeGet(doc, "version");

  const lastModifiedRaw = safeGet(meta, "lastModified");
  const lastModified = (lastModifiedRaw instanceof Date
    ? lastModifiedRaw
    : new Date(typeof lastModifiedRaw === "string" ? lastModifiedRaw.replace(" ", "T") : "")
  ).toISOString();

  const document: NormalizedOscalDocument = {
    oscalVersion: String(safeGet(doc, "oscalVersion")),
    docType,
    uuid: String(safeGet(doc, "uuid")),
    title: String(safeGet(meta, "title")),
    lastModified,
    version: String(effectiveVersion),
  };

  const controls = dedupeAndSortControls(extractControlsForDocType(doc, docType));
  if (controls.length > 0) document.controls = controls;

  if (docType === "assessment-results") {
    const findings = extractFindings(doc);
    if (findings.length > 0) document.findings = findings;
  }

  return { ok: true, document };
}

/**
 * Normalize a VALIDATED OSCAL document into the canonical ComplianceOS shape.
 * Runs validation first — invalid input yields `{ ok: false, errors }` with
 * the exact issues from validateOscalDocument. Deterministic: identical input
 * produces deep-identical output, with controls sorted by controlId asc (tie-
 * broken by source uuid asc) and duplicate controlIds resolved LAST-WINS.
 */
export function normalizeOscalDocument(
  input: unknown,
  options: OscalEngineOptions = {},
): OscalNormalizationResult {
  try {
    return normalizeImpl(input, options);
  } catch {
    return {
      ok: false,
      errors: [
        {
          code: "not-an-object",
          path: "",
          message: "OSCAL document could not be interpreted as a JSON object",
        },
      ],
    };
  }
}

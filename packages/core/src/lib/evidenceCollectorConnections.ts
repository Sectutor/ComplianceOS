/**
 * Evidence Collector Connections — credential management, connection state,
 * and UI-triggered collection runs for the automated evidence collection
 * feature (scorecard P0 #1).
 *
 * Design goals:
 * - DB-backed with an in-memory fallback: every function is safe to call with
 *   no database (or a database that is unreachable). DB failures are swallowed
 *   and the module falls back to its internal memory store — nothing here ever
 *   throws because of the DB.
 * - Deterministic & unit-testable: pure helpers (masking, provider discovery)
 *   have no side effects; `db` and `fetchImpl` are injectable.
 * - Secrets never leak: credential values live in an internal map keyed by
 *   connection id and are never included in any returned connection row.
 */

import type {
  IntegrationManifest,
  IntegrationContext,
} from './integrations/types';
import type {
  EvidenceCollector,
  CollectedEvidence,
} from './integrations/collector';
import { evidenceCollectorRegistry } from './integrations/collector';
import { githubEvidenceCollector } from './integrations/github/collector';
import { httpApiEvidenceCollector } from './integrations/http-api/collector';
import { awsEvidenceCollector } from './integrations/aws/collector';
import { azureEvidenceCollector } from './integrations/azure/collector';
import { gcpEvidenceCollector } from './integrations/gcp/collector';

/** Built-in evidence collectors backing the five supported providers. */
const BUILTIN_COLLECTORS: EvidenceCollector[] = [
  githubEvidenceCollector,
  httpApiEvidenceCollector,
  awsEvidenceCollector,
  azureEvidenceCollector,
  gcpEvidenceCollector,
];

/**
 * Idempotent self-registration: the canonical registration side-effect lives
 * in integrations/index.ts; this module works even when that module was never
 * imported (e.g. isolated unit tests) by registering the five built-ins once.
 */
function ensureCollectorsRegistered(): void {
  for (const collector of BUILTIN_COLLECTORS) {
    const slug = collector.manifest.slug;
    if (!evidenceCollectorRegistry.get(slug)) {
      evidenceCollectorRegistry.register(collector);
    }
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CollectorProvider = 'aws' | 'azure' | 'gcp' | 'github' | 'http-api';

export interface CollectorConnection {
  id: string; // stable id (crypto.randomUUID() or counter fallback)
  clientId: number;
  provider: CollectorProvider;
  name: string;
  status: 'connected' | 'error' | 'disconnected';
  lastRunAt: string | null; // ISO string
  lastRunSummary: {
    total: number;
    passed: number;
    warning: number;
    failed: number;
    error: number;
  } | null;
  errorMessage: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CollectorConnectionInput {
  clientId: number;
  provider: CollectorProvider;
  name: string;
  credentials: Record<string, string>; // raw values from the form; secrets flagged sensitive in the manifest
  settings?: Record<string, unknown>;
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  checkedAt: string;
}

export interface RunCollectorResult {
  connectionId: string;
  provider: CollectorProvider;
  ok: boolean;
  total: number;
  passed: number;
  warning: number;
  failed: number;
  error: number;
  message: string;
  completedAt: string;
  evidence: Array<{
    id: string;
    controlId: string;
    type: string;
    status: 'pass' | 'warning' | 'fail' | 'error';
    title: string;
    collectedAt: string;
  }>;
}

// ---------------------------------------------------------------------------
// Provider discovery
// ---------------------------------------------------------------------------

const PROVIDER_SLUGS: readonly CollectorProvider[] = [
  'aws',
  'azure',
  'gcp',
  'github',
  'http-api',
];

const PROVIDER_VALUES: readonly string[] = PROVIDER_SLUGS as readonly string[];

/**
 * Registry manifests use the provider name directly for aws/azure/gcp and a
 * `-evidence` suffixed slug for github/http-api. Match either form so the
 * five supported providers are discovered regardless of suffix.
 */
function manifestMatchesProvider(
  manifest: IntegrationManifest,
  providerSlug: string,
): boolean {
  return (
    manifest.slug === providerSlug ||
    manifest.slug.startsWith(`${providerSlug}-`)
  );
}

function isProviderManifest(manifest: IntegrationManifest): boolean {
  return PROVIDER_SLUGS.some((p) => manifestMatchesProvider(manifest, p));
}

/** Map a manifest to the canonical provider slug it backs (or undefined). */
function toProviderSlug(manifest: IntegrationManifest): CollectorProvider | undefined {
  return PROVIDER_SLUGS.find((p) => manifestMatchesProvider(manifest, p));
}

/** List the five evidence collector provider manifests, sorted by slug. */
export function listCollectorProviders(): IntegrationManifest[] {
  ensureCollectorsRegistered();
  return evidenceCollectorRegistry
    .list()
    .map((c) => c.manifest)
    .filter((m) => isProviderManifest(m))
    .map((m) => ({ ...m, slug: toProviderSlug(m) ?? m.slug }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Resolve a provider slug (or manifest slug) to its manifest. */
export function getCollectorProvider(
  slug: string,
): IntegrationManifest | undefined {
  const target = String(slug ?? '').trim().toLowerCase();
  if (!target) return undefined;
  ensureCollectorsRegistered();
  const manifest = evidenceCollectorRegistry
    .list()
    .map((c) => c.manifest)
    .find(
      (m) =>
        m.slug === target || m.slug.startsWith(`${target}-`),
    );
  if (!manifest) return undefined;
  return { ...manifest, slug: toProviderSlug(manifest) ?? manifest.slug };
}

/** Registry keys are manifest slugs; provider names resolve to them too. */
function resolveCollector(
  provider: CollectorProvider,
): EvidenceCollector | undefined {
  ensureCollectorsRegistered();
  const direct = evidenceCollectorRegistry.get(provider);
  if (direct) return direct;
  return evidenceCollectorRegistry
    .list()
    .find((c) => manifestMatchesProvider(c.manifest, provider));
}

// ---------------------------------------------------------------------------
// Pure helpers (deterministic)
// ---------------------------------------------------------------------------

/** Mask a credential: never returns the raw value. */
export function maskCredential(value: string): string {
  if (value === '') return '';
  if (value.length <= 4) return '••••';
  return '••••' + value.slice(-4);
}

/** Mask every value of a credentials object. */
export function maskCredentials(
  creds: Record<string, string>,
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const key of Object.keys(creds ?? {})) {
    masked[key] = maskCredential(creds[key]);
  }
  return masked;
}

/** True when the manifest marks the auth field as sensitive. */
export function isSecretField(
  manifest: IntegrationManifest,
  key: string,
): boolean {
  return (
    Array.isArray(manifest?.authentication?.fields) &&
    manifest.authentication.fields.some(
      (f) => f.key === key && f.sensitive === true,
    )
  );
}

// ---------------------------------------------------------------------------
// State (module-level, in-memory fallback)
// ---------------------------------------------------------------------------

let memoryStore: CollectorConnection[] = [];
const memoryCredentials = new Map<string, Record<string, string>>();
const memorySettings = new Map<string, Record<string, unknown>>();

let idCounter = 0;
function createId(): string {
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      const id = crypto.randomUUID();
      if (id) return id;
    }
  } catch {
    /* fall through to counter fallback */
  }
  idCounter += 1;
  return `conn-${Date.now().toString(36)}-${idCounter}`;
}

// ---------------------------------------------------------------------------
// DB helpers (best-effort, never throw)
// ---------------------------------------------------------------------------

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS collector_connections (
  id TEXT PRIMARY KEY,
  client_id INTEGER,
  provider TEXT,
  name TEXT,
  status TEXT,
  credentials JSONB,
  last_run_at TEXT,
  last_run_summary JSONB,
  error_message TEXT,
  created_at TEXT,
  updated_at TEXT
)`;

function canQuery(db: any): boolean {
  return (
    !!db &&
    (typeof db.execute === 'function' || typeof db.query === 'function')
  );
}

function tryExecute(
  db: any,
  sql: string,
  params?: unknown[],
): Promise<unknown> | unknown {
  if (!db) return undefined;
  if (typeof db.execute === 'function') {
    return params !== undefined ? db.execute(sql, params) : db.execute(sql);
  }
  if (typeof db.query === 'function') {
    return params !== undefined ? db.query(sql, params) : db.query(sql);
  }
  return undefined;
}

async function tryCreateTable(db: any): Promise<void> {
  if (!db || !canQuery(db)) return;
  try {
    if (typeof db.execute === 'function') {
      await db.execute(CREATE_TABLE_SQL);
    } else if (typeof db.query === 'function') {
      await db.query(CREATE_TABLE_SQL);
    }
  } catch {
    /* best-effort */
  }
}

function extractRows(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    const rows = (result as any).rows;
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

function extractAffectedCount(result: unknown): number {
  if (!result || typeof result !== 'object') return 0;
  const r = result as any;
  const n = Number(r.changes ?? r.affectedRows ?? r.rowCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseJsonObject(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === 'object') {
    return value as Record<string, string>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function toProvider(value: unknown): CollectorProvider {
  const v = String(value ?? '');
  return (PROVIDER_VALUES.includes(v) ? v : 'http-api') as CollectorProvider;
}

function toStatus(value: unknown): CollectorConnection['status'] {
  const v = String(value ?? '');
  if (v === 'connected' || v === 'error' || v === 'disconnected') return v;
  return 'disconnected';
}

function toSummary(value: unknown): CollectorConnection['lastRunSummary'] {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as CollectorConnection['lastRunSummary'])
        : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as CollectorConnection['lastRunSummary'];
  }
  return null;
}

/** Defensive copy — guarantees credential values never leak into results. */
function toPublicConnection(connection: CollectorConnection): CollectorConnection {
  return {
    id: connection.id,
    clientId: connection.clientId,
    provider: connection.provider,
    name: connection.name,
    status: connection.status,
    lastRunAt: connection.lastRunAt,
    lastRunSummary: connection.lastRunSummary,
    errorMessage: connection.errorMessage,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
  };
}

function rowToConnection(row: any): CollectorConnection {
  const now = new Date().toISOString();
  return {
    id: String(row?.id ?? ''),
    clientId: Number(row?.client_id ?? row?.clientId ?? 0),
    provider: toProvider(row?.provider),
    name: String(row?.name ?? ''),
    status: toStatus(row?.status),
    lastRunAt: row?.last_run_at ?? row?.lastRunAt ?? null,
    lastRunSummary: toSummary(row?.last_run_summary ?? row?.lastRunSummary),
    errorMessage: row?.error_message ?? row?.errorMessage ?? null,
    createdAt: String(row?.created_at ?? row?.createdAt ?? now),
    updatedAt: String(row?.updated_at ?? row?.updatedAt ?? now),
  };
}

async function loadConnection(
  id: string,
  clientId: number,
  db?: any,
): Promise<
  | {
      connection: CollectorConnection;
      credentials: Record<string, string>;
      settings: Record<string, unknown>;
    }
  | undefined
> {
  const mem = memoryStore.find(
    (c) => c.id === id && c.clientId === clientId,
  );
  if (mem) {
    return {
      connection: mem,
      credentials: memoryCredentials.get(id) ?? {},
      settings: memorySettings.get(id) ?? {},
    };
  }
  if (db && canQuery(db)) {
    try {
      await tryCreateTable(db);
      const result = await tryExecute(
        db,
        'SELECT * FROM collector_connections WHERE id = ? AND client_id = ?',
        [id, clientId],
      );
      const rows = extractRows(result);
      if (rows.length > 0 && rows[0]) {
        const row = rows[0];
        return {
          connection: rowToConnection(row),
          credentials: parseJsonObject(row.credentials),
          settings: {},
        };
      }
    } catch {
      /* fall through to memory */
    }
  }
  return undefined;
}

function updateConnectionStatus(
  id: string,
  clientId: number,
  patch: {
    status: CollectorConnection['status'];
    errorMessage?: string | null;
  },
  at?: string,
): CollectorConnection | undefined {
  const connection = memoryStore.find(
    (c) => c.id === id && c.clientId === clientId,
  );
  if (!connection) return undefined;
  connection.status = patch.status;
  if (patch.errorMessage !== undefined) {
    connection.errorMessage = patch.errorMessage;
  }
  connection.updatedAt = at ?? new Date().toISOString();
  return connection;
}

async function mirrorStatusToDb(
  db: any,
  connection: CollectorConnection,
): Promise<void> {
  if (!db || !canQuery(db)) return;
  try {
    await tryExecute(
      db,
      'UPDATE collector_connections SET status = ?, error_message = ?, updated_at = ? WHERE id = ?',
      [
        connection.status,
        connection.errorMessage,
        connection.updatedAt,
        connection.id,
      ],
    );
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Connection CRUD
// ---------------------------------------------------------------------------

/**
 * List connections for a client. Best-effort DB read; falls back to the
 * in-memory store. Credential values are never included in the results.
 */
export async function listCollectorConnections(
  clientId: number,
  db?: any,
): Promise<CollectorConnection[]> {
  if (db && canQuery(db)) {
    try {
      await tryCreateTable(db);
      const result = await tryExecute(
        db,
        'SELECT * FROM collector_connections WHERE client_id = ? ORDER BY created_at DESC',
        [clientId],
      );
      const rows = extractRows(result);
      if (rows.length > 0) {
        return rows
          .map((r) => toPublicConnection(rowToConnection(r)))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }
    } catch {
      /* fall back to memory */
    }
  }
  return memoryStore
    .filter((c) => c.clientId === clientId)
    .map(toPublicConnection)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Create or upsert (by provider + clientId + name) a connection.
 * Validates the provider and that every manifest-required credential is
 * present/non-empty. DB writes are best-effort and never throw.
 */
export async function saveCollectorConnection(
  input: CollectorConnectionInput,
  db?: any,
): Promise<CollectorConnection> {
  const provider = input.provider;
  if (!PROVIDER_SLUGS.includes(provider)) {
    throw new Error(`Unknown evidence collector provider: ${provider}`);
  }
  const manifest = getCollectorProvider(provider);
  if (!manifest) {
    throw new Error(`Evidence collector provider not configured: ${provider}`);
  }
  const credentials = input.credentials ?? {};
  const settings = input.settings ?? {};

  for (const field of manifest.authentication.fields) {
    if (field.required) {
      const value = credentials[field.key];
      if (value === undefined || value === null || value === '') {
        throw new Error(`Missing required credential field: ${field.key}`);
      }
    }
  }

  const nowIso = new Date().toISOString();
  const existingIndex = memoryStore.findIndex(
    (c) =>
      c.clientId === input.clientId &&
      c.provider === provider &&
      c.name === input.name,
  );

  let connection: CollectorConnection;
  if (existingIndex >= 0) {
    connection = memoryStore[existingIndex];
    connection.name = input.name;
    connection.updatedAt = nowIso;
    memoryCredentials.set(connection.id, credentials);
    memorySettings.set(connection.id, settings);
  } else {
    connection = {
      id: createId(),
      clientId: input.clientId,
      provider,
      name: input.name,
      status: 'disconnected',
      lastRunAt: null,
      lastRunSummary: null,
      errorMessage: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    memoryStore.push(connection);
    memoryCredentials.set(connection.id, credentials);
    memorySettings.set(connection.id, settings);
  }

  if (db && canQuery(db)) {
    try {
      await tryCreateTable(db);
      const existing = await tryExecute(
        db,
        'SELECT id FROM collector_connections WHERE provider = ? AND client_id = ? AND name = ?',
        [provider, input.clientId, input.name],
      );
      const existingRows = extractRows(existing);
      if (existingRows.length > 0 && existingRows[0]?.id != null) {
        await tryExecute(
          db,
          'UPDATE collector_connections SET name = ?, status = ?, credentials = ?, last_run_at = ?, last_run_summary = ?, error_message = ?, updated_at = ? WHERE id = ?',
          [
            connection.name,
            connection.status,
            JSON.stringify(credentials),
            connection.lastRunAt,
            connection.lastRunSummary !== null
              ? JSON.stringify(connection.lastRunSummary)
              : null,
            connection.errorMessage,
            connection.updatedAt,
            String(existingRows[0].id),
          ],
        );
      } else {
        await tryExecute(
          db,
          'INSERT INTO collector_connections (id, client_id, provider, name, status, credentials, last_run_at, last_run_summary, error_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            connection.id,
            connection.clientId,
            connection.provider,
            connection.name,
            connection.status,
            JSON.stringify(credentials),
            connection.lastRunAt,
            connection.lastRunSummary !== null
              ? JSON.stringify(connection.lastRunSummary)
              : null,
            connection.errorMessage,
            connection.createdAt,
            connection.updatedAt,
          ],
        );
      }
    } catch {
      /* DB is best-effort — never fail the save because of it */
    }
  }

  return toPublicConnection(connection);
}

/** Remove a connection; returns true when a row was removed. */
export async function deleteCollectorConnection(
  id: string,
  clientId: number,
  db?: any,
): Promise<boolean> {
  const index = memoryStore.findIndex(
    (c) => c.id === id && c.clientId === clientId,
  );
  let removed = index >= 0;
  if (removed) {
    memoryStore.splice(index, 1);
    memoryCredentials.delete(id);
    memorySettings.delete(id);
  }
  if (db && canQuery(db)) {
    try {
      const result = await tryExecute(
        db,
        'DELETE FROM collector_connections WHERE id = ? AND client_id = ?',
        [id, clientId],
      );
      if (extractAffectedCount(result) > 0) removed = true;
    } catch {
      /* best-effort */
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------
// Fetch injection for deterministic tests
// ---------------------------------------------------------------------------

/**
 * Build a collector with an injected fetch for a provider. The built-in
 * collectors accept an injectable fetch via their createXxxEvidenceCollector
 * factories; the modules are loaded lazily with literal import specifiers so
 * bundlers can statically analyze them, while the static import surface of
 * this file stays limited to the registry + types.
 */
async function createCollectorWithFetch(
  provider: CollectorProvider,
  fetchImpl: any,
): Promise<EvidenceCollector | undefined> {
  try {
    let module: any;
    switch (provider) {
      case 'aws':
        module = await import('./integrations/aws/collector');
        break;
      case 'azure':
        module = await import('./integrations/azure/collector');
        break;
      case 'gcp':
        module = await import('./integrations/gcp/collector');
        break;
      case 'github':
        module = await import('./integrations/github/collector');
        break;
      case 'http-api':
        module = await import('./integrations/http-api/collector');
        break;
      default:
        return undefined;
    }
    const factoryName = `create${capitalizeProvider(provider)}EvidenceCollector`;
    const factory = module?.[factoryName];
    if (typeof factory === 'function') {
      const collector = factory(fetchImpl);
      if (collector && typeof collector.collect === 'function') {
        return collector as EvidenceCollector;
      }
    }
  } catch {
    /* fall back to the registered default collector */
  }
  return undefined;
}

function capitalizeProvider(provider: CollectorProvider): string {
  if (provider === 'http-api') return 'HttpApi';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

// ---------------------------------------------------------------------------
// Test & run
// ---------------------------------------------------------------------------

/**
 * Test a connection by running its collector with `limit: 1`. Marks the
 * connection connected on any successful collect (even 0 items) and error on
 * failure. Never throws.
 */
export async function testCollectorConnection(
  id: string,
  clientId: number,
  db?: any,
  fetchImpl?: any,
): Promise<TestConnectionResult> {
  const checkedAt = new Date().toISOString();
  try {
    const stored = await loadConnection(id, clientId, db);
    if (!stored) {
      return { ok: false, message: 'Connection not found', checkedAt };
    }
    const { connection, credentials, settings } = stored;
    const provider = connection.provider;

    let collector = resolveCollector(provider);
    if (fetchImpl !== undefined && fetchImpl !== null) {
      const injected = await createCollectorWithFetch(provider, fetchImpl);
      if (injected) collector = injected;
    }
    if (!collector) {
      updateConnectionStatus(
        id,
        clientId,
        { status: 'error', errorMessage: `Provider not configured: ${provider}` },
        checkedAt,
      );
      return {
        ok: false,
        message: `Provider not configured: ${provider}`,
        checkedAt,
      };
    }

    const context: IntegrationContext = {
      connectionId: id,
      userId: 'system',
      organizationId: undefined,
      credentials,
      settings,
    };

    const evidence = await collector.collect(context, { limit: 1 });
    const items = Array.isArray(evidence) ? evidence : [];
    const count = items.length;
    // A collector that reports only error evidence means the source could not
    // be reached (e.g. an injected fetch that failed) -- treat it as a failed
    // connection rather than a successful (but useless) test.
    const allErrored = count > 0 && items.every((e) => e.status === 'error');
    if (allErrored) {
      const message = (items[0]?.description ?? items[0]?.title ?? 'Connection check failed') as string;
      updateConnectionStatus(
        id,
        clientId,
        { status: 'error', errorMessage: message },
        checkedAt,
      );
      return { ok: false, message, checkedAt };
    }
    const updated = updateConnectionStatus(
      id,
      clientId,
      { status: 'connected', errorMessage: null },
      checkedAt,
    );
    if (updated && db) await mirrorStatusToDb(db, updated);
    return {
      ok: true,
      message: `Connected - ${count} evidence items retrieved`,
      checkedAt,
    };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    const provider =
      memoryStore.find((c) => c.id === id)?.provider ?? 'aws';
    updateConnectionStatus(
      id,
      clientId,
      { status: 'error', errorMessage: message },
      checkedAt,
    );
    if (/not configured/i.test(message)) {
      return {
        ok: false,
        message: `Provider not configured: ${provider}`,
        checkedAt,
      };
    }
    return { ok: false, message, checkedAt };
  }
}

/**
 * Run a connection's collector for real (7-day default evidence TTL),
 * summarize the evidence by status, and persist run metadata. Never throws —
 * failures are returned as ok:false results.
 */
export async function runCollectorConnection(
  id: string,
  clientId: number,
  db?: any,
  options?: { now?: Date; fetchImpl?: any },
): Promise<RunCollectorResult> {
  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();
  const failedResult = (
    provider: CollectorProvider,
    message: string,
  ): RunCollectorResult => ({
    connectionId: id,
    provider,
    ok: false,
    total: 0,
    passed: 0,
    warning: 0,
    failed: 0,
    error: 0,
    message,
    completedAt: nowIso,
    evidence: [],
  });

  try {
    const stored = await loadConnection(id, clientId, db);
    if (!stored) {
      return failedResult('aws', 'Connection not found');
    }
    const { connection, credentials, settings } = stored;
    const provider = connection.provider;

    let collector = resolveCollector(provider);
    if (options?.fetchImpl !== undefined && options.fetchImpl !== null) {
      const injected = await createCollectorWithFetch(provider, options.fetchImpl);
      if (injected) collector = injected;
    }
    if (!collector) {
      const result = failedResult(
        provider,
        `Provider not configured: ${provider}`,
      );
      const updated = updateConnectionStatus(
        id,
        clientId,
        { status: 'error', errorMessage: result.message },
        nowIso,
      );
      if (updated && db) await mirrorStatusToDb(db, updated);
      return result;
    }

    const context: IntegrationContext = {
      connectionId: id,
      userId: 'system',
      organizationId: undefined,
      credentials,
      settings,
    };

    let evidence: CollectedEvidence[] = [];
    try {
      const collected = await collector.collect(context, {
        now,
        evidenceTtlMs: { default: 7 * 24 * 60 * 60 * 1000 }, // 7-day default TTL
      });
      evidence = Array.isArray(collected) ? collected : [];
    } catch (err: any) {
      const message = err?.message ?? String(err);
      const result = failedResult(provider, message);
      const updated = updateConnectionStatus(
        id,
        clientId,
        { status: 'error', errorMessage: message },
        nowIso,
      );
      if (updated && db) await mirrorStatusToDb(db, updated);
      return result;
    }

    let passed = 0;
    let warning = 0;
    let failed = 0;
    let error = 0;
    for (const item of evidence) {
      switch (item.status) {
        case 'pass':
          passed += 1;
          break;
        case 'warning':
          warning += 1;
          break;
        case 'fail':
          failed += 1;
          break;
        default:
          // 'error' and any unknown status count as error
          error += 1;
          break;
      }
    }
    const total = evidence.length;
    const summary = { total, passed, warning, failed, error };
    const allErrored = total > 0 && error === total;
    const status: CollectorConnection['status'] =
      allErrored || error > 0 ? 'error' : 'connected';

    const updated = updateConnectionStatus(id, clientId, { status }, nowIso);
    if (updated) {
      updated.lastRunAt = nowIso;
      updated.lastRunSummary = summary;
      if (db) await mirrorStatusToDb(db, updated);
    }

    return {
      connectionId: id,
      provider,
      ok: !allErrored,
      total,
      passed,
      warning,
      failed,
      error,
      message: allErrored
        ? (evidence[0]?.description ?? evidence[0]?.title ?? `Collection failed for ${provider}`)
        : `Collected ${total} evidence item(s) from ${provider}`,
      completedAt: nowIso,
      evidence: evidence.map((item) => ({
        id: item.id,
        controlId: item.controlId,
        type: item.type,
        status: item.status,
        title: item.title,
        collectedAt: (item.collectedAt instanceof Date
          ? item.collectedAt
          : now
        ).toISOString(),
      })),
    };
  } catch (err: any) {
    return failedResult('aws', err?.message ?? String(err));
  }
}

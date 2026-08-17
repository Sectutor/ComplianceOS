import crypto from "crypto";
import { getDb } from "../../db";
import { sql, type SQL } from "drizzle-orm";
import { WEBHOOK_EVENT_CATALOG } from "./webhookEvents";

export interface WebhookSubscription {
  id: number;
  clientId: number;
  name: string;
  targetUrl: string;
  secret: string; // Used for HMAC-SHA256 signature
  events: string[]; // e.g. ["evidence.expired", "control.failed", "risk.created"]
  status: "active" | "disabled";
  createdAt: string;
}

export interface WebhookDelivery {
  id?: number;
  subscriptionId: number;
  event: string;
  payload: any;
  statusCode: number;
  responseBody?: string;
  durationMs: number;
  success: boolean;
  executedAt: string;
}

export interface WebhookDispatchOptions {
  /** Number of retries AFTER the initial attempt (default 2 → 3 attempts max). */
  maxRetries?: number;
  /** Delays (ms) between retries; default [500, 2000]. Tests pass [] for zero delay. */
  retryDelaysMs?: number[];
  /** Injectable fetch for unit tests (defaults to globalThis.fetch). */
  fetchImpl?: typeof fetch;
}

/** Retry budget: 1 initial attempt + up to 2 retries. */
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAYS_MS = [500, 2000];

/** Keys matching this regex are redacted from webhook payloads before delivery/logging. */
const SENSITIVE_KEY_PATTERN = /secret|password|api[_-]?key|token|authorization/i;

let tablesEnsured = false;

export async function ensureWebhookTablesExist(dbArg?: any) {
  if (tablesEnsured) return;
  const db = dbArg ?? (await getDb());
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        target_url VARCHAR(1024) NOT NULL,
        secret VARCHAR(255) NOT NULL,
        events JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id SERIAL PRIMARY KEY,
        subscription_id INTEGER NOT NULL,
        event VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status_code INTEGER NOT NULL,
        response_body TEXT,
        duration_ms INTEGER NOT NULL,
        success BOOLEAN NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ws_client ON webhook_subscriptions(client_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wd_sub ON webhook_deliveries(subscription_id);`);
    tablesEnsured = true;
  } catch (err) {
    console.error("[WebhookRegistry] Error creating webhook tables:", err);
  }
}

function mapSubscriptionRow(r: any): WebhookSubscription {
  return {
    id: r.id,
    clientId: r.clientId,
    name: r.name,
    targetUrl: r.targetUrl,
    secret: r.secret,
    events: Array.isArray(r.events) ? r.events : JSON.parse(r.events || "[]"),
    status: r.status,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

/** Event-level filter: wildcard "*" or an explicit match (JS-side, DB handles status). */
function filterSubscriptionsForEvent(
  rows: any[],
  event: string
): WebhookSubscription[] {
  return (rows ?? [])
    .map(mapSubscriptionRow)
    .filter((sub) => sub.events.includes("*") || sub.events.includes(event));
}

/**
 * Register a new webhook subscription.
 */
export async function createWebhookSubscription(data: {
  clientId: number;
  name: string;
  targetUrl: string;
  events: string[];
  secret?: string;
}): Promise<WebhookSubscription> {
  const db = await getDb();
  await ensureWebhookTablesExist();

  const secret = data.secret || crypto.randomBytes(32).toString("hex");

  const result = await db.execute(sql`
    INSERT INTO webhook_subscriptions (client_id, name, target_url, secret, events, status)
    VALUES (${data.clientId}, ${data.name}, ${data.targetUrl}, ${secret}, ${JSON.stringify(data.events)}::jsonb, 'active')
    RETURNING id, client_id as "clientId", name, target_url as "targetUrl", secret, events, status, created_at as "createdAt";
  `);

  const row = (result.rows || result)[0] as any;
  return mapSubscriptionRow(row);
}

/**
 * Get active subscriptions for a client and event type.
 */
export async function getActiveSubscriptionsForEvent(
  clientId: number,
  event: string
): Promise<WebhookSubscription[]> {
  const db = await getDb();
  await ensureWebhookTablesExist();

  const result = await db.execute(sql`
    SELECT id, client_id as "clientId", name, target_url as "targetUrl", secret, events, status, created_at as "createdAt"
    FROM webhook_subscriptions
    WHERE client_id = ${clientId} AND status = 'active';
  `);

  const rows = (result.rows || result) as any[];
  return filterSubscriptionsForEvent(rows, event);
}

/**
 * Update a webhook subscription (name / targetUrl / events / status).
 * Returns the updated row, or null when the id does not exist.
 */
export async function updateWebhookSubscription(
  id: number,
  patch: {
    name?: string;
    targetUrl?: string;
    events?: string[];
    status?: "active" | "disabled";
  }
): Promise<WebhookSubscription | null> {
  const db = await getDb();
  await ensureWebhookTablesExist();

  const assignments: SQL[] = [];
  if (patch.name !== undefined) assignments.push(sql`name = ${patch.name}`);
  if (patch.targetUrl !== undefined) assignments.push(sql`target_url = ${patch.targetUrl}`);
  if (patch.events !== undefined) assignments.push(sql`events = ${JSON.stringify(patch.events)}::jsonb`);
  if (patch.status !== undefined) assignments.push(sql`status = ${patch.status}`);

  let result;
  if (assignments.length === 0) {
    // No fields to change — fetch the current row so callers get a stable shape.
    result = await db.execute(sql`
      SELECT id, client_id as "clientId", name, target_url as "targetUrl", secret, events, status, created_at as "createdAt"
      FROM webhook_subscriptions
      WHERE id = ${id};
    `);
  } else {
    result = await db.execute(sql`
      UPDATE webhook_subscriptions
      SET ${sql.join(assignments, sql`, `)}
      WHERE id = ${id}
      RETURNING id, client_id as "clientId", name, target_url as "targetUrl", secret, events, status, created_at as "createdAt";
    `);
  }

  const row = (result.rows || result)[0] as any;
  return row ? mapSubscriptionRow(row) : null;
}

/**
 * Hard-delete a webhook subscription and its delivery history.
 * Returns true when a subscription was removed.
 */
export async function deleteWebhookSubscription(id: number): Promise<boolean> {
  const db = await getDb();
  await ensureWebhookTablesExist();

  await db.execute(sql`DELETE FROM webhook_deliveries WHERE subscription_id = ${id};`);
  const result = await db.execute(sql`
    DELETE FROM webhook_subscriptions WHERE id = ${id} RETURNING id;
  `);

  const rows = (result.rows || result) as any[];
  if (Array.isArray(rows)) return rows.length > 0;
  return Boolean((result as any).rowCount);
}

/**
 * List the webhook event catalog (single source of truth: webhookEvents.ts).
 */
export function listWebhookEventCatalog(): typeof WEBHOOK_EVENT_CATALOG {
  return WEBHOOK_EVENT_CATALOG;
}

/**
 * Recursively redact sensitive values (secret/password/api key/token/
 * authorization keys) from a payload. Arrays are scrubbed element-wise;
 * plain values pass through untouched. Depth-limited to protect against
 * pathological nesting.
 */
export function scrubSensitiveData(value: any, depth = 0): any {
  if (depth > 12) return value;
  if (Array.isArray(value)) {
    return value.map((v) => scrubSensitiveData(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = scrubSensitiveData(val, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/**
 * Generate HMAC SHA-256 signature for webhook payload.
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Dispatch event payload to all subscribed endpoints.
 *
 * Hardened (scorecard #15):
 *  - bounded retries with exponential backoff (default 2 retries, [500, 2000]ms),
 *    4xx responses are permanent and never retried; only network errors and 5xx are.
 *  - payload + delivery log are sanitized (secrets redacted).
 *  - NEVER throws: DB failures are logged once and HTTP delivery is attempted
 *    where possible; every DB write inside is individually guarded.
 */
export async function dispatchWebhookEvent(
  clientId: number,
  event: string,
  data: any,
  options: WebhookDispatchOptions = {}
): Promise<{
  event: string;
  dispatchedCount: number;
  successCount: number;
  failureCount: number;
}> {
  const maxRetries =
    options.maxRetries !== undefined && options.maxRetries >= 0
      ? options.maxRetries
      : DEFAULT_MAX_RETRIES;
  const retryDelaysMs =
    options.retryDelaysMs !== undefined
      ? options.retryDelaysMs
      : DEFAULT_RETRY_DELAYS_MS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  let db: any = null;
  let subscriptions: WebhookSubscription[] = [];
  try {
    db = await getDb();
    await ensureWebhookTablesExist(db);
    const result = await db.execute(sql`
      SELECT id, client_id as "clientId", name, target_url as "targetUrl", secret, events, status, created_at as "createdAt"
      FROM webhook_subscriptions
      WHERE client_id = ${clientId} AND status = 'active';
    `);
    subscriptions = filterSubscriptionsForEvent(result.rows || result, event);
  } catch (err) {
    // Graceful degradation: DB is unavailable — nothing to dispatch against.
    console.error(
      `[WebhookRegistry] DB unavailable for webhook "${event}" (client #${clientId}); skipping:`,
      err
    );
    return { event, dispatchedCount: 0, successCount: 0, failureCount: 0 };
  }

  if (subscriptions.length === 0) {
    return { event, dispatchedCount: 0, successCount: 0, failureCount: 0 };
  }

  const timestamp = new Date().toISOString();
  // Sanitize BEFORE building the payload and BEFORE logging the delivery.
  const payloadObject = {
    event,
    timestamp,
    clientId,
    data: scrubSensitiveData(data),
  };
  let payloadString: string;
  try {
    payloadString = JSON.stringify(payloadObject);
  } catch {
    payloadString = JSON.stringify({
      event,
      timestamp,
      clientId,
      data: "[unserializable]",
    });
  }

  let successCount = 0;
  let failureCount = 0;

  for (const sub of subscriptions) {
    const signature = generateWebhookSignature(payloadString, sub.secret);
    const startTime = Date.now();

    let statusCode = 0;
    let responseBody = "";
    let isSuccess = false;

    // Bounded retry loop: attempt 0 is the initial call, up to maxRetries retries.
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delayIndex = Math.min(attempt - 1, retryDelaysMs.length - 1);
        const delay = retryDelaysMs[delayIndex] ?? 0;
        if (delay > 0) await sleep(delay);
      }

      try {
        const response = await fetchImpl(sub.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ComplianceOS-Event": event,
            "X-ComplianceOS-Signature": `sha256=${signature}`,
            "X-ComplianceOS-Timestamp": timestamp,
          },
          body: payloadString,
        });

        statusCode = response.status;
        responseBody = await response.text().catch(() => "");
        isSuccess = response.ok;

        if (isSuccess) break; // 2xx/3xx — done
        if (statusCode >= 400 && statusCode < 500) break; // permanent — no retry
        // 5xx — fall through and retry (attempt < maxRetries)
      } catch (err: any) {
        // Network error / fetch threw — eligible for retry.
        statusCode = 500;
        responseBody = err?.message || "Network request failed";
        isSuccess = false;
      }
    }

    if (isSuccess) successCount++;
    else failureCount++;

    const durationMs = Date.now() - startTime;

    // Log delivery attempt — one bad insert must not abort remaining deliveries.
    try {
      if (db) {
        await db.execute(sql`
          INSERT INTO webhook_deliveries (subscription_id, event, payload, status_code, response_body, duration_ms, success)
          VALUES (${sub.id}, ${event}, ${payloadString}::jsonb, ${statusCode}, ${responseBody.substring(0, 1000)}, ${durationMs}, ${isSuccess});
        `);
      }
    } catch (err) {
      console.error(`[WebhookRegistry] Failed to log delivery for subscription #${sub.id}:`, err);
    }
  }

  return {
    event,
    dispatchedCount: subscriptions.length,
    successCount,
    failureCount,
  };
}

/**
 * List all webhook subscriptions for a client.
 */
export async function getClientWebhookSubscriptions(clientId: number): Promise<WebhookSubscription[]> {
  const db = await getDb();
  await ensureWebhookTablesExist();

  const result = await db.execute(sql`
    SELECT id, client_id as "clientId", name, target_url as "targetUrl", secret, events, status, created_at as "createdAt"
    FROM webhook_subscriptions
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC;
  `);

  const rows = (result.rows || result) as any[];
  return rows.map(mapSubscriptionRow);
}

/**
 * List delivery history for a client's webhooks.
 */
export async function getClientWebhookDeliveries(clientId: number, limit = 50): Promise<WebhookDelivery[]> {
  const db = await getDb();
  await ensureWebhookTablesExist();

  const result = await db.execute(sql`
    SELECT d.id, d.subscription_id as "subscriptionId", d.event, d.payload,
           d.status_code as "statusCode", d.response_body as "responseBody",
           d.duration_ms as "durationMs", d.success, d.executed_at as "executedAt"
    FROM webhook_deliveries d
    JOIN webhook_subscriptions s ON d.subscription_id = s.id
    WHERE s.client_id = ${clientId}
    ORDER BY d.executed_at DESC
    LIMIT ${limit};
  `);

  const rows = (result.rows || result) as any[];
  return rows.map((r) => ({
    id: r.id,
    subscriptionId: r.subscriptionId,
    event: r.event,
    payload: r.payload,
    statusCode: r.statusCode,
    responseBody: r.responseBody,
    durationMs: r.durationMs,
    success: r.success,
    executedAt: new Date(r.executedAt).toISOString(),
  }));
}

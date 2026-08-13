import crypto from "crypto";
import { getDb } from "../../db";
import { sql } from "drizzle-orm";

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

let tablesEnsured = false;

export async function ensureWebhookTablesExist() {
  if (tablesEnsured) return;
  const db = await getDb();
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
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    targetUrl: row.targetUrl,
    secret: row.secret,
    events: Array.isArray(row.events) ? row.events : JSON.parse(row.events || "[]"),
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString(),
  };
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
  return rows
    .map((r) => ({
      id: r.id,
      clientId: r.clientId,
      name: r.name,
      targetUrl: r.targetUrl,
      secret: r.secret,
      events: Array.isArray(r.events) ? r.events : JSON.parse(r.events || "[]"),
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
    }))
    .filter((sub) => sub.events.includes("*") || sub.events.includes(event));
}

/**
 * Generate HMAC SHA-256 signature for webhook payload.
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Dispatch event payload to all subscribed endpoints.
 */
export async function dispatchWebhookEvent(
  clientId: number,
  event: string,
  data: any
): Promise<{
  event: string;
  dispatchedCount: number;
  successCount: number;
  failureCount: number;
}> {
  await ensureWebhookTablesExist();
  const db = await getDb();

  const subscriptions = await getActiveSubscriptionsForEvent(clientId, event);
  if (subscriptions.length === 0) {
    return { event, dispatchedCount: 0, successCount: 0, failureCount: 0 };
  }

  const timestamp = new Date().toISOString();
  const payloadObject = {
    event,
    timestamp,
    clientId,
    data,
  };
  const payloadString = JSON.stringify(payloadObject);

  let successCount = 0;
  let failureCount = 0;

  for (const sub of subscriptions) {
    const signature = generateWebhookSignature(payloadString, sub.secret);
    const startTime = Date.now();

    let statusCode = 0;
    let responseBody = "";
    let isSuccess = false;

    try {
      const response = await fetch(sub.targetUrl, {
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

      if (isSuccess) successCount++;
      else failureCount++;
    } catch (err: any) {
      statusCode = 500;
      responseBody = err.message || "Network request failed";
      failureCount++;
    }

    const durationMs = Date.now() - startTime;

    // Log delivery attempt
    await db.execute(sql`
      INSERT INTO webhook_deliveries (subscription_id, event, payload, status_code, response_body, duration_ms, success)
      VALUES (${sub.id}, ${event}, ${payloadString}::jsonb, ${statusCode}, ${responseBody.substring(0, 1000)}, ${durationMs}, ${isSuccess});
    `);
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
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    name: r.name,
    targetUrl: r.targetUrl,
    secret: r.secret,
    events: Array.isArray(r.events) ? r.events : JSON.parse(r.events || "[]"),
    status: r.status,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
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

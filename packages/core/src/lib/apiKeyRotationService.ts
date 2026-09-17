import crypto from "crypto";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export interface ApiKeyRecord {
  id: number;
  clientId: number;
  keyName: string;
  keyPrefix: string;
  activeKeyHash: string;
  rotatedKeyHash?: string;
  gracePeriodEnd?: string;
  createdAt: string;
  rotatedAt?: string;
}

let tableEnsured = false;

export async function ensureApiKeysTableExists() {
  if (tableEnsured) return;
  const db = await getDb();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        key_name VARCHAR(100) NOT NULL,
        key_prefix VARCHAR(20) NOT NULL,
        active_key_hash VARCHAR(255) NOT NULL,
        rotated_key_hash VARCHAR(255),
        grace_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        rotated_at TIMESTAMP
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ak_client ON api_keys(client_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ak_prefix ON api_keys(key_prefix);`);
    tableEnsured = true;
  } catch (err) {
    console.error("[ApiKeyRotationService] Error creating api_keys table:", err);
  }
}

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generate a new API key for a client.
 */
export async function createApiKey(
  clientId: number,
  keyName: string
): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  await ensureApiKeysTableExists();
  const db = await getDb();

  const secretPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `cos_${clientId}_${secretPart}`;
  const keyPrefix = rawKey.substring(0, 12);
  const activeKeyHash = hashKey(rawKey);

  const result = await db.execute(sql`
    INSERT INTO api_keys (client_id, key_name, key_prefix, active_key_hash)
    VALUES (${clientId}, ${keyName}, ${keyPrefix}, ${activeKeyHash})
    RETURNING id, client_id as "clientId", key_name as "keyName", key_prefix as "keyPrefix",
              active_key_hash as "activeKeyHash", created_at as "createdAt";
  `);

  const row = (result.rows || result)[0] as any;
  const record: ApiKeyRecord = {
    id: row.id,
    clientId: row.clientId,
    keyName: row.keyName,
    keyPrefix: row.keyPrefix,
    activeKeyHash: row.activeKeyHash,
    createdAt: new Date(row.createdAt).toISOString(),
  };

  return { record, rawKey };
}

/**
 * Rotate an existing API key, preserving the previous key during a grace period (default 48 hours).
 */
export async function rotateApiKey(
  clientId: number,
  keyId: number,
  gracePeriodHours = 48
): Promise<{ record: ApiKeyRecord; newRawKey: string }> {
  await ensureApiKeysTableExists();
  const db = await getDb();

  // Fetch existing key
  const existingRes = await db.execute(sql`
    SELECT id, active_key_hash FROM api_keys WHERE id = ${keyId} AND client_id = ${clientId};
  `);
  const existing = (existingRes.rows || existingRes)[0] as any;
  if (!existing) {
    throw new Error(`API key #${keyId} not found for client #${clientId}`);
  }

  const secretPart = crypto.randomBytes(24).toString("hex");
  const newRawKey = `cos_${clientId}_${secretPart}`;
  const newKeyPrefix = newRawKey.substring(0, 12);
  const newActiveHash = hashKey(newRawKey);
  const oldActiveHash = existing.active_key_hash;

  const gracePeriodEnd = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);
  const rotatedAt = new Date();

  const updateRes = await db.execute(sql`
    UPDATE api_keys
    SET active_key_hash = ${newActiveHash},
        rotated_key_hash = ${oldActiveHash},
        key_prefix = ${newKeyPrefix},
        grace_period_end = ${gracePeriodEnd.toISOString()},
        rotated_at = ${rotatedAt.toISOString()}
    WHERE id = ${keyId} AND client_id = ${clientId}
    RETURNING id, client_id as "clientId", key_name as "keyName", key_prefix as "keyPrefix",
              active_key_hash as "activeKeyHash", rotated_key_hash as "rotatedKeyHash",
              grace_period_end as "gracePeriodEnd", created_at as "createdAt", rotated_at as "rotatedAt";
  `);

  const row = (updateRes.rows || updateRes)[0] as any;
  const record: ApiKeyRecord = {
    id: row.id,
    clientId: row.clientId,
    keyName: row.keyName,
    keyPrefix: row.keyPrefix,
    activeKeyHash: row.activeKeyHash,
    rotatedKeyHash: row.rotatedKeyHash,
    gracePeriodEnd: row.gracePeriodEnd ? new Date(row.gracePeriodEnd).toISOString() : undefined,
    createdAt: new Date(row.createdAt).toISOString(),
    rotatedAt: row.rotatedAt ? new Date(row.rotatedAt).toISOString() : undefined,
  };

  return { record, newRawKey };
}

/**
 * Validate an incoming API key against active keys or grace-period rotated keys.
 */
export async function validateApiKey(
  rawKey: string
): Promise<{ valid: boolean; clientId?: number; isGracePeriod?: boolean }> {
  await ensureApiKeysTableExists();
  const db = await getDb();

  const inputHash = hashKey(rawKey);
  const prefix = rawKey.substring(0, 12);

  const res = await db.execute(sql`
    SELECT id, client_id, active_key_hash, rotated_key_hash, grace_period_end
    FROM api_keys
    WHERE key_prefix = ${prefix} OR active_key_hash = ${inputHash} OR rotated_key_hash = ${inputHash};
  `);

  const rows = (res.rows || res) as any[];
  const now = new Date();

  for (const row of rows) {
    if (row.active_key_hash === inputHash) {
      return { valid: true, clientId: row.client_id, isGracePeriod: false };
    }

    if (row.rotated_key_hash === inputHash) {
      const graceEnd = row.grace_period_end ? new Date(row.grace_period_end) : null;
      if (graceEnd && graceEnd > now) {
        return { valid: true, clientId: row.client_id, isGracePeriod: true };
      }
    }
  }

  return { valid: false };
}

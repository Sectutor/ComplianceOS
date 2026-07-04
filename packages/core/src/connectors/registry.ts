import type { ConnectorDefinition, ConnectorConfig } from './types';
import { getDb } from '../db';
import { cloudConnections } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { encrypt, decrypt } from '../lib/crypto';

const definitions = new Map<string, ConnectorDefinition>();

export function registerConnector(def: ConnectorDefinition): void {
  definitions.set(def.id, def);
}

export function getConnector(type: string): ConnectorDefinition | undefined {
  return definitions.get(type);
}

export function listConnectors(): ConnectorDefinition[] {
  return Array.from(definitions.values());
}

function rowToConfig(row: any): ConnectorConfig {
  let payload: any = {};
  try {
    const decrypted = decrypt(row.credentials);
    payload = JSON.parse(decrypted);
  } catch {
    try {
      payload = typeof row.credentials === 'string'
        ? JSON.parse(row.credentials)
        : row.credentials ?? {};
    } catch {}
  }

  return {
    id: String(row.id),
    clientId: row.clientId,
    type: row.provider,
    name: row.name,
    enabled: row.status === 'enabled',
    schedule: payload.schedule ?? 'daily',
    credentials: payload.credentials ?? {},
    settings: payload.settings ?? {},
    lastRunAt: row.lastSyncAt,
    lastRunStatus: row.status === 'error' ? 'failed' : 'success',
  };
}

function configToPayload(config: Omit<ConnectorConfig, 'id' | 'clientId'>): string {
  return JSON.stringify({
    schedule: config.schedule,
    credentials: config.credentials,
    settings: config.settings,
  });
}

export async function getInstalledConnectors(clientId: number): Promise<ConnectorConfig[]> {
  const dbConn = await getDb();
  const rows = await dbConn
    .select()
    .from(cloudConnections)
    .where(eq(cloudConnections.clientId, clientId))
    .orderBy(desc(cloudConnections.createdAt));
  return rows.map(rowToConfig);
}

export async function saveConnectorConfig(
  config: Omit<ConnectorConfig, 'id' | 'lastRunAt' | 'lastRunStatus'>
): Promise<ConnectorConfig> {
  const dbConn = await getDb();
  const payload = configToPayload(config);
  const encryptedPayload = encrypt(payload);

  if ((config as any).id) {
    const [updated] = await dbConn
      .update(cloudConnections)
      .set({
        name: config.name,
        provider: config.type,
        credentials: encryptedPayload,
        status: config.enabled ? 'enabled' : 'disabled',
        updatedAt: new Date(),
      })
      .where(eq(cloudConnections.id, parseInt((config as any).id)))
      .returning();
    return rowToConfig(updated);
  } else {
    const [inserted] = await dbConn
      .insert(cloudConnections)
      .values({
        clientId: config.clientId,
        provider: config.type,
        name: config.name,
        credentials: encryptedPayload,
        region: null,
        status: config.enabled ? 'enabled' : 'disabled',
      })
      .returning();
    return rowToConfig(inserted);
  }
}

export async function deleteConnectorConfig(id: string): Promise<void> {
  const dbConn = await getDb();
  await dbConn.delete(cloudConnections).where(eq(cloudConnections.id, parseInt(id)));
}

export async function updateConnectorRunStatus(
  id: string,
  status: 'success' | 'failed',
  lastRunAt: Date,
): Promise<void> {
  const dbConn = await getDb();
  await dbConn
    .update(cloudConnections)
    .set({
      lastSyncAt: lastRunAt,
      status: status === 'success' ? 'connected' : 'error',
      updatedAt: new Date(),
    })
    .where(eq(cloudConnections.id, parseInt(id)));
}

export async function getAllEnabledConnectors(): Promise<ConnectorConfig[]> {
  const dbConn = await getDb();
  const rows = await dbConn
    .select()
    .from(cloudConnections)
    .where(eq(cloudConnections.status, 'enabled'));
  return rows.map(rowToConfig);
}

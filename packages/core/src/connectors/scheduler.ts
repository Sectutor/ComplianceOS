import { getAllEnabledConnectors, getConnector, updateConnectorRunStatus } from './registry';
import { getDb } from '../db';
import { evidence } from '../schema';
import type { ConnectorConfig } from './types';

const INTERVAL_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

function isDue(config: ConnectorConfig): boolean {
  if (!config.lastRunAt) return true;
  const interval = INTERVAL_MS[config.schedule] ?? INTERVAL_MS.daily;
  return Date.now() - new Date(config.lastRunAt).getTime() >= interval;
}

export async function runScheduledCollectors(): Promise<{
  ran: number;
  skipped: number;
  evidenceCollected: number;
  errors: string[];
}> {
  const configs = await getAllEnabledConnectors();
  let ran = 0;
  let skipped = 0;
  let evidenceCollected = 0;
  const errors: string[] = [];

  for (const cfg of configs) {
    if (!isDue(cfg)) {
      skipped++;
      continue;
    }
    try {
      const result = await runConnector(cfg.id);
      evidenceCollected += result.evidenceCollected;
      ran++;
    } catch (err: any) {
      errors.push('Connector ' + cfg.id + ' (' + cfg.name + '): ' + err.message);
      await updateConnectorRunStatus(cfg.id, 'failed', new Date());
      ran++;
    }
  }

  return { ran, skipped, evidenceCollected, errors };
}

export async function runConnector(configId: string): Promise<{
  success: boolean;
  evidenceCollected: number;
  summary: any[];
  errors: string[];
}> {
  const dbConn = await getDb();
  const configs = await getAllEnabledConnectors();
  const cfg = configs.find((c) => c.id === configId);

  if (!cfg) {
    throw new Error('Connector config not found: ' + configId);
  }

  const def = getConnector(cfg.type);
  if (!def) {
    throw new Error('Connector type not registered: ' + cfg.type);
  }

  const result = await def.run(cfg);

  if (result.success && result.evidence.length > 0) {
    for (const ev of result.evidence) {
      await dbConn.insert(evidence).values({
        clientId: cfg.clientId,
        clientControlId: ev.clientControlId,
        evidenceId: ev.evidenceId,
        description: ev.description,
        type: ev.type,
        status: 'collected',
        framework: 'Connector',
        location: 'connector://' + cfg.type + '/' + ev.evidenceId,
        createdAt: ev.collectedAt,
        updatedAt: ev.collectedAt,
      });
    }
  }

  await updateConnectorRunStatus(
    configId,
    result.success ? 'success' : 'failed',
    new Date(),
  );

  return {
    success: result.success,
    evidenceCollected: result.evidence.length,
    summary: result.summary,
    errors: result.errors ?? [],
  };
}

/**
 * Autopilot Cron — runs hourly
 * 
 * Checks all enabled autopilot configs and runs the engine
 * for any client that's due based on their schedule.
 */
import { getDb } from '../../db';
import { autopilotConfigs } from '../../schema_autopilot';
import { eq } from 'drizzle-orm';
import { AutopilotEngine } from '../../lib/autopilot/engine';

export async function hourlyAutopilotTick(): Promise<{ processed: number; results: { clientId: number; status: string }[] }> {
  const db = await getDb();
  const enabledConfigs = await db.select().from(autopilotConfigs)
    .where(eq(autopilotConfigs.enabled, true));

  const results: { clientId: number; status: string }[] = [];
  const now = Date.now();

  for (const config of enabledConfigs) {
    const lastRun = config.lastRunAt ? new Date(config.lastRunAt).getTime() : 0;
    const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);

    let shouldRun = false;
    switch (config.schedule) {
      case 'hourly': shouldRun = hoursSinceLastRun >= 1; break;
      case 'daily': shouldRun = hoursSinceLastRun >= 24; break;
      case 'weekly': shouldRun = hoursSinceLastRun >= 168; break;
      case 'manual': shouldRun = false; break;
    }

    if (!shouldRun) continue;

    try {
      await AutopilotEngine.run(config.clientId);
      results.push({ clientId: config.clientId, status: 'completed' });
    } catch (error: any) {
      console.error(`[AutopilotCron] Failed for client ${config.clientId}:`, error);
      results.push({ clientId: config.clientId, status: 'failed' });
    }
  }

  return { processed: results.length, results };
}

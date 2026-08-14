import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq } from "drizzle-orm";
import {
  runAllControlAutoTestsForClient,
  getClientAutoTestSchedule,
  isAutoTestDue,
  touchClientAutoTestRun,
} from "../../lib/controlAutoTestEngine";
import { resolveDatabaseUrl, describeDbHost } from "../../lib/dbUrl";

let autoTestInterval: NodeJS.Timeout | null = null;
let offlineWarned = false;

/**
 * Offline guard: when no LOCAL database is configured (e.g. the process is
 * still pointing at a retired remote pooler URL), skip auto-testing entirely
 * instead of attempting a TLS handshake against an unreachable endpoint. This
 * is what produced the repeated
 * "Client network socket disconnected before secure TLS connection was
 * established" spam. Logs exactly once per process, never prints credentials.
 */
export function isOfflineMode(): boolean {
  const { url, isLocal } = resolveDatabaseUrl();
  return !url || !isLocal;
}

function warnOfflineOnce() {
  if (offlineWarned) return;
  offlineWarned = true;
  const { url } = resolveDatabaseUrl();
  console.warn(
    `[ControlAutoTestScheduler] No local DATABASE_URL configured (current host: ${describeDbHost(url) || "none"}) - ` +
      "auto-test sync is running in OFFLINE mode and will be skipped. " +
      "Point DATABASE_URL at a reachable local database to enable continuous control monitoring."
  );
}

/**
 * Execute control auto-testing for all active clients.
 */
export async function syncControlAutoTestsForAllClients() {
  if (isOfflineMode()) {
    warnOfflineOnce();
    return;
  }
  try {
    const db = await getDb();
    const clientsList = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.status, "active"));

    console.log(`[ControlAutoTestScheduler] Starting auto-testing for ${clientsList.length} active clients...`);

    let totalTestedAll = 0;
    let totalPassedAll = 0;
    let totalFailedAll = 0;

    for (const client of clientsList) {
      try {
        const schedule = await getClientAutoTestSchedule(client.id);
        if (!isAutoTestDue(schedule)) {
          console.log(
            `[ControlAutoTestScheduler] Client #${client.id} (${client.name || 'Client'}): ` +
            `auto-tests not due yet (interval=${schedule.intervalHours}h, ` +
            `lastRunAt=${schedule.lastRunAt ? schedule.lastRunAt.toISOString() : 'never'}) - skipping`
          );
          continue;
        }
        const { summary } = await runAllControlAutoTestsForClient(client.id);
        await touchClientAutoTestRun(client.id);
        totalTestedAll += summary.totalControlsTested;
        totalPassedAll += summary.passedCount;
        totalFailedAll += summary.failedCount;

        console.log(
          `[ControlAutoTestScheduler] Client #${client.id} (${client.name || 'Client'}): ` +
          `tested=${summary.totalControlsTested}, passRate=${summary.overallPassRate}%, ` +
          `passed=${summary.passedCount}, warning=${summary.warningCount}, failed=${summary.failedCount}`
        );
      } catch (err: any) {
        console.error(`[ControlAutoTestScheduler] Failed auto-testing for client #${client.id}:`, err);
      }
    }

    console.log(
      `[ControlAutoTestScheduler] Auto-testing complete. Total controls tested: ${totalTestedAll}, ` +
      `passed: ${totalPassedAll}, failed: ${totalFailedAll}.`
    );
  } catch (err) {
    console.error("[ControlAutoTestScheduler] Critical failure in auto-test sync:", err);
  }
}

/**
 * Start the background Control Auto-Testing scheduler.
 * Default interval: 6 hours.
 */
export function start(intervalHours = 6) {
  stop();

  if (isOfflineMode()) {
    warnOfflineOnce();
    console.log("[ControlAutoTestScheduler] Scheduler disabled (offline mode: no local DATABASE_URL)");
    return;
  }

  // Initial execution on startup
  syncControlAutoTestsForAllClients().catch((err) =>
    console.error("[ControlAutoTestScheduler] Initial run failed:", err)
  );

  const ms = intervalHours * 60 * 60 * 1000;
  autoTestInterval = setInterval(() => {
    syncControlAutoTestsForAllClients().catch((err) =>
      console.error("[ControlAutoTestScheduler] Recurrent run failed:", err)
    );
  }, ms);

  console.log(`[ControlAutoTestScheduler] Background scheduler started (${intervalHours}h cycle)`);
}

/**
 * Stop the background Control Auto-Testing scheduler.
 */
export function stop() {
  if (autoTestInterval) {
    clearInterval(autoTestInterval);
    autoTestInterval = null;
    console.log("[ControlAutoTestScheduler] Background scheduler stopped");
  }
}

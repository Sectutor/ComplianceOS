import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq } from "drizzle-orm";
import { runAllControlAutoTestsForClient } from "../../lib/controlAutoTestEngine";

let autoTestInterval: NodeJS.Timeout | null = null;

/**
 * Execute control auto-testing for all active clients.
 */
export async function syncControlAutoTestsForAllClients() {
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
        const { summary } = await runAllControlAutoTestsForClient(client.id);
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

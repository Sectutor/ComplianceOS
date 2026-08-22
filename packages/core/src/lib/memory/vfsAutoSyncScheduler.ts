/**
 * VFS Automatic Synchronization Scheduler
 * Automatically syncs policies, risks, incidents, controls, vendors, and evidence
 * into the Unified Memory Cortex VFS on a continuous background schedule.
 */

import { getDb } from "../../db";
import { clients } from "../../schema";
import { vfsSyncBridge } from "./vfsSyncBridge";
import { eq } from "drizzle-orm";

let syncIntervalHandle: NodeJS.Timeout | null = null;
let isSyncRunning = false;

/**
 * Execute a single sync cycle across all active client organizations.
 */
export async function runVfsAutoSyncCycle(): Promise<void> {
  if (isSyncRunning) return;
  isSyncRunning = true;

  try {
    const db = await getDb();
    const activeClients = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients);

    for (const client of activeClients) {
      try {
        const stats = await vfsSyncBridge.syncAllAppDataToVfs(client.id);
        if (stats.totalNodesCreated > 0) {
          console.log(
            `[VfsAutoSync] Synced ${stats.totalNodesCreated} entities for client #${client.id} (${client.name || "Default"}): ` +
            `Controls: ${stats.controlsSynced}, Risks: ${stats.risksSynced}, Vendors: ${stats.vendorsSynced}, Incidents: ${stats.incidentsSynced}`
          );
        }
      } catch (err: any) {
        console.warn(`[VfsAutoSync] Error syncing client #${client.id}:`, err?.message);
      }
    }
  } catch (err: any) {
    console.error("[VfsAutoSync] Cycle execution error:", err?.message);
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Start the continuous background auto-sync scheduler.
 * @param intervalMs Sync frequency in milliseconds (default: 5 minutes = 300,000ms)
 */
export function startVfsAutoSyncScheduler(intervalMs: number = 300_000): void {
  if (syncIntervalHandle) {
    clearInterval(syncIntervalHandle);
  }

  // Run initial sync shortly after boot (15 seconds)
  setTimeout(() => {
    runVfsAutoSyncCycle().catch((e) =>
      console.warn("[VfsAutoSync] Initial boot cycle failed:", e?.message)
    );
  }, 15_000);

  // Set recurring cron interval
  syncIntervalHandle = setInterval(() => {
    runVfsAutoSyncCycle().catch((e) =>
      console.warn("[VfsAutoSync] Scheduled cycle failed:", e?.message)
    );
  }, intervalMs);

  console.log(`[VfsAutoSync] Auto-sync scheduler started (Interval: ${intervalMs / 1000}s)`);
}

/**
 * Stop the background auto-sync scheduler.
 */
export function stopVfsAutoSyncScheduler(): void {
  if (syncIntervalHandle) {
    clearInterval(syncIntervalHandle);
    syncIntervalHandle = null;
    console.log("[VfsAutoSync] Auto-sync scheduler stopped.");
  }
}

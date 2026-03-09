
import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, and, lt, inArray } from "drizzle-orm";

let expirationInterval: NodeJS.Timeout | null = null;

/**
 * Synchronize evidence expiration for all clients.
 * This identifies 'verified' evidence that has surpassed its expirationDate
 * and marks it as 'expired' for continuous compliance monitoring.
 */
export async function syncExpirationsForAllClients() {
  try {
    const dbConn = await getDb();
    const now = new Date();

    // 1. Fetch all clients to perform synchronization
    const clientsList = await dbConn.select().from(schema.clients);
    console.log(`[EvidenceExpirationScheduler] Starting synchronization for ${clientsList.length} clients...`);

    let totalUpdated = 0;

    for (const client of clientsList) {
        // Find all 'verified' evidence that has passed its expiration date
        const expiredItems = await dbConn.select().from(schema.evidence)
            .where(and(
                eq(schema.evidence.clientId, client.id),
                eq(schema.evidence.status, 'verified'),
                lt(schema.evidence.expirationDate, now)
            ));

        if (expiredItems.length > 0) {
            const ids = expiredItems.map(item => item.id);
            await dbConn.update(schema.evidence)
                .set({
                    status: 'expired',
                    updatedAt: now
                } as any)
                .where(inArray(schema.evidence.id, ids));
            
            totalUpdated += ids.length;
            console.log(`[EvidenceExpirationScheduler] Client ${client.id}: Marked ${ids.length} evidence items as expired.`);
        }
    }

    console.log(`[EvidenceExpirationScheduler] Synchronization finished. Total evidence items expired: ${totalUpdated}`);
  } catch (err) {
    console.error("[EvidenceExpirationScheduler] Synchronization failed:", err);
  }
}

/**
 * Start the background scheduler.
 * Runs every 12 hours by default.
 */
export function start() {
  stop();
  
  // Initial run on startup
  syncExpirationsForAllClients().catch(err => console.error('[EvidenceExpirationScheduler] Initial sync failed:', err));
  
  // Schedule recurrent runs (every 12 hours)
  expirationInterval = setInterval(() => {
    syncExpirationsForAllClients().catch(err => console.error('[EvidenceExpirationScheduler] Recurrent sync failed:', err));
  }, 12 * 60 * 60 * 1000);
  
  console.log("[EvidenceExpirationScheduler] Background scheduler started (12h cycle)");
}

/**
 * Stop the background scheduler.
 */
export function stop() {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
    console.log("[EvidenceExpirationScheduler] Background scheduler stopped");
  }
}

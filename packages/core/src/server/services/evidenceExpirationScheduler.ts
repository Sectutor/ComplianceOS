
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

            // Cross-module: an expired evidence item is open work — create a
            // (deduped) renewal task per item so it lands on the task board.
            try {
                const { findOrCreateTask } = await import("../../lib/grc-integration");
                for (const item of expiredItems) {
                    await findOrCreateTask({
                        clientId: client.id,
                        title: `Renew expired evidence: ${item.description?.slice(0, 80) || `Evidence #${item.id}`}`,
                        description: `Evidence item #${item.id} expired on ${item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : 'unknown date'} and its linked control may no longer be compliant. Replace or re-verify the evidence.`,
                        priority: 'high',
                        relatedEntityType: 'evidence_expired',
                        relatedEntityId: item.id,
                    });
                }
            } catch (taskErr: any) {
                console.error(`[EvidenceExpirationScheduler] Task creation for expired evidence failed: ${taskErr?.message}`);
            }
        }
    }

    console.log(`[EvidenceExpirationScheduler] Synchronization finished. Total evidence items expired: ${totalUpdated}`);

    // 2. Perform warning checks for evidence expiring in 30, 14, or 7 days
    try {
      const { sendEvidenceExpiryWarnings } = await import("../../emailNotification");
      const warningResult = await sendEvidenceExpiryWarnings();
      console.log(`[EvidenceExpirationScheduler] Sent ${warningResult.warningsSent} evidence expiration warnings.`);
    } catch (warnErr) {
      console.error("[EvidenceExpirationScheduler] Failed to process expiration warnings:", warnErr);
    }
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

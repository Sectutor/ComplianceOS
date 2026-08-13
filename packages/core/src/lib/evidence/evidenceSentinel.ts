import { getDb } from "../../db";
import { evidence, notificationLog } from "../../schema";
import { eq } from "drizzle-orm";
import { runAllAutomatedCollectors } from "../../connectors/automatedEvidenceCollectors";

export interface ExpiringEvidenceItem {
  evidenceId: string;
  title: string;
  expiresAt: string;
  daysRemaining: number;
  provider?: string;
  actionTaken: "auto_recollected" | "owner_notified";
}

/**
 * Continuous Evidence Expiry Sentinel Service
 */
export async function runEvidenceSentinelScan(clientId: number) {
  const db = await getDb();

  const activeEvidence = await db
    .select()
    .from(evidence)
    .where(eq(evidence.clientId, clientId));

  const now = new Date();
  const expiringItems: ExpiringEvidenceItem[] = [];
  let autoRecollectedCount = 0;
  let notificationsSentCount = 0;

  for (const item of activeEvidence) {
    if (!item.expiresAt) continue;

    const expiresDate = new Date(item.expiresAt);
    const diffMs = expiresDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 30 && daysRemaining > 0) {
      let actionTaken: "auto_recollected" | "owner_notified" = "owner_notified";

      // If item was collected via automated connector (GitHub/AWS/Okta), auto-recollect
      if (item.source?.includes("GitHub") || item.source?.includes("AWS") || item.source?.includes("Okta")) {
        actionTaken = "auto_recollected";
        autoRecollectedCount++;
      } else {
        // Send notification log to control owner
        try {
          await db.insert(notificationLog).values({
            userId: 1,
            type: "evidence_expiration",
            channel: "system",
            title: `Evidence Expiring in ${daysRemaining} Days`,
            message: `Evidence proof "${item.title || item.evidenceId}" for control is set to expire on ${expiresDate.toLocaleDateString()}. Please upload updated evidence.`,
            status: "sent",
            sentAt: new Date(),
          });
          notificationsSentCount++;
        } catch (err) {
          // Ignore table insert constraint if any
        }
      }

      expiringItems.push({
        evidenceId: item.evidenceId || String(item.id),
        title: item.title || "Control Evidence Proof",
        expiresAt: expiresDate.toISOString(),
        daysRemaining,
        provider: item.source || "Manual Upload",
        actionTaken,
      });
    }
  }

  // Trigger connector re-collection if expiring automated items found
  if (autoRecollectedCount > 0) {
    await runAllAutomatedCollectors(clientId);
  }

  return {
    clientId,
    totalEvidenceScanned: activeEvidence.length,
    expiringItemsCount: expiringItems.length,
    autoRecollectedCount,
    notificationsSentCount,
    expiringItems,
    timestamp: new Date().toISOString(),
  };
}

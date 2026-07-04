/**
 * Compliance Monitor Cron Job
 * 
 * Called every hour to:
 * - Run health checks for all active clients
 * - Detect and log drift events
 * - Create notifications for critical issues
 * 
 * Export `hourlyComplianceCheck()` as the entry point for the scheduler.
 */

import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, and } from "drizzle-orm";
import { runComplianceHealthCheck, createMonitorEvent } from "../../lib/compliance-monitor";

export async function hourlyComplianceCheck() {
  try {
    const db = await getDb();

    // Get all active clients
    const clientsList = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.status, "active"));

    console.log(`[ComplianceMonitorCron] Starting hourly check for ${clientsList.length} clients...`);

    let totalIssues = 0;

    for (const client of clientsList) {
      try {
        const healthResult = await runComplianceHealthCheck(client.id);

        // Log critical / caution health events
        if (healthResult.overallHealth !== "good") {
          await createMonitorEvent({
            clientId: client.id,
            eventType: "compliance_status_change",
            controlId: undefined,
            controlName: "System Health",
            oldValue: "good",
            newValue: healthResult.overallHealth,
            severity: healthResult.overallHealth === "critical" ? "critical" : "warning",
            details: {
              totalControls: healthResult.totalControls,
              healthyControls: healthResult.healthyControls,
              atRiskControls: healthResult.atRiskControls,
              missingEvidence: healthResult.missingEvidence,
              staleEvidence: healthResult.staleEvidence,
              expiringEvidence: healthResult.expiringEvidence,
            },
          });
          totalIssues++;
        }

        // Log individual at-risk controls
        for (const detail of healthResult.details) {
          if (detail.issues.length > 0) {
            await createMonitorEvent({
              clientId: client.id,
              eventType: "control_health_issue",
              controlId: detail.controlId,
              controlName: detail.controlName,
              oldValue: "healthy",
              newValue: detail.status,
              severity: detail.issues.some(i => i.includes("expired") || i.includes("no evidence")) ? "critical" : "warning",
              details: {
                status: detail.status,
                issues: detail.issues,
              },
            });
          }
        }

        // Detect expiring evidence
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiringEvidence = await db.select()
          .from(schema.evidence)
          .where(and(
            eq(schema.evidence.clientId, client.id),
            eq(schema.evidence.status, "verified"),
          ));

        for (const ev of expiringEvidence) {
          if (ev.expirationDate && ev.expirationDate <= thirtyDaysFromNow && ev.expirationDate > now) {
            const daysUntilExpiry = Math.round((ev.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            await createMonitorEvent({
              clientId: client.id,
              eventType: "evidence_expiring_soon",
              controlId: ev.clientControlId,
              controlName: ev.description || `Evidence #${ev.id}`,
              oldValue: `${daysUntilExpiry + 1}+ days`,
              newValue: `${daysUntilExpiry} days`,
              severity: daysUntilExpiry <= 7 ? "critical" : "warning",
              details: {
                evidenceId: ev.id,
                expiresAt: ev.expirationDate.toISOString(),
                daysUntilExpiry,
              },
            });
          }
        }

        console.log(`[ComplianceMonitorCron] Client ${client.id}: health=${healthResult.overallHealth}, ` +
          `controls=${healthResult.totalControls}, healthy=${healthResult.healthyControls}, ` +
          `atRisk=${healthResult.atRiskControls}`);
      } catch (err) {
        console.error(`[ComplianceMonitorCron] Failed health check for client ${client.id}:`, err);

        await createMonitorEvent({
          clientId: client.id,
          eventType: "health_check_error",
          severity: "critical",
          details: {
            error: (err as Error).message,
          },
        });
      }
    }

    console.log(`[ComplianceMonitorCron] Hourly check complete. ${totalIssues} clients with issues.`);
  } catch (err) {
    console.error("[ComplianceMonitorCron] Critical failure:", err);
  }
}

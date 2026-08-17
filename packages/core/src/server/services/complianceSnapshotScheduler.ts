/**
 * Compliance Snapshot Scheduler
 *
 * Trend charts (posture trending, dashboard complianceScores, compliance debt)
 * read from compliance_snapshots — but snapshots were only written when an
 * admin clicked "Create snapshot". This scheduler captures one snapshot per
 * client per week (skipped when one already exists within the last 6 days)
 * so trends populate automatically.
 */

import { getDb } from "../../db";
import * as schema from "../../schema";
import { eq, and, gte, desc } from "drizzle-orm";

let snapshotInterval: NodeJS.Timeout | null = null;

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

async function createSnapshotForClient(clientId: number): Promise<boolean> {
    const db = await getDb();

    // Skip if a snapshot already exists within the last ~week
    const [recent] = await db.select({ id: schema.complianceSnapshots.id })
        .from(schema.complianceSnapshots)
        .where(and(
            eq(schema.complianceSnapshots.clientId, clientId),
            gte(schema.complianceSnapshots.snapshotDate, new Date(Date.now() - SIX_DAYS_MS)),
        ))
        .limit(1);
    if (recent) return false;

    const controls = await db.select().from(schema.clientControls)
        .where(eq(schema.clientControls.clientId, clientId));

    const totalControls = controls.length;
    const implementedControls = controls.filter(c => c.status === 'implemented').length;
    const inProgressControls = controls.filter(c => c.status === 'in_progress').length;
    const notImplementedControls = controls.filter(c => c.status === 'not_implemented').length;
    const notApplicableControls = controls.filter(c => c.status === 'not_applicable').length;

    const risks = await db.select().from(schema.riskAssessments)
        .where(eq(schema.riskAssessments.clientId, clientId));
    const totalRisks = risks.length;
    const mitigatedRisks = risks.filter(r => r.status === 'treated' || r.status === 'accepted').length;

    const applicableControls = totalControls - notApplicableControls;
    const complianceScore = applicableControls > 0
        ? Math.round((implementedControls / applicableControls) * 100)
        : 0;
    const openRisks = totalRisks - mitigatedRisks;
    const riskScore = totalRisks > 0 ? Math.round((openRisks / totalRisks) * 100) : 0;

    const [prevSnapshot] = await db.select().from(schema.complianceSnapshots)
        .where(eq(schema.complianceSnapshots.clientId, clientId))
        .orderBy(desc(schema.complianceSnapshots.snapshotDate))
        .limit(1);
    const controlsClosedThisPeriod = prevSnapshot
        ? Math.max(0, implementedControls - (prevSnapshot.implementedControls || 0))
        : 0;

    await db.insert(schema.complianceSnapshots).values({
        clientId,
        totalControls,
        implementedControls,
        inProgressControls,
        notImplementedControls,
        notApplicableControls,
        totalGaps: 0,
        closedGaps: 0,
        criticalGaps: 0,
        highGaps: 0,
        totalRisks,
        mitigatedRisks,
        complianceScore,
        riskScore,
        controlsClosedThisPeriod,
        gapsClosedThisPeriod: 0,
    });
    return true;
}

export async function captureSnapshotsForAllClients(): Promise<{ created: number; skipped: number; errors: number }> {
    const db = await getDb();
    let created = 0, skipped = 0, errors = 0;
    try {
        const clientsList = await db.select().from(schema.clients);
        for (const client of clientsList) {
            try {
                const made = await createSnapshotForClient(client.id);
                made ? created++ : skipped++;
            } catch (err: any) {
                errors++;
                console.error(`[ComplianceSnapshotScheduler] Client #${client.id} failed: ${err?.message}`);
            }
        }
    } catch (err: any) {
        console.error('[ComplianceSnapshotScheduler] Query failed:', err?.message);
    }
    return { created, skipped, errors };
}

/** Start the scheduler: first run 2 minutes after boot, then weekly. */
export function start() {
    stop();
    setTimeout(() => {
        captureSnapshotsForAllClients().then((r) => {
            if (r.created > 0) console.log(`[ComplianceSnapshotScheduler] Weekly capture: created=${r.created}, skipped=${r.skipped}, errors=${r.errors}`);
        }).catch((err) => console.error('[ComplianceSnapshotScheduler] Initial capture failed:', err?.message));
    }, 2 * 60 * 1000);

    snapshotInterval = setInterval(() => {
        captureSnapshotsForAllClients().catch((err) =>
            console.error('[ComplianceSnapshotScheduler] Recurrent capture failed:', err?.message));
    }, 7 * 24 * 60 * 60 * 1000);

    console.log('[ComplianceSnapshotScheduler] Background scheduler started (weekly cycle)');
}

export function stop() {
    if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
    }
}

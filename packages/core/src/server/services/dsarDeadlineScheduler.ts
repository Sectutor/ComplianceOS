/**
 * DSAR Deadline Scheduler
 *
 * Data-subject requests have statutory deadlines (GDPR: 1 month, extendable).
 * This scheduler makes those deadlines visible work: 7-day warnings and
 * overdue alerts become deduped in-app notifications plus task-board items
 * (overdue only), so a missed DSAR can no longer be silent.
 */

import { getDb } from "../../db";
import * as schema from "../../schema";
import { and, isNotNull, ne } from "drizzle-orm";
import { findOrCreateTask, notifyClientOnce } from "../../lib/grc-integration";

let dsarInterval: NodeJS.Timeout | null = null;

export async function checkDsarDeadlines(): Promise<{
    warned: number;
    overdueTasksCreated: number;
    errors: number;
}> {
    const db = await getDb();
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let warned = 0;
    let overdueTasksCreated = 0;
    let errors = 0;

    try {
        const dsars = await db
            .select()
            .from(schema.dsarRequests)
            .where(
                and(
                    isNotNull(schema.dsarRequests.dueDate),
                    ne(schema.dsarRequests.status, "Completed"),
                    ne(schema.dsarRequests.status, "Rejected"),
                ),
            );

        for (const dsar of dsars) {
            if (!dsar.dueDate) continue;
            const dueDate = new Date(dsar.dueDate as any);
            const isOverdue = dueDate < now;
            const isDueSoon = !isOverdue && dueDate <= in7Days;
            if (!isOverdue && !isDueSoon) continue;

            try {
                const notified = await notifyClientOnce(dsar.clientId, {
                    type: isOverdue ? "dsar_overdue" : "dsar_due_soon",
                    title: isOverdue
                        ? `DSAR ${dsar.requestId} is OVERDUE`
                        : `DSAR ${dsar.requestId} due in ≤7 days`,
                    message: `Request "${dsar.requestType}" for ${dsar.subjectName || dsar.subjectEmail || "data subject"} is ${isOverdue ? `overdue since ${dueDate.toISOString().split("T")[0]}` : `due ${dueDate.toISOString().split("T")[0]}`} (status: ${dsar.status}). Statutory response deadlines apply.`,
                    link: `/clients/${dsar.clientId}/privacy/dsar`,
                    relatedEntityType: "dsar_request",
                    relatedEntityId: dsar.id,
                });
                if (notified) warned++;

                if (isOverdue) {
                    const { created } = await findOrCreateTask({
                        clientId: dsar.clientId,
                        title: `Respond to overdue DSAR ${dsar.requestId}`,
                        description: `DSAR "${dsar.requestType}" (${dsar.subjectName || dsar.subjectEmail || "subject"}) became overdue on ${dueDate.toISOString().split("T")[0]}. Statutory deadline breach — respond immediately.`,
                        priority: "critical",
                        dueDate: dueDate,
                        relatedEntityType: "dsar_overdue",
                        relatedEntityId: dsar.id,
                    });
                    if (created) overdueTasksCreated++;
                }
            } catch (err: any) {
                errors++;
                console.error(`[DsarDeadlineScheduler] Failed for DSAR #${dsar.id}: ${err?.message}`);
            }
        }
    } catch (err: any) {
        console.error("[DsarDeadlineScheduler] Query failed:", err?.message);
    }

    return { warned, overdueTasksCreated, errors };
}

/** Start the scheduler (daily cycle). */
export function start() {
    stop();
    checkDsarDeadlines()
        .then((r) =>
            r.warned > 0 || r.overdueTasksCreated > 0
                ? console.log(`[DsarDeadlineScheduler] Initial check: warned=${r.warned}, overdueTasks=${r.overdueTasksCreated}, errors=${r.errors}`)
                : undefined,
        )
        .catch((err) => console.error("[DsarDeadlineScheduler] Initial check failed:", err?.message));

    dsarInterval = setInterval(() => {
        checkDsarDeadlines().catch((err) =>
            console.error("[DsarDeadlineScheduler] Recurrent check failed:", err?.message),
        );
    }, 24 * 60 * 60 * 1000);

    console.log("[DsarDeadlineScheduler] Background scheduler started (24h cycle)");
}

export function stop() {
    if (dsarInterval) {
        clearInterval(dsarInterval);
        dsarInterval = null;
        console.log("[DsarDeadlineScheduler] Background scheduler stopped");
    }
}

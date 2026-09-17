/**
 * GRC Cross-Module Integration Service
 *
 * Single home for the "information must flow between modules" rules:
 * creating remediation tasks from other modules' signals, deduped
 * notifications, and register entries. All creators are idempotent —
 * they check for an existing open item before inserting, so schedulers
 * and repeated mutations never spam duplicates.
 */

import { getDb } from "../db";
import * as schema from "../schema";
import { and, eq, ne, gte, isNotNull } from "drizzle-orm";
import { createInAppNotification } from "./notificationService";

const OPEN_TASK_STATUSES = ["todo", "pending", "in_progress", "blocked"];

export interface CreateTaskInput {
    clientId: number;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: Date;
    relatedEntityType: string;
    relatedEntityId: number;
    createdBy?: number;
}

/**
 * Create a remediation task linked to a source entity, unless an open task
 * for the same entity already exists. Returns the task (existing or new)
 * and whether it was newly created.
 */
export async function findOrCreateTask(input: CreateTaskInput): Promise<{ task: any; created: boolean }> {
    const db = await getDb();

    const existing = await db
        .select()
        .from(schema.tasks)
        .where(
            and(
                eq(schema.tasks.clientId, input.clientId),
                eq(schema.tasks.relatedEntityType, input.relatedEntityType),
                eq(schema.tasks.relatedEntityId, input.relatedEntityId),
                ne(schema.tasks.status, "completed"),
            ),
        )
        .limit(1);

    if (existing.length > 0) return { task: existing[0], created: false };

    const [task] = await db
        .insert(schema.tasks)
        .values({
            clientId: input.clientId,
            title: input.title,
            description: input.description,
            priority: input.priority || "medium",
            status: "todo",
            dueDate: input.dueDate || null,
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            createdBy: input.createdBy ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

    return { task, created: true };
}

/**
 * True if a notification of this type for this entity was already sent
 * within the lookback window (default 20h ≈ daily dedupe).
 */
export async function hasRecentNotification(
    type: string,
    relatedEntityType: string,
    relatedEntityId: number,
    lookbackHours = 20,
): Promise<boolean> {
    const db = await getDb();
    const since = new Date(Date.now() - lookbackHours * 3600 * 1000);
    const rows = await db
        .select({ id: schema.notificationLog.id })
        .from(schema.notificationLog)
        .where(
            and(
                eq(schema.notificationLog.type, type),
                eq(schema.notificationLog.relatedEntityType, relatedEntityType),
                eq(schema.notificationLog.relatedEntityId, relatedEntityId),
                isNotNull(schema.notificationLog.sentAt),
                gte(schema.notificationLog.sentAt, since),
            ),
        )
        .limit(1);
    return rows.length > 0;
}

/**
 * Notify all users of a client, deduped per entity per day.
 */
export async function notifyClientOnce(
    clientId: number,
    payload: {
        type: string;
        title: string;
        message: string;
        link?: string;
        relatedEntityType: string;
        relatedEntityId: number;
    },
): Promise<boolean> {
    if (await hasRecentNotification(payload.type, payload.relatedEntityType, payload.relatedEntityId)) {
        return false;
    }
    await createInAppNotification(clientId, payload);
    return true;
}

/**
 * Severity mapping used by several cross-module flows.
 */
export function severityToTaskPriority(severity: string): string {
    switch ((severity || "").toLowerCase()) {
        case "critical":
            return "critical";
        case "high":
            return "high";
        case "medium":
            return "medium";
        default:
            return "low";
    }
}

export { OPEN_TASK_STATUSES };

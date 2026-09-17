import { getDb } from '../db';
import { evidenceRequests, notificationLog } from '../schema';
import { eq, and, lt, gt, lte, gte, inArray, sql } from 'drizzle-orm';

/**
 * Create a notification when a new evidence request is created.
 * Notifies both the assignee (to act) and the requester (confirmation).
 */
export async function createEvidenceRequestNotification(
  requestId: number,
  requesterId: number,
  assigneeId: number,
  dueDate: Date | string | null,
  controlName: string,
): Promise<void> {
  const db = await getDb();

  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No due date';

  const metadata = {
    requestId,
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    controlName,
  };

  // Notification for the assignee (person who needs to submit evidence)
  await db.insert(notificationLog).values({
    userId: assigneeId,
    type: 'alert',
    channel: 'system',
    title: 'New Evidence Request',
    message: `You have been assigned a new evidence request for "${controlName}". Due: ${dueDateStr}.`,
    link: `/evidence-requests/${requestId}`,
    metadata,
    relatedEntityType: 'evidence_request',
    relatedEntityId: requestId,
  });

  // Notification for the requester (person who created the request – confirmation)
  await db.insert(notificationLog).values({
    userId: requesterId,
    type: 'info',
    channel: 'system',
    title: 'Evidence Request Created',
    message: `Your evidence request for "${controlName}" has been created and assigned. Due: ${dueDateStr}.`,
    link: `/evidence-requests/${requestId}`,
    metadata,
    relatedEntityType: 'evidence_request',
    relatedEntityId: requestId,
  });
}

/**
 * Find evidence requests due within 3 days that haven't had a reminder in the last 24h.
 * Creates a "due soon" reminder notification for the assignee.
 * Can be called on a schedule (e.g. cron job every hour).
 */
export async function sendEvidenceDueReminder(): Promise<number> {
  const db = await getDb();

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find requests where dueDate is within the next 3 days and status is still open
  const dueSoonRequests = await db
    .select()
    .from(evidenceRequests)
    .where(
      and(
        lte(evidenceRequests.dueDate, threeDaysFromNow),
        gte(evidenceRequests.dueDate, now),
        eq(evidenceRequests.status, 'open'),
      ),
    );

  let reminderCount = 0;

  for (const request of dueSoonRequests) {
    // Check if a due-date reminder notification was already sent in the last 24h
    const recentReminder = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(
        and(
          eq(notificationLog.relatedEntityType, 'evidence_request'),
          eq(notificationLog.relatedEntityId, request.id),
          eq(notificationLog.type, 'warning'),
          eq(notificationLog.userId, request.assigneeId),
          gte(notificationLog.sentAt, twentyFourHoursAgo),
          sql`${notificationLog.metadata}->>'reminderType' = 'due_soon'`,
        ),
      )
      .limit(1);

    if (recentReminder.length > 0) {
      continue; // Already reminded in the last 24h
    }

    const dueDateStr = request.dueDate
      ? new Date(request.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'No due date';

    await db.insert(notificationLog).values({
      userId: request.assigneeId,
      type: 'warning',
      channel: 'system',
      title: 'Evidence Request Due Soon',
      message: `Your evidence request (ID #${request.id}) is due on ${dueDateStr}. Please submit your evidence promptly.`,
      link: `/evidence-requests/${request.id}`,
      metadata: {
        requestId: request.id,
        dueDate: request.dueDate?.toISOString() ?? null,
        reminderType: 'due_soon',
      },
      relatedEntityType: 'evidence_request',
      relatedEntityId: request.id,
    });

    reminderCount++;
  }

  return reminderCount;
}

/**
 * Find evidence requests that are past their due date with no escalation sent in the last 24h.
 * Creates an escalation notification for the assignee.
 * Can be called on a schedule (e.g. cron job every hour).
 */
export async function sendOverdueEscalation(): Promise<number> {
  const db = await getDb();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find requests where dueDate is in the past and status is still open
  const overdueRequests = await db
    .select()
    .from(evidenceRequests)
    .where(
      and(
        lt(evidenceRequests.dueDate, now),
        eq(evidenceRequests.status, 'open'),
      ),
    );

  let escalationCount = 0;

  for (const request of overdueRequests) {
    // Check if an escalation notification was already sent in the last 24h
    const recentEscalation = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(
        and(
          eq(notificationLog.relatedEntityType, 'evidence_request'),
          eq(notificationLog.relatedEntityId, request.id),
          eq(notificationLog.type, 'alert'),
          eq(notificationLog.userId, request.assigneeId),
          gte(notificationLog.sentAt, twentyFourHoursAgo),
          sql`${notificationLog.metadata}->>'reminderType' = 'overdue'`,
        ),
      )
      .limit(1);

    if (recentEscalation.length > 0) {
      continue; // Already escalated in the last 24h
    }

    const dueDateStr = request.dueDate
      ? new Date(request.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'No due date';

    await db.insert(notificationLog).values({
      userId: request.assigneeId,
      type: 'alert',
      channel: 'system',
      title: 'Evidence Request Overdue',
      message: `Your evidence request (ID #${request.id}) was due on ${dueDateStr} and is now OVERDUE. Immediate action is required.`,
      link: `/evidence-requests/${request.id}`,
      metadata: {
        requestId: request.id,
        dueDate: request.dueDate?.toISOString() ?? null,
        reminderType: 'overdue',
      },
      relatedEntityType: 'evidence_request',
      relatedEntityId: request.id,
    });

    escalationCount++;
  }

  return escalationCount;
}

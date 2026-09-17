/**
 * Policy ACK Reminder Scheduler (scorecard P1 #4 — "Policy management + ack").
 *
 * Runs a daily pass over pending policy acknowledgments and flags any that
 * have been pending longer than the reminder threshold (default 3 days —
 * see DEFAULT_ACK_REMINDER_DAYS in lib/policyAck.ts). Each flagged ack is
 * surfaced via the `onFlag` hook (console + notification log in the future).
 *
 * Guarded at the wiring site by ENABLE_POLICY_ACK_REMINDERS !== 'false'
 * (see server_entry.ts).
 */

import {
  DEFAULT_ACK_REMINDER_DAYS,
  runPolicyAckReminders,
} from '../../lib/policyAck';

let reminderInterval: NodeJS.Timeout | null = null;

/** Default check interval for reminders (12h — catches 3-day threshold). */
export const DEFAULT_REMINDER_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Run one reminder pass against the live DB. Returns the summary (or null). */
export async function runPolicyAckReminderTick(): Promise<unknown> {
  try {
    const summary = await runPolicyAckReminders({
      overdueDays: DEFAULT_ACK_REMINDER_DAYS,
      onFlag: (ack) => {
        console.warn(
          `[PolicyAckReminder] Acknowledgment #${ack.id} for "${ack.policyTitle}" ` +
            `(user ${ack.userId}, client ${ack.clientId}) pending > ${DEFAULT_ACK_REMINDER_DAYS} days — reminder due`,
        );
      },
    });
    console.log(
      `[PolicyAckReminder] Pass complete — flagged ${summary.flagged} overdue acknowledgment(s)`,
    );
    return summary;
  } catch (err) {
    console.error(
      '[PolicyAckReminder] Pass failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Start the background reminder scheduler (immediate first pass + interval). */
export function start(intervalMs: number = DEFAULT_REMINDER_INTERVAL_MS): void {
  stop();

  runPolicyAckReminderTick().catch((err) =>
    console.error('[PolicyAckReminder] Initial pass failed:', err?.message ?? err),
  );

  reminderInterval = setInterval(() => {
    runPolicyAckReminderTick().catch((err) =>
      console.error('[PolicyAckReminder] Recurrent pass failed:', err?.message ?? err),
    );
  }, intervalMs);

  console.log(`[PolicyAckReminder] Scheduler started (${Math.round(intervalMs / 1000)}s cycle)`);
}

/** Stop the background reminder scheduler. */
export function stop(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log('[PolicyAckReminder] Scheduler stopped');
  }
}

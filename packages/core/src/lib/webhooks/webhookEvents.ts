/**
 * Webhook event catalog + fire-and-forget dispatcher (scorecard #15).
 *
 * The catalog is defined ONCE here and imported by webhookRegistry.ts so the
 * registry's `listWebhookEventCatalog` and the call-site wiring share a single
 * source of truth. `safeDispatchWebhookEvent` is the non-blocking entry point
 * used by domain flows (evidence renewal, control auto-tests, policy ack
 * reminders, risk creation) — it never throws and never blocks callers.
 */
import { dispatchWebhookEvent } from "./webhookRegistry";

export interface WebhookEventDefinition {
  id: string;
  label: string;
  description: string;
}

/** Single source of truth for the event catalog surfaced to clients. */
export const WEBHOOK_EVENT_CATALOG: WebhookEventDefinition[] = [
  {
    id: "test.ping",
    label: "Test Ping",
    description: "Fires when a test ping is triggered from the webhook settings page.",
  },
  {
    id: "evidence.expired",
    label: "Evidence Expired",
    description: "Fires when an evidence item is flipped to expired by the renewal loop.",
  },
  {
    id: "control.autotest.failed",
    label: "Control Auto-Test Failed",
    description: "Fires when an automated control verification run ends in a failure.",
  },
  {
    id: "risk.created",
    label: "High/Critical Risk Created",
    description: "Fires when a risk is created or upserted with high or critical severity.",
  },
  {
    id: "policy.ack.overdue",
    label: "Policy Acknowledgment Overdue",
    description: "Fires when a pending policy acknowledgment passes the overdue reminder threshold.",
  },
  {
    id: "*",
    label: "All Events",
    description: "Wildcard subscription — receives every webhook event for the client.",
  },
];

/** Concrete event ids (catalog minus the "*" wildcard). */
export const WEBHOOK_EVENT_IDS: string[] = WEBHOOK_EVENT_CATALOG.map(
  (e) => e.id
).filter((id) => id !== "*");

/**
 * Fire-and-forget webhook dispatch. Never throws and never blocks the caller.
 * The dispatch is deferred to a macrotask so no synchronous DB/network work
 * happens in the caller's tick; `dispatchWebhookEvent` itself is designed not
 * to throw, and any unexpected error is swallowed as a final safety net.
 */
export function safeDispatchWebhookEvent(
  clientId: number,
  event: string,
  data: unknown
): void {
  try {
    setImmediate(() => {
      void dispatchWebhookEvent(clientId, event, data).catch((err) => {
        console.error(
          `[Webhooks] Unexpected error dispatching "${event}" for client #${clientId}:`,
          err
        );
      });
    });
  } catch (err) {
    console.error(
      `[Webhooks] Unexpected error dispatching "${event}" for client #${clientId}:`,
      err
    );
  }
}

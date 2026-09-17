import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { WEBHOOK_EVENT_IDS } from "../../lib/webhooks/webhookEvents";
import {
  createWebhookSubscription,
  getClientWebhookSubscriptions,
  getClientWebhookDeliveries,
  dispatchWebhookEvent,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  listWebhookEventCatalog,
} from "../../lib/webhooks/webhookRegistry";

export const createWebhooksRouter = (t: any, clientProcedure: any) => {
  return t.router({
    subscribe: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1).max(255),
          targetUrl: z.string().url(),
          events: z
            .array(z.string())
            .min(1)
            .refine(
              (events) =>
                events.every((e) => e === "*" || WEBHOOK_EVENT_IDS.includes(e)),
              {
                message:
                  "events must be known webhook events (see listEventCatalog); '*' subscribes to all",
              }
            ),
          secret: z.string().optional(),
        })
      )
      .mutation(async ({ input }: any) => {
        try {
          return await createWebhookSubscription(input);
        } catch (err) {
          console.error("[Webhooks] Failed to create subscription:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create webhook subscription",
          });
        }
      }),

    updateSubscription: clientProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          targetUrl: z.string().url().optional(),
          events: z
            .array(z.string())
            .min(1)
            .refine(
              (events) =>
                events.every((e) => e === "*" || WEBHOOK_EVENT_IDS.includes(e)),
              {
                message:
                  "events must be known webhook events (see listEventCatalog); '*' subscribes to all",
              }
            )
            .optional(),
          status: z.enum(["active", "disabled"]).optional(),
        })
      )
      .mutation(async ({ input }: any) => {
        try {
          const updated = await updateWebhookSubscription(input.id, {
            name: input.name,
            targetUrl: input.targetUrl,
            events: input.events,
            status: input.status,
          });
          if (!updated) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Webhook subscription ${input.id} not found`,
            });
          }
          return updated;
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          console.error("[Webhooks] Failed to update subscription:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update webhook subscription",
          });
        }
      }),

    deleteSubscription: clientProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }: any) => {
        try {
          const deleted = await deleteWebhookSubscription(input.id);
          if (!deleted) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Webhook subscription ${input.id} not found`,
            });
          }
          return { success: true, id: input.id };
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          console.error("[Webhooks] Failed to delete subscription:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete webhook subscription",
          });
        }
      }),

    listSubscriptions: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return getClientWebhookSubscriptions(input.clientId);
      }),

    listDeliveries: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          limit: z.number().int().min(1).max(200).default(50),
        })
      )
      .query(async ({ input }: any) => {
        return getClientWebhookDeliveries(input.clientId, input.limit);
      }),

    listEventCatalog: clientProcedure.query(async () => {
      return listWebhookEventCatalog();
    }),

    triggerTestEvent: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          event: z.string().default("test.ping"),
          data: z.any().optional(),
        })
      )
      .mutation(async ({ input }: any) => {
        return dispatchWebhookEvent(
          input.clientId,
          input.event,
          input.data || { test: true, message: "Webhook test ping from ComplianceOS" }
        );
      }),
  });
};

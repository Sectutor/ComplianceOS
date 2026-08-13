import { z } from "zod";
import {
  createWebhookSubscription,
  getClientWebhookSubscriptions,
  getClientWebhookDeliveries,
  dispatchWebhookEvent,
} from "../../lib/webhooks/webhookRegistry";

export const createWebhooksRouter = (t: any, clientProcedure: any) => {
  return t.router({
    subscribe: clientProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1).max(255),
          targetUrl: z.string().url(),
          events: z.array(z.string()).min(1),
          secret: z.string().optional(),
        })
      )
      .mutation(async ({ input }: any) => {
        return createWebhookSubscription(input);
      }),

    listSubscriptions: clientProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }: any) => {
        return getClientWebhookSubscriptions(input.clientId);
      }),

    listDeliveries: clientProcedure
      .input(z.object({ clientId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }: any) => {
        return getClientWebhookDeliveries(input.clientId, input.limit);
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

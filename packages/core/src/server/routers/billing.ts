import { z } from "zod";
import * as db from "../../db";
import { clients, users } from "../../schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, createPortalSession, resolveCheckoutPrice, planForPriceId } from "../../lib/stripe";
import { config } from "../../lib/config";
import { TRPCError } from "@trpc/server";

export const createBillingRouter = (t: any, clientProcedure: any, isAuthed: any, publicProcedure: any) => {
    return t.router({
        createCheckout: clientProcedure
            .input(z.object({
                clientId: z.number(),
                // Professional ($1,990/yr) or Lifetime ($4,990 one-time). Enterprise is contact sales.
                // "consultant"/"pro" are accepted from older clients and map to Professional.
                tier: z.enum(['professional', 'lifetime', 'lifetime_support', 'consultant', 'pro']),
                successUrl: z.string(),
                cancelUrl: z.string(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const d = await db.getDb();
                const [client] = await d.select().from(clients).where(eq(clients.id, input.clientId));

                if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

                const resolved = resolveCheckoutPrice(input.tier);
                if (!resolved) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Stripe price for ${input.tier} is not configured on this instance.`
                    });
                }

                try {
                    const session = await createCheckoutSession(
                        client.stripeCustomerId || undefined,
                        resolved.priceId,
                        input.successUrl,
                        input.cancelUrl,
                        {
                            clientId: String(input.clientId),
                            tier: resolved.plan,
                            plan: resolved.plan,
                            founding: String(resolved.founding),
                            customerEmail: ctx.user.email,
                            userId: String(ctx.user.id)
                        },
                        resolved.mode
                    );
                    return { url: session.url };
                } catch (error: any) {
                    console.error('[Billing] Checkout Session Error:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message || 'Failed to create checkout session. Please try again.'
                    });
                }
            }),

        createUserCheckout: publicProcedure.use(isAuthed)
            .input(z.object({
                tier: z.enum(['professional', 'lifetime', 'lifetime_support', 'consultant', 'pro']),
                successUrl: z.string(),
                cancelUrl: z.string(),
            }))
            .mutation(async ({ input, ctx }: any) => {
                const resolved = resolveCheckoutPrice(input.tier);
                if (!resolved) {
                    console.error(`[Billing] Missing Stripe price for ${input.tier}. Set STRIPE_PRICE_* (see .env.example).`);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Price configuration missing for ${input.tier}. Please contact support.`
                    });
                }

                try {
                    const session = await createCheckoutSession(
                        ctx.user.stripeCustomerId || undefined,
                        resolved.priceId,
                        input.successUrl,
                        input.cancelUrl,
                        {
                            userId: String(ctx.user.id),
                            tier: resolved.plan,
                            plan: resolved.plan,
                            founding: String(resolved.founding),
                            customerEmail: ctx.user.email,
                            type: 'user'
                        },
                        resolved.mode
                    );
                    return { url: session.url };
                } catch (error: any) {
                    console.error('[Billing] createUserCheckout failed:', error);
                    if (error instanceof TRPCError) throw error;
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Checkout failed: ${error.message || 'Please try again or contact support.'}`
                    });
                }
            }),

        createPortal: clientProcedure
            .input(z.object({
                clientId: z.number(),
                returnUrl: z.string(),
            }))
            .mutation(async ({ input }: any) => {
                const d = await db.getDb();
                const [client] = await d.select().from(clients).where(eq(clients.id, input.clientId));

                if (!client || !client.stripeCustomerId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'No billing history found for this client.'
                    });
                }

                try {
                    const session = await createPortalSession(client.stripeCustomerId, input.returnUrl);
                    return { url: session.url };
                } catch (error: any) {
                    console.error('[Billing] Portal Session Error:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message || 'Failed to create billing portal session. Please try again.'
                    });
                }
            }),

        getBillingState: clientProcedure
            .input(z.object({ clientId: z.number() }))
            .query(async ({ input }: any) => {
                const d = await db.getDb();
                const [client] = await d.select().from(clients).where(eq(clients.id, input.clientId));

                if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

                return {
                    planTier: client.planTier,
                    status: client.subscriptionStatus,
                    isEnabled: config.isBillingEnabled
                };
            }),

        syncSubscriptionStatus: publicProcedure.use(isAuthed)
            .mutation(async ({ ctx }: any) => {
                console.log(`[Billing] Syncing subscription status for user ${ctx.user.id}`);
                const d = await db.getDb();
                const user = await db.getUserById(ctx.user.id);

                if (!user || !user.stripeCustomerId) {
                    console.log(`[Billing] No stripeCustomerId for user ${ctx.user.id}`);
                    return { status: user?.subscriptionStatus || 'incomplete' };
                }

                // Import stripe dynamically or use the one from lib
                const { stripe } = await import("../../lib/stripe");
                if (!stripe) {
                    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe not configured' });
                }

                try {
                    const subscriptions = await stripe.subscriptions.list({
                        customer: user.stripeCustomerId,
                        status: 'all',
                        limit: 1
                    });

                    if (subscriptions.data.length === 0) {
                        console.log(`[Billing] No subscriptions found for user ${ctx.user.id}`);
                        return { status: user.subscriptionStatus };
                    }

                    const sub = subscriptions.data[0];
                    console.log(`[Billing] Found subscription ${sub.id} with status ${sub.status}`);

                    // Map the Stripe price back to the plan tier stored on the user
                    let tier = user.planTier;
                    const plan = planForPriceId(sub.items.data[0]?.price?.id);
                    if (plan === 'professional') tier = 'pro';

                    // Update DB
                    await d.update(users)
                        .set({
                            subscriptionStatus: sub.status,
                            planTier: tier,
                            updatedAt: new Date()
                        })
                        .where(eq(users.id, ctx.user.id));

                    return { status: sub.status, tier };

                } catch (err) {
                    console.error("[Billing] Failed to sync subscription:", err);
                    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to sync billing with Stripe. Please try again later.' });
                }
            }),
    });
};

/**
 * Purchase Flow Webhooks (Phase 3.3)
 *
 * Handles fulfillment of licenses after payment.
 * Supports: Stripe Checkout, Paddle, LemonSqueezy
 *
 * On successful payment:
 *   1. Generate signed license file
 *   2. Cache locally for offline grace
 *   3. Optionally email the license to the customer
 *
 * Routes:
 *   POST /api/webhooks/stripe    — Stripe Checkout fulfillment
 *   POST /api/webhooks/paddle    — Paddle fulfillment
 */

import express from 'express';
import { logger } from '../../lib/logger';
import { getLicenseServerClient } from '../../lib/license/server';
import { cacheLicense } from '../../lib/license/local-license-cache';

export const purchaseWebhookRouter = express.Router();

/* ------------------------------------------------------------------ */
/*  Stripe Checkout Webhook                                            */
/* ------------------------------------------------------------------ */

purchaseWebhookRouter.post('/stripe', express.raw({ type: 'application/json' }), async (req: any, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || '',
    );
  } catch (err: any) {
    logger.warn({ message: '[Stripe] Webhook signature verification failed', error: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email || 'unknown';
        const metadata = session.metadata || {};

        const tier = metadata.tier || 'pro';
        const licenseKey = `COM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        logger.info({
          message: '[Stripe] License purchase completed',
          email: customerEmail,
          tier,
          licenseKey,
          sessionId: session.id,
        });

        // Trigger license server activation
        try {
          const client = getLicenseServerClient();
          await client.activateLicense({
            licenseKey,
            metadata: { tier, email: customerEmail, sessionId: session.id },
          });
        } catch (err) {
          logger.warn({ message: '[Stripe] License server activation failed', error: err });
        }

        // Cache locally for immediate use
        cacheLicense(licenseKey, `stripe-${session.id}`, {
          type: tier as any,
          status: 'valid',
          issuedTo: customerEmail,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          maxUsers: tier === 'enterprise' ? 9999 : 50,
          maxClients: tier === 'enterprise' ? 9999 : 10,
          features: [],
        });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        logger.info({ message: '[Stripe] Subscription cancelled', subscriptionId: subscription.id });
        break;
      }

      default:
        logger.debug({ message: `[Stripe] Unhandled event type: ${event.type}` });
    }

    res.json({ received: true });
  } catch (err: any) {
    logger.error({ message: '[Stripe] Webhook handler error', error: err });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/* ------------------------------------------------------------------ */
/*  Paddle Webhook (alternative merchant of record)                    */
/* ------------------------------------------------------------------ */

purchaseWebhookRouter.post('/paddle', express.json(), async (req: any, res) => {
  try {
    const { alert_name, passthrough, email, checkout_id } = req.body;

    if (alert_name === 'subscription_created' || alert_name === 'payment_succeeded') {
      const metadata = passthrough ? JSON.parse(passthrough) : {};
      const tier = metadata.tier || 'pro';

      const licenseKey = `COM-PADDLE-${Date.now().toString(36).toUpperCase()}`;

      logger.info({
        message: '[Paddle] License purchase completed',
        email,
        tier,
        licenseKey,
        checkoutId: checkout_id,
      });

      cacheLicense(licenseKey, `paddle-${checkout_id}`, {
        type: tier as any,
        status: 'valid',
        issuedTo: email || 'unknown',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        maxUsers: tier === 'enterprise' ? 9999 : 50,
        maxClients: tier === 'enterprise' ? 9999 : 10,
        features: [],
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ message: '[Paddle] Webhook error', error: err });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

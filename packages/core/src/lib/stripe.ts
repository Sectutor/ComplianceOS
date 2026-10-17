import Stripe from 'stripe';
import { config } from './config';
import { normalizeCheckoutPlan, type CheckoutPlan } from './billingPlans';

// Initialize Stripe only if API key is present, otherwise mock or throw for safety
let stripeInstance: Stripe | null = null;

try {
    if (config.stripe.secretKey && config.stripe.secretKey.trim() !== '') {
        stripeInstance = new Stripe(config.stripe.secretKey.trim(), {
            apiVersion: '2024-06-20' as any,
            typescript: true,
        });
    } else {
        if (config.isBillingEnabled) {
            console.warn('[Stripe] Billing is enabled but STRIPE_SECRET_KEY is missing or empty.');
        }
    }
} catch (error) {
    console.error('[Stripe] Failed to initialize Stripe client:', error);
}

export const stripe = stripeInstance;

/**
 * Creates a Stripe Customer for a new Client
 */
export async function createStripeCustomer(clientName: string, email: string, metadata: Record<string, string>) {
    if (!stripe) return null;

    try {
        const customer = await stripe.customers.create({
            name: clientName,
            email: email,
            metadata: metadata,
        });
        return customer.id;
    } catch (error) {
        console.error('[Stripe] Failed to create customer:', error);
        throw error;
    }
}

/**
 * Creates a Checkout Session (subscription for Professional, one-time payment for Lifetime)
 */
export async function createCheckoutSession(
    customerId: string | undefined,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string>,
    mode: Stripe.Checkout.SessionCreateParams.Mode = 'subscription' // Default to subscription, but customizable
) {
    if (!stripe) throw new Error("Stripe not initialized");

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: mode,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata,
    };

    if (customerId) {
        sessionParams.customer = customerId;
    } else if (metadata.customerEmail) {
        sessionParams.customer_email = metadata.customerEmail;
    }

    if (mode === 'payment') {
        // One-time purchases (Lifetime): always create a Customer so the buyer can be
        // found later for support renewals and receipts.
        if (!customerId) sessionParams.customer_creation = 'always';
        sessionParams.payment_intent_data = { metadata };
    } else if (mode === 'subscription') {
        sessionParams.subscription_data = { metadata };
    }

    return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Creates a Customer Portal Session for managing subscriptions
 */
export async function createPortalSession(customerId: string, returnUrl: string) {
    if (!stripe) throw new Error("Stripe not initialized");

    return stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}

/**
 * True while the founding offer (20% off, first 30 days of launch) applies to new checkouts.
 * Controlled by FOUNDING_OFFER_ENDS_AT; unset means the offer is active.
 */
export function isFoundingOfferActive(now: Date = new Date()): boolean {
    const endsAt = config.stripe.foundingOfferEndsAt;
    if (!endsAt || !endsAt.trim()) return true;
    const end = new Date(endsAt.trim());
    if (Number.isNaN(end.getTime())) return true;
    return now.getTime() < end.getTime();
}

export interface ResolvedCheckoutPrice {
    plan: CheckoutPlan;
    priceId: string;
    mode: Stripe.Checkout.SessionCreateParams.Mode;
    founding: boolean;
}

/**
 * Maps a plan (or a legacy tier name) to the Stripe price and checkout mode.
 * Returns null for Enterprise (contact sales) or when the price is not configured.
 */
export function resolveCheckoutPrice(tier: string): ResolvedCheckoutPrice | null {
    const plan = normalizeCheckoutPlan(tier);
    if (!plan || plan === 'enterprise') return null;

    const p = config.stripe.prices;
    const founding = isFoundingOfferActive();

    if (plan === 'professional') {
        const useFounding = founding && !!p.professionalYearlyFounding;
        const priceId = useFounding ? p.professionalYearlyFounding : p.professionalYearly;
        return priceId ? { plan, priceId, mode: 'subscription', founding: useFounding } : null;
    }
    if (plan === 'lifetime') {
        const useFounding = founding && !!p.lifetimeFounding;
        const priceId = useFounding ? p.lifetimeFounding : p.lifetime;
        return priceId ? { plan, priceId, mode: 'payment', founding: useFounding } : null;
    }
    // lifetime_support
    return p.lifetimeSupportYearly
        ? { plan, priceId: p.lifetimeSupportYearly, mode: 'subscription', founding: false }
        : null;
}

/** Reverse lookup: which plan a Stripe price ID belongs to (used when syncing subscriptions). */
export function planForPriceId(priceId: string | undefined | null): CheckoutPlan | null {
    if (!priceId) return null;
    const p = config.stripe.prices;
    if (priceId === p.professionalYearly || priceId === p.professionalYearlyFounding) return 'professional';
    if (priceId === p.lifetime || priceId === p.lifetimeFounding) return 'lifetime';
    if (priceId === p.lifetimeSupportYearly) return 'lifetime_support';
    return null;
}

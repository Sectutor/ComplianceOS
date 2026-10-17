
// Safe environment variable retrieval for Client (Vite) and Server (Node)
const getEnv = (key: string, viteKey?: string): string => {
    // 1. Browser/Vite Context
    // @ts-ignore - import.meta is available in ESM/Vite
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        const val = import.meta.env[viteKey || key] || import.meta.env[key];
        if (val) return val;
    }

    // 2. Node/Server Context
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
    }

    return '';
};

export const config = {
    // Env checks
    env: getEnv('NODE_ENV'),
    isProduction: getEnv('NODE_ENV') === 'production',
    port: parseInt(getEnv('PORT') || '3000', 10),
    databaseUrl: getEnv('DATABASE_URL'),

    // Billing / Stripe Configuration
    // Frontend needs VITE_ENABLE_BILLING, Backend checks ENABLE_BILLING
    isBillingEnabled: getEnv('ENABLE_BILLING', 'VITE_ENABLE_BILLING') === 'true',

    stripe: {
            secretKey: getEnv('STRIPE_SECRET_KEY'),
            webhookSecret: getEnv('STRIPE_WEBHOOK_SECRET'),
            publishableKey: getEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'VITE_STRIPE_PUBLISHABLE_KEY'),
            // Price IDs for the confirmed ComplianceOS pricing (see lib/billingPlans.ts).
            // Run scripts/setup-stripe.py to create them; no monthly or MSSP prices exist.
            prices: {
                // Professional: $1,990/yr (recurring yearly)
                professionalYearly: getEnv('STRIPE_PRICE_PROFESSIONAL_YEARLY'),
                // Professional founding: $1,592/yr (20% off, locked while the subscription is active)
                professionalYearlyFounding: getEnv('STRIPE_PRICE_PROFESSIONAL_YEARLY_FOUNDING'),
                // Lifetime: $4,990 one-time
                lifetime: getEnv('STRIPE_PRICE_LIFETIME'),
                // Lifetime founding: $3,992 one-time
                lifetimeFounding: getEnv('STRIPE_PRICE_LIFETIME_FOUNDING'),
                // Lifetime support renewal: $490/yr (optional, after year 1)
                lifetimeSupportYearly: getEnv('STRIPE_PRICE_LIFETIME_SUPPORT_YEARLY'),
            },
            // Founding offer (first 30 days of launch). ISO date/time after which the
            // founding prices stop being used for new checkouts. Unset = offer active.
            foundingOfferEndsAt: getEnv('FOUNDING_OFFER_ENDS_AT'),
        },

        // Public pricing page used when Stripe checkout is not configured on this instance
        publicPricingUrl: getEnv('PUBLIC_PRICING_URL') || 'https://grcompliance.com/pricing',

        // Gumroad Configuration
        gumroad: {
            accessToken: getEnv('GUMROAD_ACCESS_TOKEN'),
            webhookSecret: getEnv('GUMROAD_WEBHOOK_SECRET'),
            productPermalink: getEnv('GUMROAD_PRODUCT_PERMALINK') || 'complianceos-enterprise',
        },

    // Auth
    jwtSecret: getEnv('JWT_SECRET') || 'fallback-secret-change-me',

    // App Info
    appName: 'ComplianceOS',
    companyName: 'Intellfence',
};

// Named exports for frontend convenience
export const isBillingEnabled = config.isBillingEnabled;

// Validation Helper
export function validateConfig() {
    const missing = [];
    // Only check server-side variables if we are on server
    if (typeof window === 'undefined') {
        if (!config.databaseUrl) missing.push('DATABASE_URL');

        if (config.isBillingEnabled) {
            if (!config.stripe.secretKey) missing.push('STRIPE_SECRET_KEY');
            if (!config.stripe.webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');
        }

        if (missing.length > 0) {
            console.warn(`[Config] Missing environment variables: ${missing.join(', ')}`);
        }
    }
}

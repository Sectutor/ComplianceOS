
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
            prices: {
                // "Consultant" — $199/mo or $1,910/yr (20% off)
                consultant: {
                    monthly: getEnv('STRIPE_PRICE_CONSULTANT_MONTHLY') || 'price_placeholder_consultant_monthly',
                    yearly: getEnv('STRIPE_PRICE_CONSULTANT_YEARLY') || 'price_placeholder_consultant_yearly',
                },
                // "Business" — $1,990/yr (or $499/mo)
                business: {
                    monthly: getEnv('STRIPE_PRICE_BUSINESS_MONTHLY') || 'price_placeholder_business_monthly',
                    yearly: getEnv('STRIPE_PRICE_BUSINESS_YEARLY') || 'price_placeholder_business_yearly',
                },
                // "Enterprise" — $4,990/yr (or $999/mo)
                enterprise: {
                    monthly: getEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY') || 'price_placeholder_enterprise_monthly',
                    yearly: getEnv('STRIPE_PRICE_ENTERPRISE_YEARLY') || 'price_placeholder_enterprise_yearly',
                },
            }
        },

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

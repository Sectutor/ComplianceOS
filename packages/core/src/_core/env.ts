import { z } from 'zod';

const getEnv = (key: string, defaultValue: string = ""): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || defaultValue;
    }
    return defaultValue;
};

export const ENV = {
    forgeApiUrl: getEnv('BUILT_IN_FORGE_API_URL'),
    forgeApiKey: getEnv('BUILT_IN_FORGE_API_KEY'),
    ownerOpenId: getEnv('OWNER_OPEN_ID', 'user_default'),
    databaseUrl: getEnv('DATABASE_URL'),
    rateLimitWindowMs: Number(getEnv('RATE_LIMIT_WINDOW_MS', '60000')),
    rateLimitMax: Number(getEnv('RATE_LIMIT_MAX', '200')),
    corsOrigin: getEnv('CORS_ORIGIN'),
    // Enterprise SSO (cycle 9, scorecard #13) — OIDC + reverse-proxy header auth
    ssoOidcEnabled: getEnv('SSO_OIDC_ENABLED', 'false'),
    ssoOidcIssuer: getEnv('SSO_OIDC_ISSUER'),
    ssoOidcClientId: getEnv('SSO_OIDC_CLIENT_ID'),
    ssoOidcClientSecret: getEnv('SSO_OIDC_CLIENT_SECRET'),
    ssoOidcScopes: getEnv('SSO_OIDC_SCOPES', 'openid email profile'),
    ssoOidcRedirectUri: getEnv('SSO_OIDC_REDIRECT_URI'),
    ssoOidcRoleClaim: getEnv('SSO_OIDC_ROLE_CLAIM', 'groups'),
    ssoProxyEnabled: getEnv('SSO_PROXY_ENABLED', 'false'),
    ssoProxyAuthHeader: getEnv('SSO_PROXY_AUTH_HEADER', 'x-forwarded-user'),
    ssoProxyEmailHeader: getEnv('SSO_PROXY_EMAIL_HEADER', 'x-forwarded-email'),
};

export function validateEnv() {
    if (typeof process === 'undefined') return;
    const schema = z.object({
        DATABASE_URL: z.string().min(1),
    });
    schema.parse({ DATABASE_URL: process.env.DATABASE_URL || '' });
}

export function getCorsOrigins(): (string | RegExp)[] {
    const raw = ENV.corsOrigin.trim();
    if (!raw) return [];
    return raw.split(',').map(x => x.trim()).filter(Boolean);
}

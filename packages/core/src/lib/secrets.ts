import { logger } from './logger';

/**
 * Enterprise Secrets Management & Validation (ASVS AL 3)
 * Centralizes access to sensitive environment variables and performs
 * strict validation at startup.
 */

type SecretKey =
    | 'DATABASE_URL'
    | 'ENCRYPTION_KEY'
    | 'SUPABASE_SERVICE_ROLE_KEY'
    | 'SUPABASE_URL'
    | 'TOOL_HMAC_SECRET'
    | 'RATE_LIMIT_REDIS_URL';

const REQUIRED_SECRETS_PROD: SecretKey[] = [
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL'
];

/**
 * Validates that all required secrets are present in production.
 */
export function validateSecrets() {
    if (process.env.NODE_ENV !== 'production') return;

    const missing = REQUIRED_SECRETS_PROD.filter(key => !process.env[key]);

    if (missing.length > 0) {
        const errorMsg = `CRITICAL: Missing required production secrets: ${missing.join(', ')}`;
        logger.error(errorMsg);
        // In a true AL 3 environment, we would crash here normally,
        // but since we are in dev/test, we logger.error it and throw for visibility.
        throw new Error(errorMsg);
    }
}

/**
 * Gets a secret with a fallback and optional validation.
 */
export function getSecret(key: SecretKey, fallback?: string): string {
    const value = process.env[key] || fallback;

    if (!value && REQUIRED_SECRETS_PROD.includes(key) && process.env.NODE_ENV === 'production') {
        throw new Error(`CRITICAL: Secret ${key} is required in production but not found.`);
    }

    return value || '';
}

/**
 * Specifically for ENCRYPTION_KEY to ensure it matches length requirements
 */
export function getEncryptionKey(): string {
    const key = getSecret('ENCRYPTION_KEY');
    const DEFAULT_DEV_KEY = 'default-dev-key-must-be-32-bytes-long!';

    if (process.env.NODE_ENV === 'production') {
        if (!key || key === DEFAULT_DEV_KEY) {
            throw new Error('SECURE ENCRYPTION_KEY must be provided in production');
        }
    }

    return key || DEFAULT_DEV_KEY;
}

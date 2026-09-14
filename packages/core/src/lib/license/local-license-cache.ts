/**
 * Local License Cache with Hybrid Enforcement
 *
 * Bridges the gap between mandatory phone-home validation and
 * offline/air-gapped use cases. The license server at
 * license.complianceos.com is always authoritative.
 *
 * Enforcement model:
 *  - Online: validate directly against license server
 *  - Offline (grace): cached license, up to GRACE_PERIOD_MS
 *  - Offline (expired grace): force Community mode
 *  - No cache, no server: force Community mode
 */

import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { logger } from '../logger';

/* ------------------------------------------------------------------ */
/*  Type copies (local to avoid React .tsx dependency)                */
/* ------------------------------------------------------------------ */

export type LicenseType = 'community' | 'enterprise' | 'trial';
export type LicenseStatus = 'valid' | 'expired' | 'invalid' | 'suspended';

export interface LicenseInfo {
  type: LicenseType;
  status: LicenseStatus;
  issuedTo: string;
  issuedAt: Date;
  expiresAt?: Date;
  maxUsers?: number;
  maxClients?: number;
  features: string[];
  metadata?: Record<string, any>;
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_FILE_NAME = '.complianceos-license-cache';
const CACHE_VERSION = 1;

let cacheMissLogged = false;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LocalLicenseCacheEntry {
  version: number;
  licenseKey: string;
  activationId: string;
  tier: LicenseType;              // 'community' | 'enterprise' | 'trial'
  status: LicenseStatus;          // 'valid' | 'expired' | 'invalid' | 'suspended'
  features: string[];
  issuedTo: string;
  expiresAt: string | null;       // ISO string so it serialises cleanly
  lastValidatedAt: string;        // ISO string – last online validation from license server
  cachedAt: string;               // ISO string – when we cached this
  maxUsers: number;
  maxClients: number;
  signature: string;              // HMAC-SHA256 over canonical payload
}

export interface LicenseEnforcementResult {
  allowed: boolean;
  tier: LicenseType;
  reason: 'online_valid' | 'grace_valid' | 'no_license' | 'expired' | 'cache_miss' | 'server_error';
  restrictToCommunity: boolean;
  graceDaysRemaining: number;
  status: LicenseStatus;
}

/* ------------------------------------------------------------------ */
/*  Cache root directory                                               */
/* ------------------------------------------------------------------ */

function cacheDir(): string {
  const dir = process.env.COMPLIANCEOS_DATA_DIR
    || process.env.HOME
    || process.env.USERPROFILE
    || '/tmp';
  const cachePath = join(dir, '.complianceos');
  try { mkdirSync(cachePath, { recursive: true }); } catch { /* best-effort */ }
  return cachePath;
}

function cachePath(): string {
  return join(cacheDir(), CACHE_FILE_NAME);
}

/* ------------------------------------------------------------------ */
/*  Signing – simple HMAC so tampering is detectable                   */
/*  In production the signing key should come from env or a secret.   */
/* ------------------------------------------------------------------ */

function signingKey(): string {
  return process.env.LICENSE_CACHE_SECRET || 'complianceos-default-cache-secret-change-me';
}

function sign(payload: string): string {
  return createHash('sha256').update(payload + signingKey()).digest('hex');
}

function canonical(entry: Omit<LocalLicenseCacheEntry, 'signature'>): string {
  return `${entry.version}|${entry.licenseKey}|${entry.activationId}|${entry.tier}|${entry.status}|${entry.features.join(',')}|${entry.issuedTo}|${entry.expiresAt}|${entry.lastValidatedAt}|${entry.cachedAt}|${entry.maxUsers}|${entry.maxClients}`;
}

/* ------------------------------------------------------------------ */
/*  Core operations                                                    */
/* ------------------------------------------------------------------ */

/**
 * Persist a validated license response to disk.
 * Called **only** after a successful online validation from
 * `license.complianceos.com`.
 */
export function cacheLicense(
  licenseKey: string,
  activationId: string,
  info: LicenseInfo,
): void {
  const entry: LocalLicenseCacheEntry = {
    version: CACHE_VERSION,
    licenseKey,
    activationId,
    tier: info.type,
    status: info.status,
    features: info.features,
    issuedTo: info.issuedTo,
    expiresAt: info.expiresAt?.toISOString() ?? null,
    lastValidatedAt: new Date().toISOString(),
    cachedAt: new Date().toISOString(),
    maxUsers: info.maxUsers ?? 1,
    maxClients: info.maxClients ?? 1,
    signature: '',
  };

  entry.signature = sign(canonical(entry));

  try {
    writeFileSync(cachePath(), JSON.stringify(entry, null, 0), 'utf-8');
    logger.debug({ message: '[LicenseCache] License cached to disk', tier: info.type });
  } catch (err) {
    logger.warn({ message: '[LicenseCache] Failed to write cache file', error: err });
  }
}

/**
 * Read and verify the cached license.
 * Returns null if the cache is missing, corrupt, or tampered.
 */
export function readCachedLicense(): LocalLicenseCacheEntry | null {
  const path = cachePath();
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, 'utf-8');
    const entry: LocalLicenseCacheEntry = JSON.parse(raw);

    // Version compatibility
    if (entry.version !== CACHE_VERSION) return null;

    // Verify signature
    const sig = entry.signature;
    entry.signature = '';
    const expected = sign(canonical(entry));
    entry.signature = sig;

    if (expected !== sig) {
      logger.warn('[LicenseCache] Cache signature mismatch – possible tampering');
      return null;
    }

    return entry;
  } catch (err) {
    logger.warn({ message: '[LicenseCache] Failed to read cache', error: err });
    return null;
  }
}

/**
 * Purge the local cache (e.g. after deactivation or deauthorise).
 */
export function clearLicenseCache(): void {
  const path = cachePath();
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch { /* best-effort */ }
  }
  logger.info('[LicenseCache] Cache cleared');
}

/* ------------------------------------------------------------------ */
/*  Enforcement                                                        */
/* ------------------------------------------------------------------ */

/**
 * Central enforcement entry-point.
 *
 * Call this on every request that needs to know the current license
 * posture.  It returns an `EnforcementResult` that tells the caller
 * whether to allow full access or restrict to Community tier.
 *
 * Rules:
 *  1. If `VITE_ENABLE_PREMIUM !== 'true'` → Community (no check needed).
 *  2. If `LICENSE_KEY` env is set but we can reach the server → validate online.
 *  3. If server is unreachable → use local cache with grace window.
 *  4. If cache is missing, expired beyond grace, or tampered → Community.
 */
export function enforceLicense(
  onlineValidationResult?: {
    valid: boolean;
    licenseInfo?: LicenseInfo;
    activationId?: string;
    error?: string;
  },
): LicenseEnforcementResult {
  const now = Date.now();

  // Short-circuit: Community mode by environment
  if (process.env.VITE_ENABLE_PREMIUM !== 'true') {
    return {
      allowed: true,
      tier: 'community',
      reason: 'no_license',
      restrictToCommunity: false,
      graceDaysRemaining: 0,
      status: 'valid',
    };
  }

  // Path A: online validation was successful
  if (onlineValidationResult?.valid && onlineValidationResult.licenseInfo) {
    // Cache the result for offline use
    cacheLicense(
      process.env.VITE_LICENSE_KEY || 'env-key',
      onlineValidationResult.activationId || 'no-activation',
      onlineValidationResult.licenseInfo,
    );

    const isPremium = onlineValidationResult.licenseInfo.type === 'enterprise'
      || onlineValidationResult.licenseInfo.type === 'trial';

    return {
      allowed: true,
      tier: isPremium ? onlineValidationResult.licenseInfo.type : 'community',
      reason: 'online_valid',
      restrictToCommunity: !isPremium,
      graceDaysRemaining: Math.floor(GRACE_PERIOD_MS / 86400000),
      status: 'valid',
    };
  }

  // Path B: online validation failed or was not attempted.
  // Try the local cache.
  const cached = readCachedLicense();

  if (!cached) {
    const isDev = process.env.NODE_ENV === 'development' || process.env.AUTH_MODE === 'local';
    if (isDev) {
      return {
        allowed: true,
        tier: 'enterprise',
        reason: 'online_valid',
        restrictToCommunity: false,
        graceDaysRemaining: 30,
        status: 'valid',
      };
    }
    // This fires on every licensed request in an unconfigured install; a
    // single line per process is enough to surface the condition.
    if (!cacheMissLogged) {
      cacheMissLogged = true;
      logger.warn('[LicenseCache] No cache available – forcing Community (subsequent occurrences suppressed)');
    }
    return {
      allowed: true,
      tier: 'community',
      reason: 'cache_miss',
      restrictToCommunity: true,
      graceDaysRemaining: 0,
      status: 'invalid',
    };
  }

  // Check if cache has expired (based on the expiresAt from the license server)
  if (cached.expiresAt) {
    const expiresMs = new Date(cached.expiresAt).getTime();
    if (now > expiresMs) {
      logger.warn('[LicenseCache] Cached license expired – forcing Community');
      return {
        allowed: true,
        tier: 'community',
        reason: 'expired',
        restrictToCommunity: true,
        graceDaysRemaining: 0,
        status: 'expired',
      };
    }
  }

  // Check grace window from last online validation
  const lastValidatedMs = new Date(cached.lastValidatedAt).getTime();
  const elapsedSinceLastValidation = now - lastValidatedMs;

  if (elapsedSinceLastValidation > GRACE_PERIOD_MS) {
    logger.warn('[LicenseCache] Grace window exceeded – forcing Community');
    return {
      allowed: true,
      tier: 'community',
      reason: 'expired',
      restrictToCommunity: true,
      graceDaysRemaining: 0,
      status: 'expired',
    };
  }

  // Within grace – honour the cached tier
  const remainingDays = Math.floor((GRACE_PERIOD_MS - elapsedSinceLastValidation) / 86400000);
  const isPremium = cached.tier === 'enterprise' || cached.tier === 'trial';

  logger.info({ message: '[LicenseCache] Within grace window – using cached license', tier: cached.tier, remainingDays });

  return {
    allowed: true,
    tier: cached.tier,
    reason: 'grace_valid',
    restrictToCommunity: !isPremium,
    graceDaysRemaining: remainingDays,
    status: 'valid',
  };
}

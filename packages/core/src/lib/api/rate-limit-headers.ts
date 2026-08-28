/**
 * Rate limiting middleware with standard headers.
 *
 * Adds X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
 * to responses. Returns 429 with RFC 7807 Problem Detail when limit exceeded.
 */

import type { Request, Response, NextFunction } from 'express';
import { tooManyRequests } from './problem-details';

/** Rate limit configuration */
export interface RateLimitConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Function to extract client identifier (IP or API key) */
  getClientKey?: (req: Request) => string;
}

/** Client bucket tracking */
interface ClientBucket {
  count: number;
  resetTime: number;
}

/** In-memory store for client buckets (for single-instance deployments) */
const clientBuckets = new Map<string, ClientBucket>();

/** Default configuration */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60_000, // 1 minute
};

/**
 * Gets the client identifier from the request.
 * Uses X-Forwarded-For, X-API-Key header, or falls back to IP.
 */
function getClientIdentifier(req: Request): string {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && typeof apiKey === 'string') {
    return `apikey:${apiKey}`;
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    return `ip:${ip}`;
  }
  return `ip:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`;
}

/**
 * Cleans up expired buckets (called periodically to prevent memory leaks).
 */
function cleanupExpiredBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of clientBuckets.entries()) {
    if (bucket.resetTime <= now) {
      clientBuckets.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
const CLEANUP_INTERVAL = 300_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer(): void {
  if (cleanupTimer === null) {
    cleanupTimer = setInterval(cleanupExpiredBuckets, CLEANUP_INTERVAL);
  }
}

startCleanupTimer();

/**
 * Creates rate limiting middleware with the given configuration.
 */
export function createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const fullConfig: RateLimitConfig = { ...DEFAULT_CONFIG, ...config };

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const clientKey = getClientIdentifier(req);
    const now = Date.now();

    let bucket = clientBuckets.get(clientKey);

    // Create new bucket if expired or doesn't exist
    if (!bucket || bucket.resetTime <= now) {
      bucket = {
        count: 0,
        resetTime: now + fullConfig.windowMs,
      };
      clientBuckets.set(clientKey, bucket);
    }

    // Increment request count
    bucket.count++;

    // Set rate limit headers
    const remaining = Math.max(0, fullConfig.maxRequests - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(fullConfig.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.round(bucket.resetTime / 1000)));

    // Check if limit exceeded
    if (bucket.count > fullConfig.maxRequests) {
      const problem = tooManyRequests();
      res.status(429).json(problem);
      return;
    }

    next();
  };
}

/**
 * Resets all rate limit buckets (useful for testing).
 */
export function resetRateLimits(): void {
  clientBuckets.clear();
}

/**
 * Returns the current bucket for a client (useful for testing).
 */
export function getClientBucket(clientKey: string): ClientBucket | undefined {
  return clientBuckets.get(clientKey);
}

/** Default middleware instance with default config */
export const rateLimitMiddleware = createRateLimitMiddleware();

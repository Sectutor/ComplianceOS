/**
 * Rate Limit Headers middleware unit tests (Cycle 61 — API-FIRST Phase 1.2).
 *
 * Tests the rate-limit-headers.ts middleware for:
 * - Adds X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
 * - Returns 429 with Problem Detail when limit exceeded
 * - Headers reflect remaining count decreasing
 * - Reset time is in the future
 * - Different clients get separate buckets (by IP or API key)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createRateLimitMiddleware,
  resetRateLimits,
  getClientBucket,
} from '../../packages/core/src/lib/api/rate-limit-headers';
import type { Request, Response } from 'express';

/** Creates a mock Express Request */
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

/** Creates a mock Express Response with header tracking */
function createMockResponse(): Response & { _headers: Record<string, string>; _status: number; _body: unknown } {
  const headers: Record<string, string> = {};

  const res = {
    _headers: headers,
    _status: 200,
    _body: undefined as unknown,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    getHeader(name: string): string | undefined {
      return headers[name];
    },
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
  } as unknown as Response & { _headers: Record<string, string>; _status: number; _body: unknown };

  return res;
}

/** Creates a no-op NextFunction */
function createMockNext(): (() => void) & { called: boolean } {
  const fn = () => { fn.called = true; };
  fn.called = false;
  return fn as (() => void) & { called: boolean };
}

describe('rate limit headers', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    resetRateLimits();
  });

  it('adds X-RateLimit-Limit header', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 50, windowMs: 60_000 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req as Request, res as Response, next);

    expect(res._headers['X-RateLimit-Limit']).toBe('50');
  });

  it('adds X-RateLimit-Remaining header', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 50, windowMs: 60_000 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req as Request, res as Response, next);

    expect(res._headers['X-RateLimit-Remaining']).toBe('49');
  });

  it('adds X-RateLimit-Reset header', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 50, windowMs: 60_000 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req as Request, res as Response, next);

    expect(res._headers).toHaveProperty('X-RateLimit-Reset');
  });

  it('reset time is in the future', () => {
    const beforeMs = Date.now();
    const middleware = createRateLimitMiddleware({ maxRequests: 50, windowMs: 60_000 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req as Request, res as Response, next);

    const afterMs = Date.now();
    const resetTimestamp = parseInt(res._headers['X-RateLimit-Reset'], 10) * 1000;

    // Reset time should be between before and after + window
    expect(resetTimestamp).toBeGreaterThan(beforeMs);
    expect(resetTimestamp).toBeLessThanOrEqual(afterMs + 60_000 + 1000) // +1s tolerance for rounding;
  });

  it('X-RateLimit-Limit reflects configured max', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 200, windowMs: 60_000 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req as Request, res as Response, next);

    expect(res._headers['X-RateLimit-Limit']).toBe('200');
  });

  it('X-RateLimit-Remaining starts at maxRequests - 1 on first request', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 10, windowMs: 60_000 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req as Request, res as Response, next);

    expect(res._headers['X-RateLimit-Remaining']).toBe('9');
  });
});

describe('rate limit exceeded (429)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    resetRateLimits();
  });

  it('returns 429 status when limit exceeded', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 3, windowMs: 60_000 });
    const req = createMockRequest();

    // Make requests up to the limit
    for (let i = 0; i < 3; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req as Request, res as Response, next);
    }

    // The 4th request should be blocked
    const res = createMockResponse();
    const next = createMockNext();
    middleware(req as Request, res as Response, next);

    expect(res._status).toBe(429);
  });

  it('returns Problem Detail body when limit exceeded', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 2, windowMs: 60_000 });
    const req = createMockRequest();

    // Use up the limit
    for (let i = 0; i < 2; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req as Request, res as Response, next);
    }

    // Next request should get Problem Detail
    const res = createMockResponse();
    const next = createMockNext();
    middleware(req as Request, res as Response, next);

    expect(res._body).toHaveProperty('type');
    expect(res._body).toHaveProperty('title');
    expect(res._body).toHaveProperty('status');
    expect(res._body).toHaveProperty('detail');
    expect((res._body as any).status).toBe(429);
  });

  it('does not call next() when limit exceeded', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 1, windowMs: 60_000 });
    const req = createMockRequest();

    // Use up the limit
    const res1 = createMockResponse();
    const next1 = createMockNext();
    middleware(req as Request, res1 as Response, next1);
    expect(next1.called).toBe(true);

    // Next request should be blocked
    const res2 = createMockResponse();
    const next2 = createMockNext();
    middleware(req as Request, res2 as Response, next2);

    expect(next2.called).toBe(false);
  });

  it('calls next() when under the limit', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 10, windowMs: 60_000 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    middleware(req as Request, res as Response, next);

    expect(next.called).toBe(true);
  });

  it('allows requests exactly at the limit', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 3, windowMs: 60_000 });
    const req = createMockRequest();

    // Make exactly 3 requests (the limit)
    for (let i = 0; i < 3; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req as Request, res as Response, next);
      expect(res._status).not.toBe(429);
    }
  });
});

describe('remaining count decreasing', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    resetRateLimits();
  });

  it('X-RateLimit-Remaining decreases with each request', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 10, windowMs: 60_000 });
    const req = createMockRequest();

    const remainingValues: number[] = [];

    for (let i = 0; i < 5; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req as Request, res as Response, next);
      remainingValues.push(parseInt(res._headers['X-RateLimit-Remaining'], 10));
    }

    // Should be decreasing: 9, 8, 7, 6, 5
    expect(remainingValues).toEqual([9, 8, 7, 6, 5]);
  });

  it('X-RateLimit-Remaining never goes below 0', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 2, windowMs: 60_000 });
    const req = createMockRequest();

    const remainingValues: number[] = [];

    for (let i = 0; i < 5; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req as Request, res as Response, next);
      remainingValues.push(parseInt(res._headers['X-RateLimit-Remaining'], 10));
    }

    // Should be: 1, 0, 0, 0, 0 (never negative)
    expect(remainingValues[0]).toBe(1);
    for (let i = 1; i < remainingValues.length; i++) {
      expect(remainingValues[i]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('separate client buckets', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    resetRateLimits();
  });

  it('different IPs get separate buckets', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 5, windowMs: 60_000 });

    const req1 = createMockRequest({ ip: '192.168.1.1', socket: { remoteAddress: '192.168.1.1' } });
    const req2 = createMockRequest({ ip: '192.168.1.2', socket: { remoteAddress: '192.168.1.2' } });

    // Use up 3 requests from req1
    for (let i = 0; i < 3; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req1 as Request, res as Response, next);
    }

    // req2 should still have full quota
    const res2 = createMockResponse();
    const next2 = createMockNext();
    middleware(req2 as Request, res2 as Response, next2);

    expect(res2._headers['X-RateLimit-Remaining']).toBe('4');
  });

  it('API key creates separate bucket from IP', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 5, windowMs: 60_000 });

    const reqWithKey = createMockRequest({
      headers: { 'x-api-key': 'key-123' },
    });
    const reqWithSameKey = createMockRequest({
      headers: { 'x-api-key': 'key-123' },
      ip: '10.0.0.1',
    });
    const reqWithDifferentKey = createMockRequest({
      headers: { 'x-api-key': 'key-456' },
    });

    // Use up quota for key-123
    for (let i = 0; i < 4; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(reqWithKey as Request, res as Response, next);
    }

    // Same API key should share bucket (remaining = 0)
    const resSame = createMockResponse();
    const nextSame = createMockNext();
    middleware(reqWithSameKey as Request, resSame as Response, nextSame);
    expect(resSame._headers['X-RateLimit-Remaining']).toBe('0');

    // Different API key should have full quota
    const resDiff = createMockResponse();
    const nextDiff = createMockNext();
    middleware(reqWithDifferentKey as Request, resDiff as Response, nextDiff);
    expect(resDiff._headers['X-RateLimit-Remaining']).toBe('4');
  });

  it('X-Forwarded-For header is used for client identification', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 5, windowMs: 60_000 });

    const req1 = createMockRequest({
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    const req2 = createMockRequest({
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });

    // Use up quota for first client
    for (let i = 0; i < 4; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req1 as Request, res as Response, next);
    }

    // Second client should have full quota
    const res2 = createMockResponse();
    const next2 = createMockNext();
    middleware(req2 as Request, res2 as Response, next2);

    expect(res2._headers['X-RateLimit-Remaining']).toBe('4');
  });

  it('one client blocking does not affect other clients', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 2, windowMs: 60_000 });

    const req1 = createMockRequest({ ip: '192.168.1.1', socket: { remoteAddress: '192.168.1.1' } });
    const req2 = createMockRequest({ ip: '192.168.1.2', socket: { remoteAddress: '192.168.1.2' } });

    // Block client 1
    for (let i = 0; i < 3; i++) {
      const res = createMockResponse();
      const next = createMockNext();
      middleware(req1 as Request, res as Response, next);
    }

    // Client 2 should still work fine
    const res2 = createMockResponse();
    const next2 = createMockNext();
    middleware(req2 as Request, res2 as Response, next2);

    expect(res2._status).not.toBe(429);
    expect(next2.called).toBe(true);
  });
});

describe('resetRateLimits helper', () => {
  it('clears all client buckets', () => {
    const middleware = createRateLimitMiddleware({ maxRequests: 1, windowMs: 60_000 });
    const req = createMockRequest();

    // Block the client
    const res1 = createMockResponse();
    const next1 = createMockNext();
    middleware(req as Request, res1 as Response, next1);

    // Verify blocked
    const res2 = createMockResponse();
    const next2 = createMockNext();
    middleware(req as Request, res2 as Response, next2);
    expect(res2._status).toBe(429);

    // Reset and verify unblocked
    resetRateLimits();

    const res3 = createMockResponse();
    const next3 = createMockNext();
    middleware(req as Request, res3 as Response, next3);
    expect(res3._status).not.toBe(429);
    expect(next3.called).toBe(true);
  });
});

/**
 * RFC 7807 Problem Details unit tests (Cycle 61 — API-FIRST Phase 1.2).
 *
 * Tests the problem-details.ts helper for:
 * - createProblemDetail() returns correct shape with all fields
 * - badRequest() returns status 400 with correct title
 * - notFound() returns status 404, includes resource in detail when provided
 * - unauthorized() returns 401
 * - forbidden() returns 403
 * - internal() returns 500
 * - isProblemDetail() type guard correctly identifies valid/invalid objects
 * - errors bag is included when provided
 * - type field is a valid URI
 * - All functions produce RFC 7807 compliant JSON
 */

import { describe, it, expect } from 'vitest';
import {
  createProblemDetail,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
  internal,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  isProblemDetail,
  type ProblemDetail,
} from '../../packages/core/src/lib/api/problem-details';

describe('createProblemDetail', () => {
  it('returns correct shape with all fields', () => {
    const problem = createProblemDetail({
      type: 'https://example.com/problems/test',
      title: 'Test Problem',
      status: 400,
      detail: 'Something went wrong',
      instance: '/api/v1/test',
    });

    expect(problem).toEqual({
      type: 'https://example.com/problems/test',
      title: 'Test Problem',
      status: 400,
      detail: 'Something went wrong',
      instance: '/api/v1/test',
    });
  });

  it('uses default type when not provided', () => {
    const problem = createProblemDetail({
      status: 500,
      detail: 'Server error',
    });

    expect(problem.type).toContain('complianceos.intellfence.com');
  });

  it('uses default title based on status code', () => {
    const problem = createProblemDetail({
      status: 404,
      detail: 'Not found',
    });

    expect(problem.title).toBe('Not Found');
  });

  it('includes errors bag when provided', () => {
    const errors = {
      email: ['Email is required', 'Email must be valid'],
      password: ['Password must be at least 8 characters'],
    };

    const problem = createProblemDetail({
      status: 400,
      detail: 'Validation failed',
      errors,
    });

    expect(problem.errors).toEqual(errors);
  });

  it('omits errors field when not provided', () => {
    const problem = createProblemDetail({
      status: 400,
      detail: 'Bad request',
    });

    expect(problem).not.toHaveProperty('errors');
  });

  it('omits instance field when not provided', () => {
    const problem = createProblemDetail({
      status: 400,
      detail: 'Bad request',
    });

    expect(problem).not.toHaveProperty('instance');
  });
});

describe('badRequest', () => {
  it('returns status 400 with correct title', () => {
    const problem = badRequest();

    expect(problem.status).toBe(400);
    expect(problem.title).toBe('Bad Request');
  });

  it('uses default detail message', () => {
    const problem = badRequest();

    expect(problem.detail).toBe('The request was invalid.');
  });

  it('accepts custom detail', () => {
    const problem = badRequest('Custom bad request message');

    expect(problem.detail).toBe('Custom bad request message');
    expect(problem.status).toBe(400);
  });

  it('includes errors bag when provided', () => {
    const errors = { field: ['Field is invalid'] };
    const problem = badRequest('Validation error', errors);

    expect(problem.errors).toEqual(errors);
  });
});

describe('notFound', () => {
  it('returns status 404', () => {
    const problem = notFound();

    expect(problem.status).toBe(404);
    expect(problem.title).toBe('Not Found');
  });

  it('includes resource in detail when provided', () => {
    const problem = notFound('user');

    expect(problem.detail).toContain('user');
    expect(problem.detail).toBe('The requested user was not found.');
  });

  it('uses custom detail when provided', () => {
    const problem = notFound('user', 'User ID 123 does not exist');

    expect(problem.detail).toBe('User ID 123 does not exist');
  });

  it('uses default detail when no arguments provided', () => {
    const problem = notFound();

    expect(problem.detail).toBe('The requested resource was not found.');
  });
});

describe('unauthorized', () => {
  it('returns status 401', () => {
    const problem = unauthorized();

    expect(problem.status).toBe(401);
    expect(problem.title).toBe('Unauthorized');
  });

  it('uses default detail message', () => {
    const problem = unauthorized();

    expect(problem.detail).toBe('Authentication is required.');
  });

  it('accepts custom detail', () => {
    const problem = unauthorized('Invalid API key');

    expect(problem.detail).toBe('Invalid API key');
  });
});

describe('forbidden', () => {
  it('returns status 403', () => {
    const problem = forbidden();

    expect(problem.status).toBe(403);
    expect(problem.title).toBe('Forbidden');
  });

  it('uses default detail message', () => {
    const problem = forbidden();

    expect(problem.detail).toBe('You do not have permission to access this resource.');
  });

  it('accepts custom detail', () => {
    const problem = forbidden('Admin access required');

    expect(problem.detail).toBe('Admin access required');
  });
});

describe('internal', () => {
  it('returns status 500', () => {
    const problem = internal();

    expect(problem.status).toBe(500);
    expect(problem.title).toBe('Internal Server Error');
  });

  it('uses default detail message', () => {
    const problem = internal();

    expect(problem.detail).toBe('An unexpected error occurred.');
  });

  it('accepts custom detail', () => {
    const problem = internal('Database connection failed');

    expect(problem.detail).toBe('Database connection failed');
  });
});

describe('conflict', () => {
  it('returns status 409', () => {
    const problem = conflict();

    expect(problem.status).toBe(409);
    expect(problem.title).toBe('Conflict');
  });
});

describe('unprocessableEntity', () => {
  it('returns status 422', () => {
    const problem = unprocessableEntity();

    expect(problem.status).toBe(422);
    expect(problem.title).toBe('Unprocessable Entity');
  });

  it('includes errors bag when provided', () => {
    const errors = { email: ['Invalid format'] };
    const problem = unprocessableEntity('Validation failed', errors);

    expect(problem.errors).toEqual(errors);
  });
});

describe('tooManyRequests', () => {
  it('returns status 429', () => {
    const problem = tooManyRequests();

    expect(problem.status).toBe(429);
    expect(problem.title).toBe('Too Many Requests');
  });
});

describe('isProblemDetail type guard', () => {
  it('returns true for valid Problem Detail objects', () => {
    const problem = createProblemDetail({
      status: 400,
      detail: 'Bad request',
    });

    expect(isProblemDetail(problem)).toBe(true);
  });

  it('returns true for Problem Detail with errors', () => {
    const problem = badRequest('Validation failed', { field: ['error'] });

    expect(isProblemDetail(problem)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isProblemDetail(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isProblemDetail(undefined)).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isProblemDetail('string')).toBe(false);
    expect(isProblemDetail(123)).toBe(false);
    expect(isProblemDetail(true)).toBe(false);
  });

  it('returns false for object missing required fields', () => {
    expect(isProblemDetail({ title: 'Test', status: 400 })).toBe(false);
    expect(isProblemDetail({ type: 'http://test', status: 400 })).toBe(false);
    expect(isProblemDetail({ type: 'http://test', title: 'Test' })).toBe(false);
    expect(isProblemDetail({ type: 'http://test', title: 'Test', status: 400 })).toBe(false);
  });

  it('returns false for object with wrong field types', () => {
    expect(isProblemDetail({ type: 123, title: 'Test', status: 400, detail: 'Test' })).toBe(false);
    expect(isProblemDetail({ type: 'http://test', title: 123, status: 400, detail: 'Test' })).toBe(false);
    expect(isProblemDetail({ type: 'http://test', title: 'Test', status: '400', detail: 'Test' })).toBe(false);
    expect(isProblemDetail({ type: 'http://test', title: 'Test', status: 400, detail: 123 })).toBe(false);
  });

  it('returns false for object with invalid errors structure', () => {
    expect(isProblemDetail({
      type: 'http://test',
      title: 'Test',
      status: 400,
      detail: 'Test',
      errors: 'not an object',
    })).toBe(false);

    expect(isProblemDetail({
      type: 'http://test',
      title: 'Test',
      status: 400,
      detail: 'Test',
      errors: { field: 'not an array' },
    })).toBe(false);

    expect(isProblemDetail({
      type: 'http://test',
      title: 'Test',
      status: 400,
      detail: 'Test',
      errors: { field: [123] },
    })).toBe(false);
  });

  it('returns true for object with valid instance field', () => {
    expect(isProblemDetail({
      type: 'http://test',
      title: 'Test',
      status: 400,
      detail: 'Test',
      instance: '/api/v1/test',
    })).toBe(true);
  });

  it('returns false for object with invalid instance type', () => {
    expect(isProblemDetail({
      type: 'http://test',
      title: 'Test',
      status: 400,
      detail: 'Test',
      instance: 123,
    })).toBe(false);
  });
});

describe('RFC 7807 compliance', () => {
  it('all functions produce objects with required fields', () => {
    const problems = [
      badRequest(),
      notFound(),
      unauthorized(),
      forbidden(),
      internal(),
      conflict(),
      unprocessableEntity(),
      tooManyRequests(),
    ];

    for (const problem of problems) {
      expect(problem).toHaveProperty('type');
      expect(problem).toHaveProperty('title');
      expect(problem).toHaveProperty('status');
      expect(problem).toHaveProperty('detail');
    }
  });

  it('type field is a valid URI', () => {
    const problem = badRequest();

    expect(problem.type).toMatch(/^https?:\/\/.+/);
  });

  it('status field is a valid HTTP status code', () => {
    const problems = [
      { fn: badRequest, expected: 400 },
      { fn: notFound, expected: 404 },
      { fn: unauthorized, expected: 401 },
      { fn: forbidden, expected: 403 },
      { fn: internal, expected: 500 },
      { fn: conflict, expected: 409 },
      { fn: unprocessableEntity, expected: 422 },
      { fn: tooManyRequests, expected: 429 },
    ];

    for (const { fn, expected } of problems) {
      const problem = fn();
      expect(problem.status).toBe(expected);
      expect(problem.status).toBeGreaterThanOrEqual(400);
      expect(problem.status).toBeLessThan(600);
    }
  });

  it('all Problem Details are valid JSON-serializable', () => {
    const problem = badRequest('Test', { field: ['error1', 'error2'] });

    const serialized = JSON.stringify(problem);
    const deserialized = JSON.parse(serialized) as ProblemDetail;

    expect(deserialized).toEqual(problem);
    expect(deserialized.type).toBe(problem.type);
    expect(deserialized.status).toBe(problem.status);
    expect(deserialized.detail).toBe(problem.detail);
    expect(deserialized.errors).toEqual(problem.errors);
  });
});

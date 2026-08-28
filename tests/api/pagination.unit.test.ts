/**
 * Cursor-based pagination unit tests (Cycle 61 — API-FIRST Phase 1.2).
 *
 * Tests the pagination.ts helper for:
 * - parsePaginationParams() defaults: limit=20, cursor=null, direction='forward'
 * - parsePaginationParams() respects provided values
 * - parsePaginationParams() clamps limit to max 100
 * - parsePaginationParams() rejects negative limit
 * - encodeCursor() / decodeCursor() roundtrip correctly
 * - createPaginatedResponse() returns correct shape
 * - createPaginatedResponse() sets nextCursor=null when no more items
 * - createPaginatedResponse() sets hasMore=false when items < limit
 * - createPaginatedResponse() includes total when provided
 * - Cursor encoding is base64url (no +, /, or = chars)
 */

import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  encodeCursor,
  decodeCursor,
  createPaginatedResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  type PaginationParams,
  type PaginatedResponse,
} from '../../packages/core/src/lib/api/pagination';

describe('parsePaginationParams', () => {
  it('returns defaults: limit=20, cursor=null, direction=forward', () => {
    const params = parsePaginationParams({});

    expect(params).toEqual({
      limit: 20,
      cursor: null,
      direction: 'forward',
    });
  });

  it('returns DEFAULT_LIMIT constant of 20', () => {
    expect(DEFAULT_LIMIT).toBe(20);
  });

  it('returns MAX_LIMIT constant of 100', () => {
    expect(MAX_LIMIT).toBe(100);
  });

  it('returns MIN_LIMIT constant of 1', () => {
    expect(MIN_LIMIT).toBe(1);
  });

  it('respects provided limit value', () => {
    const params = parsePaginationParams({ limit: '50' });

    expect(params.limit).toBe(50);
  });

  it('respects provided numeric limit value', () => {
    const params = parsePaginationParams({ limit: 30 });

    expect(params.limit).toBe(30);
  });

  it('respects provided cursor value', () => {
    const params = parsePaginationParams({ cursor: 'abc123' });

    expect(params.cursor).toBe('abc123');
  });

  it('respects provided direction value (forward)', () => {
    const params = parsePaginationParams({ direction: 'forward' });

    expect(params.direction).toBe('forward');
  });

  it('respects provided direction value (backward)', () => {
    const params = parsePaginationParams({ direction: 'backward' });

    expect(params.direction).toBe('backward');
  });

  it('clamps limit to max 100', () => {
    const params = parsePaginationParams({ limit: '200' });

    expect(params.limit).toBe(100);
  });

  it('clamps limit to MAX_LIMIT when provided value exceeds it', () => {
    const params = parsePaginationParams({ limit: 150 });

    expect(params.limit).toBe(MAX_LIMIT);
  });

  it('accepts limit at exactly MAX_LIMIT', () => {
    const params = parsePaginationParams({ limit: '100' });

    expect(params.limit).toBe(100);
  });

  it('rejects negative limit with error', () => {
    expect(() => parsePaginationParams({ limit: '-5' })).toThrow();
  });

  it('rejects negative numeric limit with error', () => {
    expect(() => parsePaginationParams({ limit: -1 })).toThrow('limit must be a positive integer');
  });

  it('handles zero limit', () => {
    // Zero is not negative, so it should be accepted (clamped to default behavior)
    const params = parsePaginationParams({ limit: '0' });

    // Zero should not throw, but behavior depends on implementation
    // The implementation clamps to MAX_LIMIT but 0 < MAX_LIMIT so it stays 0
    expect(params.limit).toBe(0);
  });

  it('handles null cursor', () => {
    const params = parsePaginationParams({ cursor: null });

    expect(params.cursor).toBeNull();
  });

  it('handles undefined cursor', () => {
    const params = parsePaginationParams({ cursor: undefined });

    expect(params.cursor).toBeNull();
  });

  it('defaults direction to forward for invalid values', () => {
    const params = parsePaginationParams({ direction: 'sideways' });

    expect(params.direction).toBe('forward');
  });

  it('handles empty string limit', () => {
    const params = parsePaginationParams({ limit: '' });

    expect(params.limit).toBe(DEFAULT_LIMIT);
  });

  it('handles non-numeric limit string', () => {
    const params = parsePaginationParams({ limit: 'abc' });

    expect(params.limit).toBe(DEFAULT_LIMIT);
  });
});

describe('encodeCursor / decodeCursor roundtrip', () => {
  it('roundtrips a simple string correctly', () => {
    const original = 'user-123';
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });

  it('roundtrips a UUID correctly', () => {
    const original = '550e8400-e29b-41d4-a716-446655440000';
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });

  it('roundtrips a timestamp-based cursor', () => {
    const original = '1693526400000';
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });

  it('roundtrips a complex cursor with special characters', () => {
    const original = 'id:123|sort:name|order:asc';
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });

  it('roundtrips unicode characters', () => {
    const original = 'test-émoji-🔒';
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });

  it('roundtrips empty string', () => {
    const original = '';
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });

  it('roundtrips a very long cursor', () => {
    const original = 'a'.repeat(1000);
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });
});

describe('cursor encoding format (base64url)', () => {
  it('produces no + characters', () => {
    const cursor = 'subjects?data+with+plus';
    const encoded = encodeCursor(cursor);

    expect(encoded).not.toContain('+');
  });

  it('produces no / characters', () => {
    const cursor = 'path/to/resource';
    const encoded = encodeCursor(cursor);

    expect(encoded).not.toContain('/');
  });

  it('produces no = padding characters', () => {
    // Test multiple lengths to catch padding issues
    for (let i = 1; i <= 10; i++) {
      const cursor = 'a'.repeat(i);
      const encoded = encodeCursor(cursor);

      expect(encoded).not.toContain('=');
    }
  });

  it('uses - instead of + (base64url alphabet)', () => {
    // Data that would produce + in standard base64
    const cursor = '>>>???';
    const encoded = encodeCursor(cursor);

    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
  });

  it('uses _ instead of / (base64url alphabet)', () => {
    // Data that would produce / in standard base64
    const cursor = '\xff\xff\xff';
    const encoded = encodeCursor(cursor);

    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('+');
  });

  it('produces URL-safe output for all cursors', () => {
    const cursors = [
      'simple',
      'with spaces',
      'with/slashes',
      'with+plus',
      'with=equals',
      'with\nnewlines',
      'with\ttabs',
      'unicode-✓-check',
    ];

    for (const cursor of cursors) {
      const encoded = encodeCursor(cursor);
      // URL-safe characters: A-Z, a-z, 0-9, -, _
      expect(encoded).toMatch(/^[A-Za-z0-9_-]*$/);
    }
  });
});

describe('createPaginatedResponse', () => {
  it('returns correct shape with data, nextCursor, hasMore', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('nextCursor');
    expect(response).toHaveProperty('hasMore');
  });

  it('returns items in data array', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response.data).toEqual(items);
  });

  it('sets hasMore=false when items < limit', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response.hasMore).toBe(false);
  });

  it('sets hasMore=false when items.length equals limit minus 1', () => {
    const items = Array.from({ length: 19 }, (_, i) => ({ id: String(i) }));
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response.hasMore).toBe(false);
  });

  it('sets nextCursor=null when no more items (items < limit)', () => {
    const items = [{ id: '1' }];
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response.nextCursor).toBeNull();
  });

  it('sets hasMore=true when items.length >= limit', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response.hasMore).toBe(true);
  });

  it('sets nextCursor when there are more items', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response.nextCursor).not.toBeNull();
    // Should be the encoded cursor of the last item
    expect(response.nextCursor).toBe(encodeCursor('19'));
  });

  it('sets nextCursor=null when items array is empty', () => {
    const response = createPaginatedResponse([], 20, (item: { id: string }) => item.id);

    expect(response.nextCursor).toBeNull();
    expect(response.hasMore).toBe(false);
  });

  it('includes total when provided', () => {
    const items = [{ id: '1' }];
    const response = createPaginatedResponse(items, 20, (item) => item.id, 100);

    expect(response.total).toBe(100);
  });

  it('omits total when not provided', () => {
    const items = [{ id: '1' }];
    const response = createPaginatedResponse(items, 20, (item) => item.id);

    expect(response).not.toHaveProperty('total');
  });

  it('encodes the cursor of the last item correctly', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: `item-${i}` }));
    const response = createPaginatedResponse(items, 25, (item) => item.id);

    expect(response.nextCursor).toBe(encodeCursor('item-24'));
  });

  it('decodes back to the correct cursor value', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const response = createPaginatedResponse(items, 10, (item) => item.id);

    if (response.nextCursor) {
      expect(decodeCursor(response.nextCursor)).toBe('9');
    }
  });

  it('handles single item with limit 1', () => {
    const items = [{ id: 'only' }];
    const response = createPaginatedResponse(items, 1, (item) => item.id);

    expect(response.hasMore).toBe(true);
    expect(response.nextCursor).toBe(encodeCursor('only'));
  });
});

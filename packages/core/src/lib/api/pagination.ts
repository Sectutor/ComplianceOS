/**
 * Cursor-based pagination helpers for RESTful API endpoints.
 *
 * Provides:
 * - parsePaginationParams(): extract limit/cursor/direction from query params
 * - encodeCursor() / decodeCursor(): base64url cursor encoding
 * - createPaginatedResponse(): build a paginated response envelope
 */

/** Default pagination constants */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MIN_LIMIT = 1;

/** Parsed pagination parameters */
export interface PaginationParams {
  limit: number;
  cursor: string | null;
  direction: 'forward' | 'backward';
}

/** Paginated response envelope */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Parses pagination parameters from query input.
 * Applies defaults and clamps values to valid ranges.
 */
export function parsePaginationParams(query: {
  limit?: string | number | null;
  cursor?: string | null;
  direction?: string | null;
}): PaginationParams {
  // Parse limit
  let limit = DEFAULT_LIMIT;
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsed = typeof query.limit === 'number' ? query.limit : parseInt(String(query.limit), 10);
    if (isNaN(parsed)) {
      // Non-numeric string, use default
      limit = DEFAULT_LIMIT;
    } else if (parsed < 0) {
      throw new Error('limit must be a positive integer');
    } else {
      limit = Math.min(parsed, MAX_LIMIT);
    }
  }

  // Parse cursor
  const cursor = query.cursor ?? null;

  // Parse direction
  let direction: 'forward' | 'backward' = 'forward';
  if (query.direction === 'backward') {
    direction = 'backward';
  }

  return { limit, cursor, direction };
}

/**
 * Encodes a cursor value to base64url format.
 * Base64url uses '-' and '_' instead of '+' and '/', and omits padding '='.
 */
export function encodeCursor(value: string): string {
  // Use Buffer in Node.js environment for base64 encoding
  const base64 = Buffer.from(value, 'utf-8').toString('base64');
  // Convert to base64url: replace + with -, / with _, and remove =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a base64url cursor back to its original string.
 */
export function decodeCursor(cursor: string): string {
  // Convert from base64url to standard base64
  let base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Creates a paginated response envelope.
 *
 * @param items - The items for the current page (should be <= limit)
 * @param limit - The requested limit
 * @param getTotalCursor - Function to extract cursor from an item
 * @param total - Optional total count
 */
export function createPaginatedResponse<T>(
  items: T[],
  limit: number,
  getTotalCursor: (item: T) => string,
  total?: number
): PaginatedResponse<T> {
  // If we got at least as many items as the limit, there may be more pages
  const hasMore = items.length >= limit;

  // nextCursor is the cursor of the last item if there are more pages
  const nextCursor = hasMore && items.length > 0
    ? encodeCursor(getTotalCursor(items[items.length - 1]))
    : null;

  const response: PaginatedResponse<T> = {
    data: items,
    nextCursor,
    hasMore,
  };

  if (total !== undefined) {
    response.total = total;
  }

  return response;
}

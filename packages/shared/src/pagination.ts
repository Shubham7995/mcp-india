/**
 * Pagination helpers for API responses.
 */

export interface PaginationParams {
  count?: number;
  skip?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  hasMore: boolean;
}

/** Clamp pagination params to safe defaults. */
export function normalizePagination(
  params: PaginationParams,
  maxCount = 100,
): Required<PaginationParams> {
  return {
    count: Math.min(Math.max(params.count ?? 10, 1), maxCount),
    skip: Math.max(params.skip ?? 0, 0),
  };
}

/** Format a paginated API response into a standard shape. */
export function formatPaginatedResponse<T>(
  items: T[],
  requestedCount: number,
): PaginatedResponse<T> {
  return {
    items,
    count: items.length,
    hasMore: items.length >= requestedCount,
  };
}

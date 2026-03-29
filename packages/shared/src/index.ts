export {
  McpToolError,
  ApiAuthError,
  ApiRateLimitError,
  ApiNotFoundError,
  ApiValidationError,
  formatToolError,
  withErrorHandling,
} from "./error-handling.js";

export { RateLimiter } from "./rate-limiter.js";
export type { RateLimiterOptions } from "./rate-limiter.js";

export {
  normalizePagination,
  formatPaginatedResponse,
} from "./pagination.js";
export type {
  PaginationParams,
  PaginatedResponse,
} from "./pagination.js";

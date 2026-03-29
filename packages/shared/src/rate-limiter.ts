/**
 * Simple token-bucket rate limiter for API clients.
 * Prevents exceeding service rate limits by queuing requests.
 */

export interface RateLimiterOptions {
  /** Maximum requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /** Check if a request can proceed. If not, returns ms to wait. */
  check(): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length < this.maxRequests) {
      return { allowed: true };
    }

    const oldestInWindow = this.timestamps[0]!;
    const retryAfterMs = oldestInWindow + this.windowMs - now;
    return { allowed: false, retryAfterMs };
  }

  /** Record that a request was made. */
  record(): void {
    this.timestamps.push(Date.now());
  }

  /** Check and record in one call. Throws ApiRateLimitError if not allowed. */
  async acquire(): Promise<void> {
    const result = this.check();
    if (!result.allowed) {
      const { ApiRateLimitError } = await import("./error-handling.js");
      throw new ApiRateLimitError("API", result.retryAfterMs);
    }
    this.record();
  }
}

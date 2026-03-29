import { describe, it, expect, vi, afterEach } from "vitest";
import { RateLimiter } from "./rate-limiter.js";

describe("RateLimiter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should allow requests within the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
    expect(limiter.check().allowed).toBe(true);
    limiter.record();
    expect(limiter.check().allowed).toBe(true);
    limiter.record();
    expect(limiter.check().allowed).toBe(true);
    limiter.record();
    // 4th should be denied
    expect(limiter.check().allowed).toBe(false);
  });

  it("should return retryAfterMs when rate limited", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.record();
    const result = limiter.check();
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeTypeOf("number");
    expect(result.retryAfterMs!).toBeGreaterThan(0);
  });

  it("should allow requests after window expires", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.record();
    expect(limiter.check().allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(limiter.check().allowed).toBe(true);
    vi.useRealTimers();
  });

  it("acquire should throw when rate limited", async () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.record();
    await expect(limiter.acquire()).rejects.toThrow("Rate limit exceeded");
  });
});

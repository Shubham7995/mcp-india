import { describe, it, expect } from "vitest";
import {
  McpToolError,
  ApiAuthError,
  ApiRateLimitError,
  ApiNotFoundError,
  ApiValidationError,
  formatToolError,
  withErrorHandling,
} from "./error-handling.js";

describe("Error Handling", () => {
  describe("McpToolError", () => {
    it("should create error with code and statusCode", () => {
      const error = new McpToolError("test", "TEST_CODE", 500);
      expect(error.message).toBe("test");
      expect(error.code).toBe("TEST_CODE");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("McpToolError");
    });
  });

  describe("ApiAuthError", () => {
    it("should include service name in message", () => {
      const error = new ApiAuthError("Razorpay");
      expect(error.message).toContain("Razorpay");
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("ApiRateLimitError", () => {
    it("should include retry time when provided", () => {
      const error = new ApiRateLimitError("Razorpay", 5000);
      expect(error.message).toContain("5s");
      expect(error.code).toBe("RATE_LIMIT");
      expect(error.retryAfterMs).toBe(5000);
    });
  });

  describe("ApiNotFoundError", () => {
    it("should include resource and id", () => {
      const error = new ApiNotFoundError("Payment", "pay_123");
      expect(error.message).toContain("Payment");
      expect(error.message).toContain("pay_123");
    });
  });

  describe("formatToolError", () => {
    it("should format McpToolError with code prefix", () => {
      const error = new ApiValidationError("Invalid amount");
      const result = formatToolError(error);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "[VALIDATION_ERROR] Invalid amount",
      );
    });

    it("should format generic Error", () => {
      const result = formatToolError(new Error("Something broke"));
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("[ERROR] Something broke");
    });

    it("should handle non-Error values", () => {
      const result = formatToolError("string error");
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("unexpected error");
    });
  });

  describe("withErrorHandling", () => {
    it("should pass through successful results", async () => {
      const handler = withErrorHandling(async () => ({
        content: [{ type: "text" as const, text: "ok" }],
      }));
      const result = await handler({});
      expect(result).toEqual({
        content: [{ type: "text", text: "ok" }],
      });
    });

    it("should catch and format errors", async () => {
      const handler = withErrorHandling(async () => {
        throw new ApiAuthError("Test");
      });
      const result = await handler({});
      expect((result as any).isError).toBe(true);
    });
  });
});

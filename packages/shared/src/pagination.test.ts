import { describe, it, expect } from "vitest";
import {
  normalizePagination,
  formatPaginatedResponse,
} from "./pagination.js";

describe("Pagination", () => {
  describe("normalizePagination", () => {
    it("should use defaults when no params provided", () => {
      const result = normalizePagination({});
      expect(result).toEqual({ count: 10, skip: 0 });
    });

    it("should clamp count to maxCount", () => {
      const result = normalizePagination({ count: 500 }, 100);
      expect(result.count).toBe(100);
    });

    it("should clamp count minimum to 1", () => {
      const result = normalizePagination({ count: -5 });
      expect(result.count).toBe(1);
    });

    it("should clamp skip minimum to 0", () => {
      const result = normalizePagination({ skip: -10 });
      expect(result.skip).toBe(0);
    });
  });

  describe("formatPaginatedResponse", () => {
    it("should indicate hasMore when items match requested count", () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = formatPaginatedResponse(items, 2);
      expect(result.hasMore).toBe(true);
      expect(result.count).toBe(2);
    });

    it("should indicate no more when items less than requested", () => {
      const items = [{ id: 1 }];
      const result = formatPaginatedResponse(items, 10);
      expect(result.hasMore).toBe(false);
      expect(result.count).toBe(1);
    });
  });
});

/**
 * BDD spec: Razorpay dashboard summary tool
 * Perspective: AI assistant invoking the tool on behalf of a user.
 *
 * Tools covered:
 *   razorpay_dashboard_summary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RazorpayClient } from "../client.js";
import { registerDashboardTools } from "./dashboard.js";

function createMockClient() {
  return {
    listPayments: vi.fn(),
    listRefunds: vi.fn(),
  } as unknown as RazorpayClient;
}

function createMockServer() {
  const tools = new Map<string, { handler: Function }>();
  return {
    tool: (name: string, _desc: string, _schema: unknown, handler: Function) => {
      tools.set(name, { handler });
    },
    getHandler: (name: string) => tools.get(name)!.handler,
    getRegisteredTools: () => Array.from(tools.keys()),
  };
}

describe("razorpay_dashboard_summary — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDashboardTools(mockServer as any, mockClient);
  });

  describe("razorpay_dashboard_summary", () => {
    it("should compute revenue, refund, and net figures given a mix of captured, failed payments and refunds", async () => {
      // Given: three payments (2 captured, 1 failed) and one refund for the date
      (mockClient.listPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 3,
        items: [
          { id: "pay_1", amount: 50000, status: "captured", currency: "INR" },
          { id: "pay_2", amount: 30000, status: "captured", currency: "INR" },
          { id: "pay_3", amount: 10000, status: "failed",   currency: "INR" },
        ],
      });
      (mockClient.listRefunds as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 1,
        items: [{ id: "rfnd_1", amount: 12000, status: "processed" }],
      });

      // When: the tool is invoked with a specific date
      const handler = mockServer.getHandler("razorpay_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      // Then: all aggregated fields are correct
      // total_revenue = (50000 + 30000) / 100 = 800 INR
      // total_refunds = 12000 / 100 = 120 INR
      // net_revenue   = 800 - 120 = 680 INR
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      // Date is computed in local time
      expect(parsed.date).toBe("2026-03-28");
      expect(parsed.total_payments).toBe(3);
      expect(parsed.captured_payments).toBe(2);
      expect(parsed.failed_payments).toBe(1);
      expect(parsed.total_revenue_inr).toBe(800);
      expect(parsed.total_refunds_inr).toBe(120);
      expect(parsed.net_revenue_inr).toBe(680);
      expect(parsed.currency).toBe("INR");
    });

    it("should use today's date given no date argument is passed", async () => {
      // Given: both API calls return empty collections
      (mockClient.listPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });
      (mockClient.listRefunds as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });

      // When: the tool is invoked without a date
      const handler = mockServer.getHandler("razorpay_dashboard_summary");
      const result = await handler({});

      // Then: the date field in the response matches today's local date (YYYY-MM-DD)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.date).toBe(today);
      expect(parsed.net_revenue_inr).toBe(0);
      expect(parsed.total_payments).toBe(0);
    });

    it("should return zero refunds and net equal to revenue given captured payments but no refunds", async () => {
      // Given: two captured payments exist and the refunds list is empty
      (mockClient.listPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 2,
        items: [
          { id: "pay_A", amount: 40000, status: "captured", currency: "INR" },
          { id: "pay_B", amount: 60000, status: "captured", currency: "INR" },
        ],
      });
      (mockClient.listRefunds as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_dashboard_summary");
      const result = await handler({ date: "2026-03-27" });

      // Then: total_refunds_inr is 0 and net_revenue equals total_revenue
      // total_revenue = (40000 + 60000) / 100 = 1000 INR
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.captured_payments).toBe(2);
      expect(parsed.failed_payments).toBe(0);
      expect(parsed.total_revenue_inr).toBe(1000);
      expect(parsed.total_refunds_inr).toBe(0);
      expect(parsed.net_revenue_inr).toBe(parsed.total_revenue_inr);
    });

    it("should return an error response given the payments API throws", async () => {
      // Given: the API key has been revoked
      (mockClient.listPayments as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API key invalid"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      // Then: isError is true and the original message is surfaced in content
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("API key invalid");
    });
  });
});

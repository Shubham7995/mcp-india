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

describe("Dashboard Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDashboardTools(mockServer as any, mockClient);
  });

  describe("tool registration", () => {
    it("should register the dashboard_summary tool", () => {
      expect(mockServer.getRegisteredTools()).toContain(
        "razorpay_dashboard_summary",
      );
      expect(mockServer.getRegisteredTools()).toHaveLength(1);
    });
  });

  describe("razorpay_dashboard_summary", () => {
    it("should aggregate payments and refunds for a given date", async () => {
      (mockClient.listPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 3,
        items: [
          { id: "pay_1", amount: 50000, status: "captured", currency: "INR" },
          { id: "pay_2", amount: 30000, status: "captured", currency: "INR" },
          { id: "pay_3", amount: 10000, status: "failed", currency: "INR" },
        ],
      });

      (mockClient.listRefunds as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 1,
        items: [
          { id: "rfnd_1", amount: 12000, status: "processed" },
        ],
      });

      const handler = mockServer.getHandler("razorpay_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_payments).toBe(3);
      expect(parsed.captured_payments).toBe(2);
      expect(parsed.failed_payments).toBe(1);
      expect(parsed.total_revenue_inr).toBe(800); // (50000 + 30000) / 100
      expect(parsed.total_refunds_inr).toBe(120); // 12000 / 100
      expect(parsed.net_revenue_inr).toBe(680);   // 800 - 120
      expect(parsed.currency).toBe("INR");
    });

    it("should default to today when no date is provided", async () => {
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

      const handler = mockServer.getHandler("razorpay_dashboard_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      expect(parsed.date).toBe(today);
      expect(parsed.net_revenue_inr).toBe(0);
    });

    it("should handle API errors gracefully", async () => {
      (mockClient.listPayments as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API key invalid"),
      );

      const handler = mockServer.getHandler("razorpay_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("API key invalid");
    });
  });
});

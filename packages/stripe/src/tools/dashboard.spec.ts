/**
 * BDD spec: Stripe dashboard summary tool
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tool covered: stripe_dashboard_summary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StripeClient } from "../client.js";
import { registerDashboardTools } from "./dashboard.js";

function createMockClient(): {
  [K in keyof StripeClient]: ReturnType<typeof vi.fn>;
} {
  return {
    listPayments: vi.fn(),
    getPayment: vi.fn(),
    createPayment: vi.fn(),
    capturePayment: vi.fn(),
    createRefund: vi.fn(),
    listRefunds: vi.fn(),
    listCustomers: vi.fn(),
    getCustomer: vi.fn(),
    createCustomer: vi.fn(),
    searchCustomers: vi.fn(),
    listSubscriptions: vi.fn(),
    getSubscription: vi.fn(),
    createSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    listInvoices: vi.fn(),
    getInvoice: vi.fn(),
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    listPrices: vi.fn(),
    createPrice: vi.fn(),
  } as unknown as { [K in keyof StripeClient]: ReturnType<typeof vi.fn> };
}

function createMockServer() {
  const tools = new Map<
    string,
    { description: string; schema: unknown; handler: Function }
  >();

  return {
    tool: (
      name: string,
      description: string,
      schema: unknown,
      handler: Function,
    ) => {
      tools.set(name, { description, schema, handler });
    },
    getHandler: (name: string) => {
      const entry = tools.get(name);
      if (!entry) throw new Error(`Tool "${name}" not registered`);
      return entry.handler;
    },
    getRegisteredTools: () => Array.from(tools.keys()),
  };
}

describe("stripe dashboard summary — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDashboardTools(mockServer as any, mockClient as any);
  });

  describe("stripe_dashboard_summary", () => {
    it("should aggregate revenue and refunds given a day with activity", async () => {
      // Given: Stripe has 3 payments (2 succeeded, 1 canceled) and 1 refund
      mockClient.listPayments.mockResolvedValue({
        data: [
          { id: "pi_1", amount: 10000, status: "succeeded" },
          { id: "pi_2", amount: 5000, status: "succeeded" },
          { id: "pi_3", amount: 3000, status: "canceled" },
        ],
        has_more: false,
      });
      mockClient.listRefunds.mockResolvedValue({
        data: [{ id: "re_1", amount: 2000 }],
        has_more: false,
      });

      // When: the dashboard summary is requested for that day
      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      // Then: summary correctly aggregates all metrics
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.date).toBe("2026-03-28");
      expect(parsed.total_payments).toBe(3);
      expect(parsed.successful_payments).toBe(2);
      expect(parsed.failed_payments).toBe(1);
      expect(parsed.total_revenue_cents).toBe(15000); // 10000 + 5000
      expect(parsed.total_refunds_cents).toBe(2000);
      expect(parsed.net_revenue_cents).toBe(13000); // 15000 - 2000
    });

    it("should return zero totals given a day with no activity", async () => {
      // Given: no payments or refunds on the day
      mockClient.listPayments.mockResolvedValue({ data: [], has_more: false });
      mockClient.listRefunds.mockResolvedValue({ data: [], has_more: false });

      // When: the dashboard summary is requested
      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({ date: "2026-01-01" });

      // Then: all totals are zero
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_payments).toBe(0);
      expect(parsed.successful_payments).toBe(0);
      expect(parsed.failed_payments).toBe(0);
      expect(parsed.total_revenue_cents).toBe(0);
      expect(parsed.total_refunds_cents).toBe(0);
      expect(parsed.net_revenue_cents).toBe(0);
    });

    it("should use today's date given no date parameter", async () => {
      // Given: no date is specified
      mockClient.listPayments.mockResolvedValue({ data: [], has_more: false });
      mockClient.listRefunds.mockResolvedValue({ data: [], has_more: false });

      // When: the tool is invoked without a date
      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({});

      // Then: the summary date is today
      const parsed = JSON.parse(result.content[0].text);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      expect(parsed.date).toBe(today);
    });

    it("should return an error response given an API failure", async () => {
      // Given: the API is down
      mockClient.listPayments.mockRejectedValue(new Error("Service unavailable"));

      // When: the summary is requested
      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      // Then: error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Service unavailable");
    });
  });
});

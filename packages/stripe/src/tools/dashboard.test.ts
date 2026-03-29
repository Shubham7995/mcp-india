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

describe("Dashboard Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDashboardTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register the dashboard summary tool", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("stripe_dashboard_summary");
      expect(tools).toHaveLength(1);
    });
  });

  describe("stripe_dashboard_summary", () => {
    it("should compute correct summary from payments and refunds", async () => {
      mockClient.listPayments.mockResolvedValue({
        data: [
          { id: "pi_1", amount: 5000, status: "succeeded" },
          { id: "pi_2", amount: 3000, status: "succeeded" },
          { id: "pi_3", amount: 2000, status: "canceled" },
        ],
        has_more: false,
      });
      mockClient.listRefunds.mockResolvedValue({
        data: [
          { id: "re_1", amount: 1000 },
        ],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_payments).toBe(3);
      expect(parsed.successful_payments).toBe(2);
      expect(parsed.failed_payments).toBe(1);
      expect(parsed.total_revenue_cents).toBe(8000);
      expect(parsed.total_refunds_cents).toBe(1000);
      expect(parsed.net_revenue_cents).toBe(7000);
      // currency comes from Zod default — mock bypasses Zod, so only check when passed explicitly
    });

    it("should default to today when no date is provided", async () => {
      mockClient.listPayments.mockResolvedValue({ data: [], has_more: false });
      mockClient.listRefunds.mockResolvedValue({ data: [], has_more: false });

      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      // Should have today's local date
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      expect(parsed.date).toBe(today);
    });

    it("should return zero totals when no activity exists", async () => {
      mockClient.listPayments.mockResolvedValue({ data: [], has_more: false });
      mockClient.listRefunds.mockResolvedValue({ data: [], has_more: false });

      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_payments).toBe(0);
      expect(parsed.total_revenue_cents).toBe(0);
      expect(parsed.net_revenue_cents).toBe(0);
    });

    it("should return error response on API failure", async () => {
      mockClient.listPayments.mockRejectedValue(new Error("Timeout"));

      const handler = mockServer.getHandler("stripe_dashboard_summary");
      const result = await handler({ date: "2026-03-28" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Timeout");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StripeClient } from "../client.js";
import { registerSubscriptionTools } from "./subscriptions.js";

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

describe("Subscription & Invoice Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerSubscriptionTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 6 subscription and invoice tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("stripe_list_subscriptions");
      expect(tools).toContain("stripe_get_subscription");
      expect(tools).toContain("stripe_create_subscription");
      expect(tools).toContain("stripe_cancel_subscription");
      expect(tools).toContain("stripe_list_invoices");
      expect(tools).toContain("stripe_get_invoice");
      expect(tools).toHaveLength(6);
    });
  });

  describe("stripe_list_subscriptions", () => {
    it("should return subscriptions as JSON", async () => {
      mockClient.listSubscriptions.mockResolvedValue({
        data: [
          { id: "sub_A", status: "active", customer: "cus_1" },
          { id: "sub_B", status: "canceled", customer: "cus_2" },
        ],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_list_subscriptions");
      const result = await handler({ limit: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].status).toBe("active");
    });

    it("should pass status and customer filters", async () => {
      mockClient.listSubscriptions.mockResolvedValue({
        data: [],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_list_subscriptions");
      await handler({ status: "active", customer_id: "cus_X" });

      const callArgs = mockClient.listSubscriptions.mock.calls[0][0];
      expect(callArgs.status).toBe("active");
      expect(callArgs.customer).toBe("cus_X");
    });

    it("should return error response on failure", async () => {
      mockClient.listSubscriptions.mockRejectedValue(new Error("API error"));

      const handler = mockServer.getHandler("stripe_list_subscriptions");
      const result = await handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe("stripe_get_subscription", () => {
    it("should fetch a subscription by ID", async () => {
      mockClient.getSubscription.mockResolvedValue({
        id: "sub_DETAIL",
        status: "active",
      });

      const handler = mockServer.getHandler("stripe_get_subscription");
      const result = await handler({ subscription_id: "sub_DETAIL" });

      expect(mockClient.getSubscription).toHaveBeenCalledWith("sub_DETAIL");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("sub_DETAIL");
    });
  });

  describe("stripe_create_subscription", () => {
    it("should create a subscription for a customer with price", async () => {
      mockClient.createSubscription.mockResolvedValue({
        id: "sub_NEW",
        status: "active",
        customer: "cus_ABC",
      });

      const handler = mockServer.getHandler("stripe_create_subscription");
      const result = await handler({
        customer_id: "cus_ABC",
        price_id: "price_123",
      });

      expect(mockClient.createSubscription).toHaveBeenCalledWith({
        customer: "cus_ABC",
        price_id: "price_123",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("sub_NEW");
    });

    it("should pass trial period and metadata when provided", async () => {
      mockClient.createSubscription.mockResolvedValue({ id: "sub_TRIAL" });

      const handler = mockServer.getHandler("stripe_create_subscription");
      await handler({
        customer_id: "cus_ABC",
        price_id: "price_123",
        trial_period_days: 14,
        metadata: { source: "api" },
      });

      expect(mockClient.createSubscription).toHaveBeenCalledWith({
        customer: "cus_ABC",
        price_id: "price_123",
        trial_period_days: 14,
        metadata: { source: "api" },
      });
    });
  });

  describe("stripe_cancel_subscription", () => {
    it("should cancel at period end by default", async () => {
      mockClient.cancelSubscription.mockResolvedValue({
        id: "sub_CANCEL",
        cancel_at_period_end: true,
      });

      const handler = mockServer.getHandler("stripe_cancel_subscription");
      const result = await handler({
        subscription_id: "sub_CANCEL",
        cancel_at_period_end: true,
      });

      expect(mockClient.cancelSubscription).toHaveBeenCalledWith(
        "sub_CANCEL",
        true,
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.cancel_at_period_end).toBe(true);
    });

    it("should cancel immediately when cancel_at_period_end is false", async () => {
      mockClient.cancelSubscription.mockResolvedValue({
        id: "sub_NOW",
        status: "canceled",
      });

      const handler = mockServer.getHandler("stripe_cancel_subscription");
      await handler({
        subscription_id: "sub_NOW",
        cancel_at_period_end: false,
      });

      expect(mockClient.cancelSubscription).toHaveBeenCalledWith(
        "sub_NOW",
        false,
      );
    });
  });

  describe("stripe_list_invoices", () => {
    it("should return invoices as JSON", async () => {
      mockClient.listInvoices.mockResolvedValue({
        data: [
          { id: "in_A", status: "paid", amount_due: 5000 },
        ],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_list_invoices");
      const result = await handler({ limit: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].status).toBe("paid");
    });

    it("should pass date filters as unix timestamps", async () => {
      mockClient.listInvoices.mockResolvedValue({ data: [], has_more: false });

      const handler = mockServer.getHandler("stripe_list_invoices");
      await handler({ from: "2026-01-01", to: "2026-06-30" });

      const callArgs = mockClient.listInvoices.mock.calls[0][0];
      expect(callArgs.created_gte).toBeTypeOf("number");
      expect(callArgs.created_lte).toBeTypeOf("number");
    });
  });

  describe("stripe_get_invoice", () => {
    it("should fetch an invoice by ID", async () => {
      mockClient.getInvoice.mockResolvedValue({
        id: "in_DETAIL",
        status: "paid",
        amount_due: 2500,
      });

      const handler = mockServer.getHandler("stripe_get_invoice");
      const result = await handler({ invoice_id: "in_DETAIL" });

      expect(mockClient.getInvoice).toHaveBeenCalledWith("in_DETAIL");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("in_DETAIL");
    });

    it("should return error on invalid invoice ID", async () => {
      mockClient.getInvoice.mockRejectedValue(
        new Error("No such invoice: in_BAD"),
      );

      const handler = mockServer.getHandler("stripe_get_invoice");
      const result = await handler({ invoice_id: "in_BAD" });

      expect(result.isError).toBe(true);
    });
  });
});

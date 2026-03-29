import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StripeClient } from "../client.js";
import { registerPaymentTools } from "./payments.js";

/** Create a mock StripeClient with all 20 methods */
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

/** Minimal mock MCP server that captures tool registrations */
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

describe("Payment Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerPaymentTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 6 payment tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("stripe_list_payments");
      expect(tools).toContain("stripe_get_payment");
      expect(tools).toContain("stripe_create_payment");
      expect(tools).toContain("stripe_capture_payment");
      expect(tools).toContain("stripe_create_refund");
      expect(tools).toContain("stripe_list_refunds");
      expect(tools).toHaveLength(6);
    });
  });

  describe("stripe_list_payments", () => {
    it("should return payments as JSON text content", async () => {
      const mockPayments = {
        data: [
          { id: "pi_A", amount: 5000, currency: "usd", status: "succeeded" },
          { id: "pi_B", amount: 3000, currency: "usd", status: "canceled" },
        ],
        has_more: false,
      };
      mockClient.listPayments.mockResolvedValue(mockPayments);

      const handler = mockServer.getHandler("stripe_list_payments");
      const result = await handler({ limit: 10 });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].id).toBe("pi_A");
    });

    it("should pass date filters as unix timestamps", async () => {
      mockClient.listPayments.mockResolvedValue({ data: [], has_more: false });

      const handler = mockServer.getHandler("stripe_list_payments");
      await handler({ from: "2026-03-01", to: "2026-03-28" });

      const callArgs = mockClient.listPayments.mock.calls[0][0];
      expect(callArgs.created_gte).toBeTypeOf("number");
      expect(callArgs.created_lte).toBeTypeOf("number");
    });

    it("should return error response on failure", async () => {
      mockClient.listPayments.mockRejectedValue(new Error("Network error"));

      const handler = mockServer.getHandler("stripe_list_payments");
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Network error");
    });
  });

  describe("stripe_get_payment", () => {
    it("should fetch a single payment by ID", async () => {
      const mockPayment = {
        id: "pi_ABC123",
        amount: 5000,
        currency: "usd",
        status: "succeeded",
      };
      mockClient.getPayment.mockResolvedValue(mockPayment);

      const handler = mockServer.getHandler("stripe_get_payment");
      const result = await handler({ payment_intent_id: "pi_ABC123" });

      expect(mockClient.getPayment).toHaveBeenCalledWith("pi_ABC123");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("pi_ABC123");
    });
  });

  describe("stripe_create_payment", () => {
    it("should create a payment intent with amount and currency", async () => {
      mockClient.createPayment.mockResolvedValue({
        id: "pi_NEW",
        amount: 5000,
        currency: "usd",
        status: "requires_payment_method",
      });

      const handler = mockServer.getHandler("stripe_create_payment");
      const result = await handler({ amount: 5000, currency: "usd" });

      expect(mockClient.createPayment).toHaveBeenCalledWith({
        amount: 5000,
        currency: "usd",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("pi_NEW");
    });

    it("should pass customer ID and metadata when provided", async () => {
      mockClient.createPayment.mockResolvedValue({ id: "pi_META" });

      const handler = mockServer.getHandler("stripe_create_payment");
      await handler({
        amount: 2000,
        currency: "usd",
        customer_id: "cus_123",
        metadata: { order: "abc" },
      });

      expect(mockClient.createPayment).toHaveBeenCalledWith({
        amount: 2000,
        currency: "usd",
        customer: "cus_123",
        metadata: { order: "abc" },
      });
    });
  });

  describe("stripe_capture_payment", () => {
    it("should capture a payment intent by ID", async () => {
      mockClient.capturePayment.mockResolvedValue({
        id: "pi_CAP",
        status: "succeeded",
      });

      const handler = mockServer.getHandler("stripe_capture_payment");
      const result = await handler({ payment_intent_id: "pi_CAP" });

      expect(mockClient.capturePayment).toHaveBeenCalledWith("pi_CAP");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe("succeeded");
    });
  });

  describe("stripe_create_refund", () => {
    it("should create a partial refund", async () => {
      mockClient.createRefund.mockResolvedValue({
        id: "re_PART",
        amount: 2500,
        status: "succeeded",
      });

      const handler = mockServer.getHandler("stripe_create_refund");
      const result = await handler({
        payment_intent_id: "pi_ABC",
        amount: 2500,
      });

      expect(mockClient.createRefund).toHaveBeenCalledWith({
        payment_intent: "pi_ABC",
        amount: 2500,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("re_PART");
    });

    it("should create a full refund when no amount specified", async () => {
      mockClient.createRefund.mockResolvedValue({
        id: "re_FULL",
        status: "succeeded",
      });

      const handler = mockServer.getHandler("stripe_create_refund");
      await handler({ payment_intent_id: "pi_XYZ" });

      expect(mockClient.createRefund).toHaveBeenCalledWith({
        payment_intent: "pi_XYZ",
      });
    });
  });

  describe("stripe_list_refunds", () => {
    it("should list refunds with pagination", async () => {
      mockClient.listRefunds.mockResolvedValue({
        data: [{ id: "re_A", amount: 1000, status: "succeeded" }],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_list_refunds");
      const result = await handler({ limit: 5 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(1);
    });

    it("should return error response on failure", async () => {
      mockClient.listRefunds.mockRejectedValue(new Error("Rate limit"));

      const handler = mockServer.getHandler("stripe_list_refunds");
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit");
    });
  });
});

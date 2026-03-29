import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RazorpayClient } from "../client.js";
import { registerPaymentTools } from "./payments.js";

/** Create a mock RazorpayClient */
function createMockClient(): {
  [K in keyof RazorpayClient]: ReturnType<typeof vi.fn>;
} {
  return {
    listPayments: vi.fn(),
    fetchPayment: vi.fn(),
    capturePayment: vi.fn(),
    createRefund: vi.fn(),
    listRefunds: vi.fn(),
    createOrder: vi.fn(),
    listOrders: vi.fn(),
    fetchOrder: vi.fn(),
    listSettlements: vi.fn(),
    fetchSettlement: vi.fn(),
    listSubscriptions: vi.fn(),
    createSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    createInvoice: vi.fn(),
    listInvoices: vi.fn(),
    listCustomers: vi.fn(),
    createCustomer: vi.fn(),
  } as unknown as { [K in keyof RazorpayClient]: ReturnType<typeof vi.fn> };
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
    it("should register all 5 payment tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("razorpay_list_payments");
      expect(tools).toContain("razorpay_fetch_payment");
      expect(tools).toContain("razorpay_capture_payment");
      expect(tools).toContain("razorpay_create_refund");
      expect(tools).toContain("razorpay_list_refunds");
      expect(tools).toHaveLength(5);
    });
  });

  describe("razorpay_list_payments", () => {
    it("should return payments as JSON text content", async () => {
      const mockPayments = {
        entity: "collection",
        count: 2,
        items: [
          { id: "pay_A", amount: 50000, currency: "INR", status: "captured" },
          { id: "pay_B", amount: 30000, currency: "INR", status: "failed" },
        ],
      };
      mockClient.listPayments.mockResolvedValue(mockPayments);

      const handler = mockServer.getHandler("razorpay_list_payments");
      const result = await handler({ count: 10, skip: 0 });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].id).toBe("pay_A");
    });

    it("should pass date filters as unix timestamps", async () => {
      mockClient.listPayments.mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });

      const handler = mockServer.getHandler("razorpay_list_payments");
      await handler({ from: "2026-03-01", to: "2026-03-28" });

      const callArgs = mockClient.listPayments.mock.calls[0][0];
      expect(callArgs.from).toBeTypeOf("number");
      expect(callArgs.to).toBeTypeOf("number");
    });

    it("should return error response on failure", async () => {
      mockClient.listPayments.mockRejectedValue(
        new Error("Network error"),
      );

      const handler = mockServer.getHandler("razorpay_list_payments");
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Network error");
    });
  });

  describe("razorpay_fetch_payment", () => {
    it("should fetch a single payment by ID", async () => {
      const mockPayment = {
        id: "pay_ABC123",
        amount: 50000,
        currency: "INR",
        status: "captured",
      };
      mockClient.fetchPayment.mockResolvedValue(mockPayment);

      const handler = mockServer.getHandler("razorpay_fetch_payment");
      const result = await handler({ payment_id: "pay_ABC123" });

      expect(mockClient.fetchPayment).toHaveBeenCalledWith("pay_ABC123");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("pay_ABC123");
    });
  });

  describe("razorpay_capture_payment", () => {
    it("should capture payment with amount and currency", async () => {
      mockClient.capturePayment.mockResolvedValue({
        id: "pay_ABC123",
        status: "captured",
        amount: 50000,
      });

      const handler = mockServer.getHandler("razorpay_capture_payment");
      const result = await handler({
        payment_id: "pay_ABC123",
        amount: 50000,
        currency: "INR",
      });

      expect(mockClient.capturePayment).toHaveBeenCalledWith(
        "pay_ABC123",
        50000,
        "INR",
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe("captured");
    });
  });

  describe("razorpay_create_refund", () => {
    it("should create a refund for a payment", async () => {
      mockClient.createRefund.mockResolvedValue({
        id: "rfnd_ABC",
        payment_id: "pay_ABC123",
        amount: 25000,
        status: "processed",
      });

      const handler = mockServer.getHandler("razorpay_create_refund");
      const result = await handler({
        payment_id: "pay_ABC123",
        amount: 25000,
      });

      expect(mockClient.createRefund).toHaveBeenCalledWith("pay_ABC123", {
        amount: 25000,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("rfnd_ABC");
    });

    it("should support full refund (no amount specified)", async () => {
      mockClient.createRefund.mockResolvedValue({
        id: "rfnd_DEF",
        payment_id: "pay_XYZ",
        status: "processed",
      });

      const handler = mockServer.getHandler("razorpay_create_refund");
      await handler({ payment_id: "pay_XYZ" });

      expect(mockClient.createRefund).toHaveBeenCalledWith("pay_XYZ", {});
    });
  });

  describe("razorpay_list_refunds", () => {
    it("should list refunds with pagination", async () => {
      mockClient.listRefunds.mockResolvedValue({
        entity: "collection",
        count: 1,
        items: [
          { id: "rfnd_A", amount: 10000, status: "processed" },
        ],
      });

      const handler = mockServer.getHandler("razorpay_list_refunds");
      const result = await handler({ count: 5, skip: 0 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(1);
    });
  });
});

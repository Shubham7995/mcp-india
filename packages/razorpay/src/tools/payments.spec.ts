/**
 * BDD spec: Razorpay payment tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   razorpay_list_payments, razorpay_fetch_payment, razorpay_capture_payment,
 *   razorpay_create_refund, razorpay_list_refunds
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RazorpayClient } from "../client.js";
import { registerPaymentTools } from "./payments.js";

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

describe("razorpay payment tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerPaymentTools(mockServer as any, mockClient as any);
  });

  // ── razorpay_list_payments ───────────────────────────────────

  describe("razorpay_list_payments", () => {
    it("should return captured payments given a valid date range", async () => {
      // Given: Razorpay API has two payments in the date range
      mockClient.listPayments.mockResolvedValue({
        entity: "collection",
        count: 2,
        items: [
          { id: "pay_1", amount: 50000, currency: "INR", status: "captured" },
          { id: "pay_2", amount: 20000, currency: "INR", status: "captured" },
        ],
      });

      // When: the tool is invoked with from/to ISO date strings
      const handler = mockServer.getHandler("razorpay_list_payments");
      const result = await handler({ from: "2026-03-01", to: "2026-03-28" });

      // Then: response contains payment items with status, amount, currency
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.count).toBe(2);
      expect(parsed.items[0].status).toBe("captured");
      expect(parsed.items[0].currency).toBe("INR");
      expect(parsed.items[1].amount).toBe(20000);
    });

    it("should pass date strings to the client as unix timestamps given ISO from/to inputs", async () => {
      // Given: any payments response (content does not matter for this assertion)
      mockClient.listPayments.mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });

      // When: the tool is invoked with ISO date strings
      const handler = mockServer.getHandler("razorpay_list_payments");
      await handler({ from: "2026-03-01", to: "2026-03-28", count: 5 });

      // Then: client.listPayments receives numeric unix timestamps, not strings
      const callArgs = mockClient.listPayments.mock.calls[0][0];
      expect(callArgs.from).toBeTypeOf("number");
      expect(callArgs.to).toBeTypeOf("number");
      expect(callArgs.count).toBe(5);
    });

    it("should return an error response given a failing API call", async () => {
      // Given: the Razorpay API is unavailable
      mockClient.listPayments.mockRejectedValue(new Error("Service unavailable"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_list_payments");
      const result = await handler({ count: 10 });

      // Then: the response signals an error with the original message
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Service unavailable");
    });
  });

  // ── razorpay_fetch_payment ───────────────────────────────────

  describe("razorpay_fetch_payment", () => {
    it("should return full payment detail given a known payment ID", async () => {
      // Given: the payment exists in Razorpay
      mockClient.fetchPayment.mockResolvedValue({
        id: "pay_ABC123",
        amount: 75000,
        currency: "INR",
        status: "captured",
        method: "card",
      });

      // When: the tool is invoked with that payment_id
      const handler = mockServer.getHandler("razorpay_fetch_payment");
      const result = await handler({ payment_id: "pay_ABC123" });

      // Then: client is called with the ID and parsed result has correct fields
      expect(mockClient.fetchPayment).toHaveBeenCalledWith("pay_ABC123");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("pay_ABC123");
      expect(parsed.status).toBe("captured");
      expect(parsed.method).toBe("card");
    });

    it("should return an error response given an unknown payment ID", async () => {
      // Given: Razorpay returns a 404-style error for the ID
      mockClient.fetchPayment.mockRejectedValue(
        new Error("The id provided does not exist"),
      );

      // When: the tool is invoked with the non-existent ID
      const handler = mockServer.getHandler("razorpay_fetch_payment");
      const result = await handler({ payment_id: "pay_INVALID" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("does not exist");
    });
  });

  // ── razorpay_capture_payment ─────────────────────────────────

  describe("razorpay_capture_payment", () => {
    it("should capture an authorized payment given a valid payment ID and amount", async () => {
      // Given: the payment is in authorized state
      mockClient.capturePayment.mockResolvedValue({
        id: "pay_AUTH01",
        amount: 50000,
        currency: "INR",
        status: "captured",
      });

      // When: the tool is invoked with payment_id, amount, and currency
      const handler = mockServer.getHandler("razorpay_capture_payment");
      const result = await handler({
        payment_id: "pay_AUTH01",
        amount: 50000,
        currency: "INR",
      });

      // Then: capturePayment is called with correct positional args and status is captured
      expect(mockClient.capturePayment).toHaveBeenCalledWith(
        "pay_AUTH01",
        50000,
        "INR",
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe("captured");
      expect(parsed.amount).toBe(50000);
    });

    it("should return an error response given an already-captured payment", async () => {
      // Given: the payment has already been captured
      mockClient.capturePayment.mockRejectedValue(
        new Error("Payment is already captured"),
      );

      // When: capture is attempted again
      const handler = mockServer.getHandler("razorpay_capture_payment");
      const result = await handler({
        payment_id: "pay_AUTH01",
        amount: 50000,
        currency: "INR",
      });

      // Then: the response signals an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("already captured");
    });
  });

  // ── razorpay_create_refund ───────────────────────────────────

  describe("razorpay_create_refund", () => {
    it("should create a partial refund given a payment ID and amount", async () => {
      // Given: the payment exists and a partial refund is requested
      mockClient.createRefund.mockResolvedValue({
        id: "rfnd_PART01",
        payment_id: "pay_ABC123",
        amount: 25000,
        status: "processed",
      });

      // When: the tool is invoked with payment_id and partial amount
      const handler = mockServer.getHandler("razorpay_create_refund");
      const result = await handler({
        payment_id: "pay_ABC123",
        amount: 25000,
      });

      // Then: createRefund is called with the id and amount body, and the refund id is returned
      expect(mockClient.createRefund).toHaveBeenCalledWith("pay_ABC123", {
        amount: 25000,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("rfnd_PART01");
      expect(parsed.status).toBe("processed");
    });

    it("should create a full refund given no amount is specified", async () => {
      // Given: no amount is passed (full refund intent)
      mockClient.createRefund.mockResolvedValue({
        id: "rfnd_FULL01",
        payment_id: "pay_XYZ",
        amount: 50000,
        status: "processed",
      });

      // When: the tool is invoked with only payment_id
      const handler = mockServer.getHandler("razorpay_create_refund");
      await handler({ payment_id: "pay_XYZ" });

      // Then: createRefund is called with an empty body (full refund)
      expect(mockClient.createRefund).toHaveBeenCalledWith("pay_XYZ", {});
    });
  });

  // ── razorpay_list_refunds ────────────────────────────────────

  describe("razorpay_list_refunds", () => {
    it("should return a list of refunds given a valid pagination request", async () => {
      // Given: the account has two processed refunds
      mockClient.listRefunds.mockResolvedValue({
        entity: "collection",
        count: 2,
        items: [
          { id: "rfnd_A", amount: 10000, status: "processed" },
          { id: "rfnd_B", amount: 5000, status: "processed" },
        ],
      });

      // When: the tool is invoked with count and skip
      const handler = mockServer.getHandler("razorpay_list_refunds");
      const result = await handler({ count: 10, skip: 0 });

      // Then: parsed collection has correct item count and statuses
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].id).toBe("rfnd_A");
      expect(parsed.items[1].status).toBe("processed");
    });

    it("should return an error response given an API failure", async () => {
      // Given: the refunds endpoint is throwing
      mockClient.listRefunds.mockRejectedValue(new Error("Rate limit exceeded"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_list_refunds");
      const result = await handler({ count: 10 });

      // Then: isError is true and message is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit exceeded");
    });
  });
});

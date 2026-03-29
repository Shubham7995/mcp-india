/**
 * BDD spec: Stripe payment tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   stripe_list_payments, stripe_get_payment, stripe_create_payment,
 *   stripe_capture_payment, stripe_create_refund, stripe_list_refunds
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StripeClient } from "../client.js";
import { registerPaymentTools } from "./payments.js";

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

describe("stripe payment tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerPaymentTools(mockServer as any, mockClient as any);
  });

  // ── stripe_list_payments ────────────────────────────────────

  describe("stripe_list_payments", () => {
    it("should return payments given a valid date range", async () => {
      // Given: Stripe API has two PaymentIntents in the date range
      mockClient.listPayments.mockResolvedValue({
        data: [
          { id: "pi_1", amount: 5000, currency: "usd", status: "succeeded" },
          { id: "pi_2", amount: 2000, currency: "usd", status: "succeeded" },
        ],
        has_more: false,
      });

      // When: the tool is invoked with from/to ISO date strings
      const handler = mockServer.getHandler("stripe_list_payments");
      const result = await handler({ from: "2026-03-01", to: "2026-03-28" });

      // Then: response contains payment items with status, amount, currency
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].status).toBe("succeeded");
      expect(parsed.data[0].currency).toBe("usd");
      expect(parsed.data[1].amount).toBe(2000);
    });

    it("should convert ISO dates to unix timestamps for the client", async () => {
      // Given: any payments response
      mockClient.listPayments.mockResolvedValue({ data: [], has_more: false });

      // When: the tool is invoked with ISO date strings
      const handler = mockServer.getHandler("stripe_list_payments");
      await handler({ from: "2026-03-01", to: "2026-03-28", limit: 5 });

      // Then: client receives numeric unix timestamps, not strings
      const callArgs = mockClient.listPayments.mock.calls[0][0];
      expect(callArgs.created_gte).toBeTypeOf("number");
      expect(callArgs.created_lte).toBeTypeOf("number");
      expect(callArgs.limit).toBe(5);
    });

    it("should return an error response given a failing API call", async () => {
      // Given: the Stripe API is unavailable
      mockClient.listPayments.mockRejectedValue(new Error("Service unavailable"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_list_payments");
      const result = await handler({ limit: 10 });

      // Then: the response signals an error with the original message
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Service unavailable");
    });
  });

  // ── stripe_get_payment ──────────────────────────────────────

  describe("stripe_get_payment", () => {
    it("should return full payment detail given a known payment ID", async () => {
      // Given: the PaymentIntent exists in Stripe
      mockClient.getPayment.mockResolvedValue({
        id: "pi_ABC123",
        amount: 7500,
        currency: "usd",
        status: "succeeded",
      });

      // When: the tool is invoked with that payment_intent_id
      const handler = mockServer.getHandler("stripe_get_payment");
      const result = await handler({ payment_intent_id: "pi_ABC123" });

      // Then: client is called with the ID and parsed result has correct fields
      expect(mockClient.getPayment).toHaveBeenCalledWith("pi_ABC123");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("pi_ABC123");
      expect(parsed.status).toBe("succeeded");
    });

    it("should return an error response given an unknown payment ID", async () => {
      // Given: Stripe returns an error for the ID
      mockClient.getPayment.mockRejectedValue(
        new Error("No such payment_intent: pi_INVALID"),
      );

      // When: the tool is invoked with the non-existent ID
      const handler = mockServer.getHandler("stripe_get_payment");
      const result = await handler({ payment_intent_id: "pi_INVALID" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("pi_INVALID");
    });
  });

  // ── stripe_create_payment ───────────────────────────────────

  describe("stripe_create_payment", () => {
    it("should create a PaymentIntent given amount and currency", async () => {
      // Given: Stripe will accept the creation
      mockClient.createPayment.mockResolvedValue({
        id: "pi_NEW01",
        amount: 5000,
        currency: "usd",
        status: "requires_payment_method",
      });

      // When: the tool is invoked with amount and currency
      const handler = mockServer.getHandler("stripe_create_payment");
      const result = await handler({ amount: 5000, currency: "usd" });

      // Then: the PaymentIntent is created with correct params
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("pi_NEW01");
      expect(parsed.amount).toBe(5000);
    });
  });

  // ── stripe_capture_payment ──────────────────────────────────

  describe("stripe_capture_payment", () => {
    it("should capture an authorized PaymentIntent given a valid ID", async () => {
      // Given: the PaymentIntent is in requires_capture state
      mockClient.capturePayment.mockResolvedValue({
        id: "pi_AUTH01",
        amount: 5000,
        status: "succeeded",
      });

      // When: the tool is invoked with the payment_intent_id
      const handler = mockServer.getHandler("stripe_capture_payment");
      const result = await handler({ payment_intent_id: "pi_AUTH01" });

      // Then: capturePayment is called and status is succeeded
      expect(mockClient.capturePayment).toHaveBeenCalledWith("pi_AUTH01");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe("succeeded");
    });

    it("should return an error given an already-captured payment", async () => {
      // Given: the PaymentIntent has already been captured
      mockClient.capturePayment.mockRejectedValue(
        new Error("Payment is already captured"),
      );

      // When: capture is attempted again
      const handler = mockServer.getHandler("stripe_capture_payment");
      const result = await handler({ payment_intent_id: "pi_AUTH01" });

      // Then: the response signals an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("already captured");
    });
  });

  // ── stripe_create_refund ────────────────────────────────────

  describe("stripe_create_refund", () => {
    it("should create a partial refund given a payment ID and amount", async () => {
      // Given: a partial refund is requested
      mockClient.createRefund.mockResolvedValue({
        id: "re_PART01",
        amount: 2500,
        status: "succeeded",
      });

      // When: the tool is invoked with payment_intent_id and partial amount
      const handler = mockServer.getHandler("stripe_create_refund");
      const result = await handler({
        payment_intent_id: "pi_ABC",
        amount: 2500,
      });

      // Then: createRefund is called with correct args
      expect(mockClient.createRefund).toHaveBeenCalledWith({
        payment_intent: "pi_ABC",
        amount: 2500,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("re_PART01");
    });

    it("should create a full refund given no amount specified", async () => {
      // Given: no amount is passed (full refund intent)
      mockClient.createRefund.mockResolvedValue({
        id: "re_FULL01",
        status: "succeeded",
      });

      // When: the tool is invoked with only payment_intent_id
      const handler = mockServer.getHandler("stripe_create_refund");
      await handler({ payment_intent_id: "pi_XYZ" });

      // Then: createRefund is called without amount
      expect(mockClient.createRefund).toHaveBeenCalledWith({
        payment_intent: "pi_XYZ",
      });
    });
  });

  // ── stripe_list_refunds ─────────────────────────────────────

  describe("stripe_list_refunds", () => {
    it("should return a list of refunds given a valid pagination request", async () => {
      // Given: the account has refunds
      mockClient.listRefunds.mockResolvedValue({
        data: [
          { id: "re_A", amount: 1000, status: "succeeded" },
          { id: "re_B", amount: 500, status: "succeeded" },
        ],
        has_more: false,
      });

      // When: the tool is invoked with limit
      const handler = mockServer.getHandler("stripe_list_refunds");
      const result = await handler({ limit: 10 });

      // Then: parsed list has correct item count
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].id).toBe("re_A");
    });

    it("should return an error response given an API failure", async () => {
      // Given: the refunds endpoint is throwing
      mockClient.listRefunds.mockRejectedValue(new Error("Rate limit exceeded"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_list_refunds");
      const result = await handler({ limit: 10 });

      // Then: isError is true and message is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit exceeded");
    });
  });
});

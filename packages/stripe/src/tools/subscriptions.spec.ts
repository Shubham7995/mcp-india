/**
 * BDD spec: Stripe subscription & invoice tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   stripe_list_subscriptions, stripe_get_subscription,
 *   stripe_create_subscription, stripe_cancel_subscription,
 *   stripe_list_invoices, stripe_get_invoice
 */

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

describe("stripe subscription & invoice tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerSubscriptionTools(mockServer as any, mockClient as any);
  });

  // ── stripe_list_subscriptions ───────────────────────────────

  describe("stripe_list_subscriptions", () => {
    it("should return active subscriptions given a status filter", async () => {
      // Given: the account has active subscriptions
      mockClient.listSubscriptions.mockResolvedValue({
        data: [
          { id: "sub_1", status: "active", customer: "cus_1" },
          { id: "sub_2", status: "active", customer: "cus_2" },
        ],
        has_more: false,
      });

      // When: the tool is invoked with status filter
      const handler = mockServer.getHandler("stripe_list_subscriptions");
      const result = await handler({ status: "active" });

      // Then: response contains active subscriptions
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].status).toBe("active");
    });
  });

  // ── stripe_get_subscription ─────────────────────────────────

  describe("stripe_get_subscription", () => {
    it("should return subscription details given a known ID", async () => {
      // Given: the subscription exists
      mockClient.getSubscription.mockResolvedValue({
        id: "sub_KNOWN",
        status: "trialing",
        trial_end: 1740000000,
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_get_subscription");
      const result = await handler({ subscription_id: "sub_KNOWN" });

      // Then: parsed result has all fields
      expect(mockClient.getSubscription).toHaveBeenCalledWith("sub_KNOWN");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe("trialing");
    });

    it("should return an error given an unknown subscription ID", async () => {
      // Given: the subscription does not exist
      mockClient.getSubscription.mockRejectedValue(
        new Error("No such subscription: sub_GONE"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_get_subscription");
      const result = await handler({ subscription_id: "sub_GONE" });

      // Then: error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("sub_GONE");
    });
  });

  // ── stripe_create_subscription ──────────────────────────────

  describe("stripe_create_subscription", () => {
    it("should create a subscription given a customer and price", async () => {
      // Given: the customer and price exist
      mockClient.createSubscription.mockResolvedValue({
        id: "sub_CREATED",
        status: "active",
        customer: "cus_ABC",
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_create_subscription");
      const result = await handler({
        customer_id: "cus_ABC",
        price_id: "price_PRO",
      });

      // Then: subscription is created with correct params
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("sub_CREATED");
      expect(parsed.status).toBe("active");
    });

    it("should include trial days when specified", async () => {
      // Given: a trial is requested
      mockClient.createSubscription.mockResolvedValue({
        id: "sub_TRIAL",
        status: "trialing",
      });

      // When: trial_period_days is provided
      const handler = mockServer.getHandler("stripe_create_subscription");
      await handler({
        customer_id: "cus_ABC",
        price_id: "price_PRO",
        trial_period_days: 30,
      });

      // Then: createSubscription receives trial days
      expect(mockClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ trial_period_days: 30 }),
      );
    });
  });

  // ── stripe_cancel_subscription ──────────────────────────────

  describe("stripe_cancel_subscription", () => {
    it("should cancel at period end given cancel_at_period_end is true", async () => {
      // Given: the subscription is active
      mockClient.cancelSubscription.mockResolvedValue({
        id: "sub_ENDPERIOD",
        cancel_at_period_end: true,
        status: "active",
      });

      // When: cancel_at_period_end is true
      const handler = mockServer.getHandler("stripe_cancel_subscription");
      const result = await handler({
        subscription_id: "sub_ENDPERIOD",
        cancel_at_period_end: true,
      });

      // Then: cancelSubscription is called with true flag
      expect(mockClient.cancelSubscription).toHaveBeenCalledWith(
        "sub_ENDPERIOD",
        true,
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.cancel_at_period_end).toBe(true);
    });

    it("should cancel immediately given cancel_at_period_end is false", async () => {
      // Given: immediate cancellation is requested
      mockClient.cancelSubscription.mockResolvedValue({
        id: "sub_IMMEDIATE",
        status: "canceled",
      });

      // When: cancel_at_period_end is false
      const handler = mockServer.getHandler("stripe_cancel_subscription");
      const result = await handler({
        subscription_id: "sub_IMMEDIATE",
        cancel_at_period_end: false,
      });

      // Then: subscription is immediately canceled
      expect(mockClient.cancelSubscription).toHaveBeenCalledWith(
        "sub_IMMEDIATE",
        false,
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe("canceled");
    });
  });

  // ── stripe_list_invoices ────────────────────────────────────

  describe("stripe_list_invoices", () => {
    it("should return invoices given a customer and status filter", async () => {
      // Given: the customer has paid invoices
      mockClient.listInvoices.mockResolvedValue({
        data: [{ id: "in_1", status: "paid", amount_due: 5000 }],
        has_more: false,
      });

      // When: the tool is invoked with filters
      const handler = mockServer.getHandler("stripe_list_invoices");
      const result = await handler({
        customer_id: "cus_ABC",
        status: "paid",
      });

      // Then: response contains matching invoices
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].status).toBe("paid");
    });
  });

  // ── stripe_get_invoice ──────────────────────────────────────

  describe("stripe_get_invoice", () => {
    it("should return invoice details given a known ID", async () => {
      // Given: the invoice exists
      mockClient.getInvoice.mockResolvedValue({
        id: "in_KNOWN",
        status: "open",
        amount_due: 7500,
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_get_invoice");
      const result = await handler({ invoice_id: "in_KNOWN" });

      // Then: the invoice details are returned
      expect(mockClient.getInvoice).toHaveBeenCalledWith("in_KNOWN");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.amount_due).toBe(7500);
    });
  });
});

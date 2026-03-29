/**
 * BDD spec: Stripe customer tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   stripe_list_customers, stripe_get_customer,
 *   stripe_create_customer, stripe_search_customers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StripeClient } from "../client.js";
import { registerCustomerTools } from "./customers.js";

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

describe("stripe customer tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerCustomerTools(mockServer as any, mockClient as any);
  });

  // ── stripe_list_customers ───────────────────────────────────

  describe("stripe_list_customers", () => {
    it("should return customers given an email filter", async () => {
      // Given: Stripe has a customer matching the email
      mockClient.listCustomers.mockResolvedValue({
        data: [{ id: "cus_1", email: "alice@test.com", name: "Alice" }],
        has_more: false,
      });

      // When: the tool is invoked with an email filter
      const handler = mockServer.getHandler("stripe_list_customers");
      const result = await handler({ email: "alice@test.com" });

      // Then: response contains the matching customer
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].email).toBe("alice@test.com");
    });

    it("should convert ISO date filters to unix timestamps", async () => {
      // Given: any customer response
      mockClient.listCustomers.mockResolvedValue({ data: [], has_more: false });

      // When: the tool is invoked with ISO date range
      const handler = mockServer.getHandler("stripe_list_customers");
      await handler({ from: "2026-01-01", to: "2026-12-31" });

      // Then: client receives numeric timestamps
      const callArgs = mockClient.listCustomers.mock.calls[0][0];
      expect(callArgs.created_gte).toBeTypeOf("number");
      expect(callArgs.created_lte).toBeTypeOf("number");
    });
  });

  // ── stripe_get_customer ─────────────────────────────────────

  describe("stripe_get_customer", () => {
    it("should return customer detail given a known ID", async () => {
      // Given: the customer exists
      mockClient.getCustomer.mockResolvedValue({
        id: "cus_DETAIL",
        email: "detail@test.com",
        name: "Detailed Customer",
      });

      // When: the tool is invoked with that customer_id
      const handler = mockServer.getHandler("stripe_get_customer");
      const result = await handler({ customer_id: "cus_DETAIL" });

      // Then: parsed result has all fields
      expect(mockClient.getCustomer).toHaveBeenCalledWith("cus_DETAIL");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe("Detailed Customer");
    });

    it("should return an error given an unknown customer ID", async () => {
      // Given: the customer does not exist
      mockClient.getCustomer.mockRejectedValue(
        new Error("No such customer: cus_GONE"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_get_customer");
      const result = await handler({ customer_id: "cus_GONE" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("cus_GONE");
    });
  });

  // ── stripe_create_customer ──────────────────────────────────

  describe("stripe_create_customer", () => {
    it("should create a customer given email and name", async () => {
      // Given: Stripe will accept the creation
      mockClient.createCustomer.mockResolvedValue({
        id: "cus_CREATED",
        email: "new@test.com",
        name: "New Customer",
      });

      // When: the tool is invoked with email and name
      const handler = mockServer.getHandler("stripe_create_customer");
      const result = await handler({ email: "new@test.com", name: "New Customer" });

      // Then: the customer is created
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("cus_CREATED");
      expect(parsed.email).toBe("new@test.com");
    });
  });

  // ── stripe_search_customers ─────────────────────────────────

  describe("stripe_search_customers", () => {
    it("should return matching customers given a search query", async () => {
      // Given: a customer matches the query
      mockClient.searchCustomers.mockResolvedValue({
        data: [{ id: "cus_MATCH", email: "match@acme.com" }],
        has_more: false,
      });

      // When: the tool is invoked with a Stripe search query
      const handler = mockServer.getHandler("stripe_search_customers");
      const result = await handler({ query: "email:'match@acme.com'" });

      // Then: matching customer is returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].id).toBe("cus_MATCH");
    });

    it("should return an error response given an invalid query", async () => {
      // Given: the query syntax is invalid
      mockClient.searchCustomers.mockRejectedValue(
        new Error("Invalid search query syntax"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("stripe_search_customers");
      const result = await handler({ query: "bad[query" });

      // Then: error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid search query");
    });
  });
});

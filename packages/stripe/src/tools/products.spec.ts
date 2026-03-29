/**
 * BDD spec: Stripe product & price tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   stripe_list_products, stripe_create_product,
 *   stripe_list_prices, stripe_create_price
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StripeClient } from "../client.js";
import { registerProductTools } from "./products.js";

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

describe("stripe product & price tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerProductTools(mockServer as any, mockClient as any);
  });

  // ── stripe_list_products ────────────────────────────────────

  describe("stripe_list_products", () => {
    it("should return active products given an active filter", async () => {
      // Given: Stripe has active products
      mockClient.listProducts.mockResolvedValue({
        data: [
          { id: "prod_1", name: "Pro Plan", active: true },
          { id: "prod_2", name: "Enterprise", active: true },
        ],
        has_more: false,
      });

      // When: the tool is invoked with active filter
      const handler = mockServer.getHandler("stripe_list_products");
      const result = await handler({ active: true });

      // Then: response contains active products
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].active).toBe(true);
    });
  });

  // ── stripe_create_product ───────────────────────────────────

  describe("stripe_create_product", () => {
    it("should create a product given name and description", async () => {
      // Given: Stripe will accept the creation
      mockClient.createProduct.mockResolvedValue({
        id: "prod_CREATED",
        name: "Premium SaaS",
        description: "All features included",
      });

      // When: the tool is invoked with name and description
      const handler = mockServer.getHandler("stripe_create_product");
      const result = await handler({
        name: "Premium SaaS",
        description: "All features included",
      });

      // Then: product is created with correct fields
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("prod_CREATED");
      expect(parsed.name).toBe("Premium SaaS");
    });

    it("should include metadata when provided", async () => {
      // Given: metadata is passed
      mockClient.createProduct.mockResolvedValue({ id: "prod_META" });

      // When: the tool is invoked with metadata
      const handler = mockServer.getHandler("stripe_create_product");
      await handler({
        name: "Product",
        metadata: { tier: "premium" },
      });

      // Then: metadata is passed to client
      expect(mockClient.createProduct).toHaveBeenCalledWith({
        name: "Product",
        metadata: { tier: "premium" },
      });
    });
  });

  // ── stripe_list_prices ──────────────────────────────────────

  describe("stripe_list_prices", () => {
    it("should return prices for a specific product given product_id filter", async () => {
      // Given: the product has prices
      mockClient.listPrices.mockResolvedValue({
        data: [
          { id: "price_1", unit_amount: 2000, currency: "usd" },
          { id: "price_2", unit_amount: 5000, currency: "usd" },
        ],
        has_more: false,
      });

      // When: the tool is invoked with product_id
      const handler = mockServer.getHandler("stripe_list_prices");
      const result = await handler({ product_id: "prod_1" });

      // Then: prices for that product are returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].unit_amount).toBe(2000);
    });
  });

  // ── stripe_create_price ─────────────────────────────────────

  describe("stripe_create_price", () => {
    it("should create a one-time price given amount and product", async () => {
      // Given: Stripe will accept a one-time price
      mockClient.createPrice.mockResolvedValue({
        id: "price_ONCE",
        unit_amount: 1500,
        currency: "usd",
        type: "one_time",
      });

      // When: the tool is invoked without recurring interval
      const handler = mockServer.getHandler("stripe_create_price");
      const result = await handler({
        unit_amount: 1500,
        currency: "usd",
        product_id: "prod_A",
      });

      // Then: a one-time price is created
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.type).toBe("one_time");
      expect(parsed.unit_amount).toBe(1500);
    });

    it("should create a monthly recurring price given a recurring_interval", async () => {
      // Given: a recurring price is requested
      mockClient.createPrice.mockResolvedValue({
        id: "price_MONTHLY",
        unit_amount: 2000,
        recurring: { interval: "month", interval_count: 1 },
      });

      // When: the tool is invoked with recurring_interval = month
      const handler = mockServer.getHandler("stripe_create_price");
      const result = await handler({
        unit_amount: 2000,
        currency: "usd",
        product_id: "prod_A",
        recurring_interval: "month",
      });

      // Then: a monthly price is created
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.recurring.interval).toBe("month");
    });
  });
});

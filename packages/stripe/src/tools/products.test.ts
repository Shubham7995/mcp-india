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

describe("Product & Price Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerProductTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 4 product and price tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("stripe_list_products");
      expect(tools).toContain("stripe_create_product");
      expect(tools).toContain("stripe_list_prices");
      expect(tools).toContain("stripe_create_price");
      expect(tools).toHaveLength(4);
    });
  });

  describe("stripe_list_products", () => {
    it("should return products as JSON", async () => {
      mockClient.listProducts.mockResolvedValue({
        data: [
          { id: "prod_A", name: "Pro Plan", active: true },
          { id: "prod_B", name: "T-Shirt", active: true },
        ],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_list_products");
      const result = await handler({ limit: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].name).toBe("Pro Plan");
    });

    it("should pass active filter to client", async () => {
      mockClient.listProducts.mockResolvedValue({ data: [], has_more: false });

      const handler = mockServer.getHandler("stripe_list_products");
      await handler({ active: true });

      expect(mockClient.listProducts).toHaveBeenCalledWith(
        expect.objectContaining({ active: true }),
      );
    });

    it("should return error response on failure", async () => {
      mockClient.listProducts.mockRejectedValue(new Error("API error"));

      const handler = mockServer.getHandler("stripe_list_products");
      const result = await handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe("stripe_create_product", () => {
    it("should create a product with name and description", async () => {
      mockClient.createProduct.mockResolvedValue({
        id: "prod_NEW",
        name: "Enterprise Plan",
        description: "Full features",
      });

      const handler = mockServer.getHandler("stripe_create_product");
      const result = await handler({
        name: "Enterprise Plan",
        description: "Full features",
      });

      expect(mockClient.createProduct).toHaveBeenCalledWith({
        name: "Enterprise Plan",
        description: "Full features",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("prod_NEW");
    });

    it("should create a product with just a name", async () => {
      mockClient.createProduct.mockResolvedValue({
        id: "prod_BARE",
        name: "Basic",
      });

      const handler = mockServer.getHandler("stripe_create_product");
      await handler({ name: "Basic" });

      expect(mockClient.createProduct).toHaveBeenCalledWith({ name: "Basic" });
    });
  });

  describe("stripe_list_prices", () => {
    it("should return prices filtered by product", async () => {
      mockClient.listPrices.mockResolvedValue({
        data: [
          { id: "price_A", unit_amount: 2000, currency: "usd" },
        ],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_list_prices");
      const result = await handler({ product_id: "prod_A" });

      expect(mockClient.listPrices).toHaveBeenCalledWith(
        expect.objectContaining({ product: "prod_A" }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].unit_amount).toBe(2000);
    });
  });

  describe("stripe_create_price", () => {
    it("should create a one-time price", async () => {
      mockClient.createPrice.mockResolvedValue({
        id: "price_NEW",
        unit_amount: 2000,
        currency: "usd",
        type: "one_time",
      });

      const handler = mockServer.getHandler("stripe_create_price");
      const result = await handler({
        unit_amount: 2000,
        currency: "usd",
        product_id: "prod_A",
      });

      expect(mockClient.createPrice).toHaveBeenCalledWith({
        unit_amount: 2000,
        currency: "usd",
        product: "prod_A",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("price_NEW");
    });

    it("should create a recurring price with interval", async () => {
      mockClient.createPrice.mockResolvedValue({
        id: "price_REC",
        unit_amount: 2000,
        recurring: { interval: "month" },
      });

      const handler = mockServer.getHandler("stripe_create_price");
      await handler({
        unit_amount: 2000,
        currency: "usd",
        product_id: "prod_A",
        recurring_interval: "month",
        recurring_interval_count: 1,
      });

      expect(mockClient.createPrice).toHaveBeenCalledWith({
        unit_amount: 2000,
        currency: "usd",
        product: "prod_A",
        recurring_interval: "month",
        recurring_interval_count: 1,
      });
    });

    it("should return error on failure", async () => {
      mockClient.createPrice.mockRejectedValue(
        new Error("Invalid product"),
      );

      const handler = mockServer.getHandler("stripe_create_price");
      const result = await handler({
        unit_amount: 100,
        product_id: "prod_INVALID",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid product");
    });
  });
});

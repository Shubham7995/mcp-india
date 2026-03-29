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

describe("Customer Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerCustomerTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 4 customer tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("stripe_list_customers");
      expect(tools).toContain("stripe_get_customer");
      expect(tools).toContain("stripe_create_customer");
      expect(tools).toContain("stripe_search_customers");
      expect(tools).toHaveLength(4);
    });
  });

  describe("stripe_list_customers", () => {
    it("should return customers as JSON text content", async () => {
      mockClient.listCustomers.mockResolvedValue({
        data: [
          { id: "cus_A", email: "a@test.com", name: "Alice" },
          { id: "cus_B", email: "b@test.com", name: "Bob" },
        ],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_list_customers");
      const result = await handler({ limit: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].email).toBe("a@test.com");
    });

    it("should pass date filters as unix timestamps", async () => {
      mockClient.listCustomers.mockResolvedValue({ data: [], has_more: false });

      const handler = mockServer.getHandler("stripe_list_customers");
      await handler({ from: "2026-03-01", to: "2026-03-28" });

      const callArgs = mockClient.listCustomers.mock.calls[0][0];
      expect(callArgs.created_gte).toBeTypeOf("number");
      expect(callArgs.created_lte).toBeTypeOf("number");
    });

    it("should return error response on failure", async () => {
      mockClient.listCustomers.mockRejectedValue(new Error("Unauthorized"));

      const handler = mockServer.getHandler("stripe_list_customers");
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });

  describe("stripe_get_customer", () => {
    it("should fetch a single customer by ID", async () => {
      mockClient.getCustomer.mockResolvedValue({
        id: "cus_ABC",
        email: "test@example.com",
        name: "Test User",
      });

      const handler = mockServer.getHandler("stripe_get_customer");
      const result = await handler({ customer_id: "cus_ABC" });

      expect(mockClient.getCustomer).toHaveBeenCalledWith("cus_ABC");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("cus_ABC");
    });
  });

  describe("stripe_create_customer", () => {
    it("should create a customer with email and name", async () => {
      mockClient.createCustomer.mockResolvedValue({
        id: "cus_NEW",
        email: "new@test.com",
        name: "New User",
      });

      const handler = mockServer.getHandler("stripe_create_customer");
      const result = await handler({ email: "new@test.com", name: "New User" });

      expect(mockClient.createCustomer).toHaveBeenCalledWith({
        email: "new@test.com",
        name: "New User",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("cus_NEW");
    });

    it("should handle optional fields gracefully", async () => {
      mockClient.createCustomer.mockResolvedValue({ id: "cus_BARE" });

      const handler = mockServer.getHandler("stripe_create_customer");
      await handler({});

      expect(mockClient.createCustomer).toHaveBeenCalledWith({});
    });
  });

  describe("stripe_search_customers", () => {
    it("should search customers with query string", async () => {
      mockClient.searchCustomers.mockResolvedValue({
        data: [{ id: "cus_FOUND", email: "found@test.com" }],
        has_more: false,
      });

      const handler = mockServer.getHandler("stripe_search_customers");
      const result = await handler({
        query: "email:'found@test.com'",
        limit: 5,
      });

      expect(mockClient.searchCustomers).toHaveBeenCalledWith(
        "email:'found@test.com'",
        5,
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].id).toBe("cus_FOUND");
    });

    it("should return error response on failure", async () => {
      mockClient.searchCustomers.mockRejectedValue(new Error("Invalid query"));

      const handler = mockServer.getHandler("stripe_search_customers");
      const result = await handler({ query: "invalid" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid query");
    });
  });
});

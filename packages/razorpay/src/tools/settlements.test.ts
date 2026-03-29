import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RazorpayClient } from "../client.js";
import { registerSettlementTools } from "./settlements.js";

function createMockClient() {
  return {
    listSettlements: vi.fn(),
    fetchSettlement: vi.fn(),
    listSubscriptions: vi.fn(),
    createSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    createInvoice: vi.fn(),
    listInvoices: vi.fn(),
    listCustomers: vi.fn(),
    createCustomer: vi.fn(),
  } as unknown as RazorpayClient;
}

function createMockServer() {
  const tools = new Map<string, { handler: Function }>();
  return {
    tool: (name: string, _desc: string, _schema: unknown, handler: Function) => {
      tools.set(name, { handler });
    },
    getHandler: (name: string) => tools.get(name)!.handler,
    getRegisteredTools: () => Array.from(tools.keys()),
  };
}

describe("Settlement, Subscription, Invoice & Customer Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerSettlementTools(mockServer as any, mockClient);
  });

  describe("tool registration", () => {
    it("should register all 9 tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("razorpay_list_settlements");
      expect(tools).toContain("razorpay_fetch_settlement");
      expect(tools).toContain("razorpay_list_subscriptions");
      expect(tools).toContain("razorpay_create_subscription");
      expect(tools).toContain("razorpay_cancel_subscription");
      expect(tools).toContain("razorpay_create_invoice");
      expect(tools).toContain("razorpay_list_invoices");
      expect(tools).toContain("razorpay_list_customers");
      expect(tools).toContain("razorpay_create_customer");
      expect(tools).toHaveLength(9);
    });
  });

  describe("razorpay_list_settlements", () => {
    it("should list settlements with pagination", async () => {
      (mockClient.listSettlements as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 1,
        items: [{ id: "setl_A", amount: 450000, status: "processed" }],
      });

      const handler = mockServer.getHandler("razorpay_list_settlements");
      const result = await handler({ count: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items[0].id).toBe("setl_A");
    });
  });

  describe("razorpay_fetch_settlement", () => {
    it("should fetch a single settlement", async () => {
      (mockClient.fetchSettlement as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "setl_XYZ",
        amount: 100000,
        status: "processed",
      });

      const handler = mockServer.getHandler("razorpay_fetch_settlement");
      const result = await handler({ settlement_id: "setl_XYZ" });

      expect(mockClient.fetchSettlement).toHaveBeenCalledWith("setl_XYZ");
    });
  });

  describe("razorpay_create_subscription", () => {
    it("should create a subscription with plan_id and total_count", async () => {
      (mockClient.createSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sub_ABC",
        plan_id: "plan_123",
        status: "created",
      });

      const handler = mockServer.getHandler("razorpay_create_subscription");
      const result = await handler({
        plan_id: "plan_123",
        total_count: 12,
      });

      expect(mockClient.createSubscription).toHaveBeenCalledWith({
        plan_id: "plan_123",
        total_count: 12,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("sub_ABC");
    });
  });

  describe("razorpay_cancel_subscription", () => {
    it("should cancel a subscription", async () => {
      (mockClient.cancelSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sub_ABC",
        status: "cancelled",
      });

      const handler = mockServer.getHandler("razorpay_cancel_subscription");
      const result = await handler({
        subscription_id: "sub_ABC",
        cancel_at_cycle_end: true,
      });

      expect(mockClient.cancelSubscription).toHaveBeenCalledWith(
        "sub_ABC",
        true,
      );
    });
  });

  describe("razorpay_create_customer", () => {
    it("should create a customer with name, email, contact", async () => {
      (mockClient.createCustomer as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "cust_ABC",
        name: "Test User",
        email: "test@example.com",
        contact: "9876543210",
      });

      const handler = mockServer.getHandler("razorpay_create_customer");
      const result = await handler({
        name: "Test User",
        email: "test@example.com",
        contact: "9876543210",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe("Test User");
    });
  });

  describe("razorpay_create_invoice", () => {
    it("should create an invoice with line items", async () => {
      (mockClient.createInvoice as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "inv_ABC",
        status: "issued",
        amount: 100000,
      });

      const handler = mockServer.getHandler("razorpay_create_invoice");
      const result = await handler({
        customer_id: "cust_ABC",
        line_items: [
          { name: "Widget", amount: 100000, currency: "INR", quantity: 1 },
        ],
      });

      expect(mockClient.createInvoice).toHaveBeenCalledWith({
        type: "invoice",
        customer_id: "cust_ABC",
        line_items: [
          { name: "Widget", amount: 100000, currency: "INR", quantity: 1 },
        ],
      });
    });
  });
});

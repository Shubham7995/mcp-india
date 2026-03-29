/**
 * BDD spec: Razorpay settlement, subscription, invoice, and customer tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   razorpay_list_settlements, razorpay_fetch_settlement,
 *   razorpay_list_subscriptions, razorpay_create_subscription, razorpay_cancel_subscription,
 *   razorpay_create_invoice, razorpay_list_invoices,
 *   razorpay_list_customers, razorpay_create_customer
 */

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

describe("razorpay settlement/subscription/invoice/customer tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerSettlementTools(mockServer as any, mockClient);
  });

  // ── razorpay_list_settlements ────────────────────────────────

  describe("razorpay_list_settlements", () => {
    it("should return settlements with id and status given a date range", async () => {
      // Given: two settlements were processed in the billing period
      (mockClient.listSettlements as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 2,
        items: [
          { id: "setl_AAA", amount: 450000, status: "processed", utr: "UTR001" },
          { id: "setl_BBB", amount: 120000, status: "processed", utr: "UTR002" },
        ],
      });

      // When: the tool is invoked with ISO date strings and pagination
      const handler = mockServer.getHandler("razorpay_list_settlements");
      const result = await handler({ from: "2026-03-01", to: "2026-03-28", count: 10 });

      // Then: client is called with numeric timestamps and items carry id/status
      const callArgs = (mockClient.listSettlements as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.from).toBeTypeOf("number");
      expect(callArgs.to).toBeTypeOf("number");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].id).toBe("setl_AAA");
      expect(parsed.items[1].status).toBe("processed");
    });

    it("should return an empty items array given no settlements in the window", async () => {
      // Given: the selected period has no settlements
      (mockClient.listSettlements as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });

      // When: the tool is invoked with count
      const handler = mockServer.getHandler("razorpay_list_settlements");
      const result = await handler({ count: 10 });

      // Then: parsed result has count 0 and empty items
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.count).toBe(0);
      expect(parsed.items).toHaveLength(0);
    });
  });

  // ── razorpay_fetch_settlement ────────────────────────────────

  describe("razorpay_fetch_settlement", () => {
    it("should return full settlement detail given a known settlement ID", async () => {
      // Given: the settlement exists with a processed status
      (mockClient.fetchSettlement as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "setl_XYZ",
        amount: 300000,
        status: "processed",
        utr: "UTR999",
      });

      // When: the tool is invoked with settlement_id
      const handler = mockServer.getHandler("razorpay_fetch_settlement");
      const result = await handler({ settlement_id: "setl_XYZ" });

      // Then: fetchSettlement is called with the id and all fields are present
      expect(mockClient.fetchSettlement).toHaveBeenCalledWith("setl_XYZ");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("setl_XYZ");
      expect(parsed.status).toBe("processed");
      expect(parsed.utr).toBe("UTR999");
    });

    it("should return an error response given an unknown settlement ID", async () => {
      // Given: no settlement with this id exists
      (mockClient.fetchSettlement as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Settlement not found"),
      );

      // When: the tool is invoked with the bad id
      const handler = mockServer.getHandler("razorpay_fetch_settlement");
      const result = await handler({ settlement_id: "setl_INVALID" });

      // Then: response is marked as error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Settlement not found");
    });
  });

  // ── razorpay_list_subscriptions ──────────────────────────────

  describe("razorpay_list_subscriptions", () => {
    it("should return active subscriptions with plan_id and status given pagination", async () => {
      // Given: two active subscriptions are on the account
      (mockClient.listSubscriptions as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 2,
        items: [
          { id: "sub_A", plan_id: "plan_001", status: "active" },
          { id: "sub_B", plan_id: "plan_002", status: "active" },
        ],
      });

      // When: the tool is invoked with count and skip
      const handler = mockServer.getHandler("razorpay_list_subscriptions");
      const result = await handler({ count: 10, skip: 0 });

      // Then: items carry plan_id and status fields
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].plan_id).toBe("plan_001");
      expect(parsed.items[1].status).toBe("active");
    });

    it("should return an error response given an API failure", async () => {
      // Given: the subscriptions endpoint is unavailable
      (mockClient.listSubscriptions as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Internal server error"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_list_subscriptions");
      const result = await handler({ count: 5 });

      // Then: isError is true
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Internal server error");
    });
  });

  // ── razorpay_create_subscription ────────────────────────────

  describe("razorpay_create_subscription", () => {
    it("should create a subscription given a plan_id and total_count", async () => {
      // Given: a valid monthly plan exists
      (mockClient.createSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sub_NEW01",
        plan_id: "plan_MONTHLY",
        total_count: 12,
        status: "created",
      });

      // When: the tool is invoked with plan_id and total_count
      const handler = mockServer.getHandler("razorpay_create_subscription");
      const result = await handler({
        plan_id: "plan_MONTHLY",
        total_count: 12,
      });

      // Then: createSubscription receives the correct payload and id is returned
      expect(mockClient.createSubscription).toHaveBeenCalledWith({
        plan_id: "plan_MONTHLY",
        total_count: 12,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("sub_NEW01");
      expect(parsed.status).toBe("created");
    });

    it("should include optional quantity in the payload given quantity is specified", async () => {
      // Given: a multi-seat plan requires quantity > 1
      (mockClient.createSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sub_MULTI",
        plan_id: "plan_SEAT",
        total_count: 6,
        quantity: 5,
        status: "created",
      });

      // When: the tool is invoked with quantity
      const handler = mockServer.getHandler("razorpay_create_subscription");
      await handler({ plan_id: "plan_SEAT", total_count: 6, quantity: 5 });

      // Then: createSubscription receives quantity in the body
      expect(mockClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 }),
      );
    });
  });

  // ── razorpay_cancel_subscription ────────────────────────────

  describe("razorpay_cancel_subscription", () => {
    it("should cancel a subscription at cycle end given cancel_at_cycle_end is true", async () => {
      // Given: the user wants a graceful cancellation
      (mockClient.cancelSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sub_ABC",
        status: "cancelled",
      });

      // When: the tool is invoked with cancel_at_cycle_end: true
      const handler = mockServer.getHandler("razorpay_cancel_subscription");
      const result = await handler({
        subscription_id: "sub_ABC",
        cancel_at_cycle_end: true,
      });

      // Then: cancelSubscription is called with (id, true) and status is cancelled
      expect(mockClient.cancelSubscription).toHaveBeenCalledWith("sub_ABC", true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe("cancelled");
    });

    it("should cancel a subscription immediately given cancel_at_cycle_end is false", async () => {
      // Given: the user wants an immediate cancellation
      (mockClient.cancelSubscription as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sub_DEF",
        status: "cancelled",
      });

      // When: the tool is invoked with cancel_at_cycle_end: false
      const handler = mockServer.getHandler("razorpay_cancel_subscription");
      await handler({ subscription_id: "sub_DEF", cancel_at_cycle_end: false });

      // Then: cancelSubscription is called with (id, false)
      expect(mockClient.cancelSubscription).toHaveBeenCalledWith("sub_DEF", false);
    });
  });

  // ── razorpay_create_invoice ──────────────────────────────────

  describe("razorpay_create_invoice", () => {
    it("should create an invoice with line items given a customer id and items", async () => {
      // Given: a customer exists and has a billable item
      (mockClient.createInvoice as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "inv_NEW01",
        customer_id: "cust_ABC",
        status: "issued",
        amount: 150000,
      });

      // When: the tool is invoked with customer_id and line_items
      const handler = mockServer.getHandler("razorpay_create_invoice");
      const result = await handler({
        customer_id: "cust_ABC",
        line_items: [
          { name: "Professional Services", amount: 150000, currency: "INR", quantity: 1 },
        ],
      });

      // Then: createInvoice is called with type:"invoice" and the correct payload
      expect(mockClient.createInvoice).toHaveBeenCalledWith({
        type: "invoice",
        customer_id: "cust_ABC",
        line_items: [
          { name: "Professional Services", amount: 150000, currency: "INR", quantity: 1 },
        ],
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("inv_NEW01");
      expect(parsed.status).toBe("issued");
    });

    it("should return an error response given an invalid customer id", async () => {
      // Given: no customer exists with the supplied id
      (mockClient.createInvoice as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Customer not found"),
      );

      // When: the tool is invoked with the bad customer_id
      const handler = mockServer.getHandler("razorpay_create_invoice");
      const result = await handler({
        customer_id: "cust_INVALID",
        line_items: [{ name: "Item", amount: 50000, currency: "INR", quantity: 1 }],
      });

      // Then: response is marked as error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Customer not found");
    });
  });

  // ── razorpay_list_invoices ───────────────────────────────────

  describe("razorpay_list_invoices", () => {
    it("should return invoices with id and status given a pagination request", async () => {
      // Given: the account has two issued invoices
      (mockClient.listInvoices as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 2,
        items: [
          { id: "inv_A", amount: 100000, status: "issued" },
          { id: "inv_B", amount: 50000, status: "paid" },
        ],
      });

      // When: the tool is invoked with count and skip
      const handler = mockServer.getHandler("razorpay_list_invoices");
      const result = await handler({ count: 10, skip: 0 });

      // Then: both invoices are returned with correct statuses
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].id).toBe("inv_A");
      expect(parsed.items[1].status).toBe("paid");
    });

    it("should return an empty items array given no invoices exist", async () => {
      // Given: the account has no invoices yet
      (mockClient.listInvoices as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_list_invoices");
      const result = await handler({ count: 10 });

      // Then: items array is empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(0);
    });
  });

  // ── razorpay_list_customers ──────────────────────────────────

  describe("razorpay_list_customers", () => {
    it("should return customers with id, name, and email given a pagination request", async () => {
      // Given: three customers are registered on the account
      (mockClient.listCustomers as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 3,
        items: [
          { id: "cust_1", name: "Alice", email: "alice@example.com" },
          { id: "cust_2", name: "Bob", email: "bob@example.com" },
          { id: "cust_3", name: "Charlie", email: "charlie@example.com" },
        ],
      });

      // When: the tool is invoked with count and skip
      const handler = mockServer.getHandler("razorpay_list_customers");
      const result = await handler({ count: 10, skip: 0 });

      // Then: all three customers are returned with name and email
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(3);
      expect(parsed.items[0].name).toBe("Alice");
      expect(parsed.items[2].email).toBe("charlie@example.com");
    });

    it("should return an error response given an API failure", async () => {
      // Given: the customers endpoint is throwing
      (mockClient.listCustomers as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Unauthorized"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_list_customers");
      const result = await handler({ count: 10 });

      // Then: response is marked as error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });

  // ── razorpay_create_customer ─────────────────────────────────

  describe("razorpay_create_customer", () => {
    it("should create a customer given valid name, email, and contact", async () => {
      // Given: all required fields are provided
      (mockClient.createCustomer as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "cust_NEW01",
        name: "Priya Sharma",
        email: "priya@example.com",
        contact: "9876543210",
      });

      // When: the tool is invoked with name, email, and contact
      const handler = mockServer.getHandler("razorpay_create_customer");
      const result = await handler({
        name: "Priya Sharma",
        email: "priya@example.com",
        contact: "9876543210",
      });

      // Then: createCustomer is called with the correct payload and id is returned
      expect(mockClient.createCustomer).toHaveBeenCalledWith({
        name: "Priya Sharma",
        email: "priya@example.com",
        contact: "9876543210",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("cust_NEW01");
      expect(parsed.name).toBe("Priya Sharma");
    });

    it("should include notes in the customer payload given notes are provided", async () => {
      // Given: the merchant wants to tag the customer with internal metadata
      (mockClient.createCustomer as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "cust_TAG01",
        name: "Rahul Verma",
        email: "rahul@example.com",
        contact: "9123456780",
        notes: { tier: "gold" },
      });

      // When: the tool is invoked with notes
      const handler = mockServer.getHandler("razorpay_create_customer");
      await handler({
        name: "Rahul Verma",
        email: "rahul@example.com",
        contact: "9123456780",
        notes: { tier: "gold" },
      });

      // Then: createCustomer receives notes in the payload
      expect(mockClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ notes: { tier: "gold" } }),
      );
    });
  });
});

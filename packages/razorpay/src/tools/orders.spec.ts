/**
 * BDD spec: Razorpay order tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   razorpay_create_order, razorpay_list_orders, razorpay_fetch_order
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RazorpayClient } from "../client.js";
import { registerOrderTools } from "./orders.js";

function createMockClient() {
  return {
    createOrder: vi.fn(),
    listOrders: vi.fn(),
    fetchOrder: vi.fn(),
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

describe("razorpay order tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerOrderTools(mockServer as any, mockClient);
  });

  // ── razorpay_create_order ────────────────────────────────────

  describe("razorpay_create_order", () => {
    it("should create an order given a valid amount, currency, and receipt", async () => {
      // Given: the merchant wants to initiate a ₹500 checkout
      (mockClient.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "order_NEW01",
        amount: 50000,
        currency: "INR",
        receipt: "rcpt_web_001",
        status: "created",
      });

      // When: the tool is invoked with amount in paisa, currency, and receipt
      const handler = mockServer.getHandler("razorpay_create_order");
      const result = await handler({
        amount: 50000,
        currency: "INR",
        receipt: "rcpt_web_001",
      });

      // Then: createOrder is called with the full params and returns the new order id
      expect(mockClient.createOrder).toHaveBeenCalledWith({
        amount: 50000,
        currency: "INR",
        receipt: "rcpt_web_001",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("order_NEW01");
      expect(parsed.status).toBe("created");
      expect(parsed.amount).toBe(50000);
    });

    it("should include notes in the order payload given notes are provided", async () => {
      // Given: the merchant passes internal metadata via notes
      (mockClient.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "order_NOTE01",
        amount: 100000,
        currency: "INR",
        status: "created",
        notes: { customer_segment: "premium" },
      });

      // When: the tool is invoked with notes
      const handler = mockServer.getHandler("razorpay_create_order");
      await handler({
        amount: 100000,
        currency: "INR",
        notes: { customer_segment: "premium" },
      });

      // Then: createOrder receives notes in the payload
      expect(mockClient.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ notes: { customer_segment: "premium" } }),
      );
    });

    it("should return an error response given the order creation fails", async () => {
      // Given: the Razorpay API rejects the request (e.g. invalid key)
      (mockClient.createOrder as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Authentication failed"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("razorpay_create_order");
      const result = await handler({ amount: 50000, currency: "INR" });

      // Then: response is marked as an error with the original message
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Authentication failed");
    });
  });

  // ── razorpay_list_orders ─────────────────────────────────────

  describe("razorpay_list_orders", () => {
    it("should return a paginated list of orders given count and skip", async () => {
      // Given: the account has three recent orders
      (mockClient.listOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 3,
        items: [
          { id: "order_A", amount: 50000, status: "paid" },
          { id: "order_B", amount: 30000, status: "created" },
          { id: "order_C", amount: 20000, status: "paid" },
        ],
      });

      // When: the tool is invoked with pagination params
      const handler = mockServer.getHandler("razorpay_list_orders");
      const result = await handler({ count: 10, skip: 0 });

      // Then: collection is returned with the full items list
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(3);
      expect(parsed.items[0].id).toBe("order_A");
      expect(parsed.items[2].status).toBe("paid");
    });

    it("should pass date strings as unix timestamps given from/to ISO inputs", async () => {
      // Given: caller wants orders in a specific calendar window
      (mockClient.listOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 0,
        items: [],
      });

      // When: the tool is invoked with ISO date strings
      const handler = mockServer.getHandler("razorpay_list_orders");
      await handler({ from: "2026-03-01", to: "2026-03-28", count: 20 });

      // Then: client receives numeric unix timestamps
      const callArgs = (mockClient.listOrders as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.from).toBeTypeOf("number");
      expect(callArgs.to).toBeTypeOf("number");
      expect(callArgs.count).toBe(20);
    });
  });

  // ── razorpay_fetch_order ─────────────────────────────────────

  describe("razorpay_fetch_order", () => {
    it("should return full order detail given a known order ID", async () => {
      // Given: the order exists in Razorpay
      (mockClient.fetchOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "order_XYZ",
        amount: 75000,
        currency: "INR",
        status: "paid",
        receipt: "rcpt_123",
      });

      // When: the tool is invoked with the order_id
      const handler = mockServer.getHandler("razorpay_fetch_order");
      const result = await handler({ order_id: "order_XYZ" });

      // Then: fetchOrder is called with the id and all fields are present
      expect(mockClient.fetchOrder).toHaveBeenCalledWith("order_XYZ");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("order_XYZ");
      expect(parsed.status).toBe("paid");
      expect(parsed.amount).toBe(75000);
    });

    it("should return an error response given an invalid order ID", async () => {
      // Given: Razorpay cannot find the order
      (mockClient.fetchOrder as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Order not found"),
      );

      // When: the tool is invoked with the bad id
      const handler = mockServer.getHandler("razorpay_fetch_order");
      const result = await handler({ order_id: "order_BOGUS" });

      // Then: response is marked as error and message is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Order not found");
    });
  });
});

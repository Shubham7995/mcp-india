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

describe("Order Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerOrderTools(mockServer as any, mockClient);
  });

  describe("tool registration", () => {
    it("should register all 3 order tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("razorpay_create_order");
      expect(tools).toContain("razorpay_list_orders");
      expect(tools).toContain("razorpay_fetch_order");
      expect(tools).toHaveLength(3);
    });
  });

  describe("razorpay_create_order", () => {
    it("should create an order with amount in paisa", async () => {
      (mockClient.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "order_ABC",
        amount: 50000,
        currency: "INR",
        status: "created",
      });

      const handler = mockServer.getHandler("razorpay_create_order");
      const result = await handler({
        amount: 50000,
        currency: "INR",
        receipt: "rcpt_001",
      });

      expect(mockClient.createOrder).toHaveBeenCalledWith({
        amount: 50000,
        currency: "INR",
        receipt: "rcpt_001",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("order_ABC");
    });
  });

  describe("razorpay_list_orders", () => {
    it("should list orders with pagination", async () => {
      (mockClient.listOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
        entity: "collection",
        count: 1,
        items: [{ id: "order_A", status: "paid" }],
      });

      const handler = mockServer.getHandler("razorpay_list_orders");
      const result = await handler({ count: 10, skip: 0 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.items).toHaveLength(1);
    });
  });

  describe("razorpay_fetch_order", () => {
    it("should fetch a single order by ID", async () => {
      (mockClient.fetchOrder as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "order_XYZ",
        amount: 75000,
        status: "paid",
      });

      const handler = mockServer.getHandler("razorpay_fetch_order");
      const result = await handler({ order_id: "order_XYZ" });

      expect(mockClient.fetchOrder).toHaveBeenCalledWith("order_XYZ");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("order_XYZ");
    });

    it("should return error response on failure", async () => {
      (mockClient.fetchOrder as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Order not found"),
      );

      const handler = mockServer.getHandler("razorpay_fetch_order");
      const result = await handler({ order_id: "order_INVALID" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Order not found");
    });
  });
});

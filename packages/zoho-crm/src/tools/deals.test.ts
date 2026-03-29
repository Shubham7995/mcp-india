import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ZohoCrmClient } from "../client.js";
import { registerDealTools } from "./deals.js";

function createMockClient() {
  return {
    listDeals: vi.fn(),
    getDeal: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
  } as unknown as ZohoCrmClient;
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

describe("Deal Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDealTools(mockServer as any, mockClient);
  });

  describe("tool registration", () => {
    it("should register all 4 deal tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("zoho_list_deals");
      expect(tools).toContain("zoho_create_deal");
      expect(tools).toContain("zoho_update_deal_stage");
      expect(tools).toContain("zoho_get_deal");
      expect(tools).toHaveLength(4);
    });
  });

  describe("zoho_list_deals", () => {
    it("should return deals as JSON", async () => {
      (mockClient.listDeals as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: "d1", Deal_Name: "Test Deal" }],
        info: { count: 1, more_records: false, page: 1, per_page: 20 },
      });

      const handler = mockServer.getHandler("zoho_list_deals");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(1);
    });

    it("should pass sort params to the client", async () => {
      (mockClient.listDeals as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

      const handler = mockServer.getHandler("zoho_list_deals");
      await handler({ sort_by: "Amount", sort_order: "desc" });

      expect(mockClient.listDeals).toHaveBeenCalledWith({
        sort_by: "Amount",
        sort_order: "desc",
        page: undefined,
        per_page: undefined,
      });
    });
  });

  describe("zoho_create_deal", () => {
    it("should map input fields to Zoho field names", async () => {
      (mockClient.createDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "d10" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_create_deal");
      await handler({ deal_name: "New", stage: "Qualification", amount: 1000 });

      expect(mockClient.createDeal).toHaveBeenCalledWith({
        Deal_Name: "New",
        Stage: "Qualification",
        Amount: 1000,
      });
    });

    it("should omit optional fields when not provided", async () => {
      (mockClient.createDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "d11" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_create_deal");
      await handler({ deal_name: "Min", stage: "Qualification" });

      expect(mockClient.createDeal).toHaveBeenCalledWith({
        Deal_Name: "Min",
        Stage: "Qualification",
      });
    });
  });

  describe("zoho_update_deal_stage", () => {
    it("should send only the Stage field", async () => {
      (mockClient.updateDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "d1" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_update_deal_stage");
      await handler({ deal_id: "d1", stage: "Closed Won" });

      expect(mockClient.updateDeal).toHaveBeenCalledWith("d1", { Stage: "Closed Won" });
    });
  });

  describe("zoho_get_deal", () => {
    it("should return the deal record", async () => {
      (mockClient.getDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "d1",
        Deal_Name: "Test",
        Stage: "Qualification",
      });

      const handler = mockServer.getHandler("zoho_get_deal");
      const result = await handler({ deal_id: "d1" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.Deal_Name).toBe("Test");
    });

    it("should handle errors gracefully", async () => {
      (mockClient.getDeal as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not found"));

      const handler = mockServer.getHandler("zoho_get_deal");
      const result = await handler({ deal_id: "bad" });

      expect(result.isError).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HubSpotClient } from "../client.js";
import { registerDealTools } from "./deals.js";

function createMockClient(): {
  [K in keyof HubSpotClient]: ReturnType<typeof vi.fn>;
} {
  return {
    searchContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    searchCompanies: vi.fn(),
    getCompany: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    searchDeals: vi.fn(),
    getDeal: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    createNote: vi.fn(),
    createTask: vi.fn(),
    logEmail: vi.fn(),
    listActivities: vi.fn(),
    listPipelines: vi.fn(),
    listAllDeals: vi.fn(),
  } as unknown as { [K in keyof HubSpotClient]: ReturnType<typeof vi.fn> };
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

describe("Deal Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDealTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 4 deal tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("hubspot_search_deals");
      expect(tools).toContain("hubspot_get_deal");
      expect(tools).toContain("hubspot_create_deal");
      expect(tools).toContain("hubspot_update_deal");
      expect(tools).toHaveLength(4);
    });
  });

  describe("hubspot_search_deals", () => {
    it("should return deals as JSON text content", async () => {
      mockClient.searchDeals.mockResolvedValue({
        total: 2,
        results: [
          {
            id: "801",
            properties: {
              dealname: "Enterprise Renewal",
              amount: "50000",
              dealstage: "qualifiedtobuy",
              pipeline: "default",
            },
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-03-01T00:00:00Z",
            archived: false,
          },
          {
            id: "802",
            properties: {
              dealname: "SMB Upsell",
              amount: "12000",
              dealstage: "presentationscheduled",
              pipeline: "default",
            },
            createdAt: "2026-01-05T00:00:00Z",
            updatedAt: "2026-03-05T00:00:00Z",
            archived: false,
          },
        ],
      });

      const handler = mockServer.getHandler("hubspot_search_deals");
      const result = await handler({ query: "renewal", limit: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(2);
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0].properties.dealname).toBe("Enterprise Renewal");
    });

    it("should call searchDeals with default properties when none provided", async () => {
      mockClient.searchDeals.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_deals");
      await handler({ query: "enterprise", limit: 5 });

      expect(mockClient.searchDeals).toHaveBeenCalledWith(
        "enterprise",
        ["dealname", "amount", "dealstage", "pipeline", "closedate", "hubspot_owner_id"],
        5,
        undefined,
      );
    });

    it("should call searchDeals with custom properties when provided", async () => {
      mockClient.searchDeals.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_deals");
      await handler({ query: "renewal", properties: ["dealname", "amount"], limit: 10 });

      expect(mockClient.searchDeals).toHaveBeenCalledWith(
        "renewal",
        ["dealname", "amount"],
        10,
        undefined,
      );
    });

    it("should forward pagination cursor when after is provided", async () => {
      mockClient.searchDeals.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_deals");
      await handler({ query: "upsell", limit: 10, after: "dealCursor789" });

      expect(mockClient.searchDeals).toHaveBeenCalledWith(
        "upsell",
        ["dealname", "amount", "dealstage", "pipeline", "closedate", "hubspot_owner_id"],
        10,
        "dealCursor789",
      );
    });

    it("should return error response on API failure", async () => {
      mockClient.searchDeals.mockRejectedValue(new Error("Rate limit exceeded"));

      const handler = mockServer.getHandler("hubspot_search_deals");
      const result = await handler({ query: "enterprise" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit exceeded");
    });
  });

  describe("hubspot_get_deal", () => {
    it("should fetch a single deal by ID", async () => {
      mockClient.getDeal.mockResolvedValue({
        id: "801",
        properties: {
          dealname: "Enterprise Renewal",
          amount: "50000",
          dealstage: "qualifiedtobuy",
          pipeline: "default",
          closedate: "2026-06-30T00:00:00Z",
          hubspot_owner_id: "12345",
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_get_deal");
      const result = await handler({ deal_id: "801" });

      expect(mockClient.getDeal).toHaveBeenCalledWith(
        "801",
        ["dealname", "amount", "dealstage", "pipeline", "closedate", "hubspot_owner_id"],
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("801");
      expect(parsed.properties.dealname).toBe("Enterprise Renewal");
    });

    it("should use custom properties when provided", async () => {
      mockClient.getDeal.mockResolvedValue({
        id: "801",
        properties: { dealname: "Enterprise Renewal", amount: "50000" },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_get_deal");
      await handler({ deal_id: "801", properties: ["dealname", "amount"] });

      expect(mockClient.getDeal).toHaveBeenCalledWith("801", ["dealname", "amount"]);
    });

    it("should return error response when deal is not found", async () => {
      mockClient.getDeal.mockRejectedValue(new Error("Deal not found: 999"));

      const handler = mockServer.getHandler("hubspot_get_deal");
      const result = await handler({ deal_id: "999" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("999");
    });
  });

  describe("hubspot_create_deal", () => {
    it("should create a deal with all provided fields", async () => {
      mockClient.createDeal.mockResolvedValue({
        id: "901",
        properties: {
          dealname: "New Enterprise Deal",
          amount: "75000",
          pipeline: "default",
          dealstage: "appointmentscheduled",
          closedate: "2026-09-30",
        },
        createdAt: "2026-03-29T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_deal");
      const result = await handler({
        dealname: "New Enterprise Deal",
        amount: "75000",
        pipeline: "default",
        dealstage: "appointmentscheduled",
        closedate: "2026-09-30",
      });

      expect(mockClient.createDeal).toHaveBeenCalledWith({
        dealname: "New Enterprise Deal",
        amount: "75000",
        pipeline: "default",
        dealstage: "appointmentscheduled",
        closedate: "2026-09-30",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("901");
    });

    it("should create a deal with only dealname provided", async () => {
      mockClient.createDeal.mockResolvedValue({
        id: "902",
        properties: { dealname: "Bare Deal" },
        createdAt: "2026-03-29T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_deal");
      await handler({ dealname: "Bare Deal" });

      expect(mockClient.createDeal).toHaveBeenCalledWith({ dealname: "Bare Deal" });
    });

    it("should omit undefined optional fields from the properties object", async () => {
      mockClient.createDeal.mockResolvedValue({ id: "903", properties: {} });

      const handler = mockServer.getHandler("hubspot_create_deal");
      await handler({ dealname: "Partial Deal", amount: "25000" });

      expect(mockClient.createDeal).toHaveBeenCalledWith({
        dealname: "Partial Deal",
        amount: "25000",
      });
    });

    it("should return error response on API failure", async () => {
      mockClient.createDeal.mockRejectedValue(new Error("Pipeline not found"));

      const handler = mockServer.getHandler("hubspot_create_deal");
      const result = await handler({ dealname: "Bad Deal", pipeline: "nonexistent" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Pipeline not found");
    });
  });

  describe("hubspot_update_deal", () => {
    it("should update deal stage by ID", async () => {
      mockClient.updateDeal.mockResolvedValue({
        id: "801",
        properties: { dealname: "Enterprise Renewal", dealstage: "closedwon" },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_update_deal");
      const result = await handler({
        deal_id: "801",
        properties: { dealstage: "closedwon" },
      });

      expect(mockClient.updateDeal).toHaveBeenCalledWith("801", { dealstage: "closedwon" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.dealstage).toBe("closedwon");
    });

    it("should update multiple deal properties at once", async () => {
      mockClient.updateDeal.mockResolvedValue({
        id: "801",
        properties: { dealstage: "closedwon", amount: "80000" },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_update_deal");
      await handler({
        deal_id: "801",
        properties: { dealstage: "closedwon", amount: "80000" },
      });

      expect(mockClient.updateDeal).toHaveBeenCalledWith("801", {
        dealstage: "closedwon",
        amount: "80000",
      });
    });

    it("should return error response on API failure", async () => {
      mockClient.updateDeal.mockRejectedValue(new Error("Unauthorized"));

      const handler = mockServer.getHandler("hubspot_update_deal");
      const result = await handler({
        deal_id: "801",
        properties: { dealstage: "closedwon" },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });
});

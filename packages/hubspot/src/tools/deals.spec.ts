/**
 * BDD spec: HubSpot deal tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   hubspot_search_deals, hubspot_get_deal,
 *   hubspot_create_deal, hubspot_update_deal
 */

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

describe("hubspot deal tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDealTools(mockServer as any, mockClient as any);
  });

  // ── hubspot_search_deals ────────────────────────────────────

  describe("hubspot_search_deals", () => {
    it("should return matching deals given a deal name query", async () => {
      // Given: HubSpot has deals matching the query
      mockClient.searchDeals.mockResolvedValue({
        total: 1,
        results: [
          {
            id: "801",
            properties: {
              dealname: "Enterprise Renewal Q2",
              amount: "50000",
              dealstage: "qualifiedtobuy",
              pipeline: "default",
            },
            createdAt: "2026-01-10T00:00:00Z",
            updatedAt: "2026-03-10T00:00:00Z",
            archived: false,
          },
        ],
      });

      // When: the tool is invoked with the deal name as a query
      const handler = mockServer.getHandler("hubspot_search_deals");
      const result = await handler({ query: "Enterprise Renewal", limit: 10 });

      // Then: the response contains the matching deal
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.results[0].properties.dealname).toBe("Enterprise Renewal Q2");
    });

    it("should return empty results given a query that matches no deals", async () => {
      // Given: no deals match the search
      mockClient.searchDeals.mockResolvedValue({ total: 0, results: [] });

      // When: the tool is invoked with an obscure query
      const handler = mockServer.getHandler("hubspot_search_deals");
      const result = await handler({ query: "zzznomatch" });

      // Then: total is zero and results are empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.results).toHaveLength(0);
    });

    it("should return an error response given an API failure", async () => {
      // Given: the HubSpot API is unavailable
      mockClient.searchDeals.mockRejectedValue(new Error("Service unavailable"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_search_deals");
      const result = await handler({ query: "enterprise" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Service unavailable");
    });
  });

  // ── hubspot_get_deal ────────────────────────────────────────

  describe("hubspot_get_deal", () => {
    it("should return full deal detail given a known deal ID", async () => {
      // Given: the deal exists in HubSpot
      mockClient.getDeal.mockResolvedValue({
        id: "801",
        properties: {
          dealname: "Enterprise Renewal Q2",
          amount: "50000",
          dealstage: "qualifiedtobuy",
          pipeline: "default",
          closedate: "2026-06-30T00:00:00Z",
          hubspot_owner_id: "12345",
        },
        createdAt: "2026-01-10T00:00:00Z",
        updatedAt: "2026-03-10T00:00:00Z",
      });

      // When: the tool is invoked with that deal_id
      const handler = mockServer.getHandler("hubspot_get_deal");
      const result = await handler({ deal_id: "801" });

      // Then: all deal properties are returned
      expect(mockClient.getDeal).toHaveBeenCalledWith(
        "801",
        ["dealname", "amount", "dealstage", "pipeline", "closedate", "hubspot_owner_id"],
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.amount).toBe("50000");
    });

    it("should return an error given an unknown deal ID", async () => {
      // Given: the deal does not exist
      mockClient.getDeal.mockRejectedValue(new Error("Not found: deal 999"));

      // When: the tool is invoked with a non-existent ID
      const handler = mockServer.getHandler("hubspot_get_deal");
      const result = await handler({ deal_id: "999" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("999");
    });
  });

  // ── hubspot_create_deal ─────────────────────────────────────

  describe("hubspot_create_deal", () => {
    it("should create a deal given a name, amount, and close date", async () => {
      // Given: HubSpot will accept the new deal
      mockClient.createDeal.mockResolvedValue({
        id: "1001",
        properties: {
          dealname: "Q3 Expansion",
          amount: "30000",
          closedate: "2026-09-30",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with name, amount, and closedate
      const handler = mockServer.getHandler("hubspot_create_deal");
      const result = await handler({
        dealname: "Q3 Expansion",
        amount: "30000",
        closedate: "2026-09-30",
      });

      // Then: the created deal is returned with an ID
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1001");
      expect(parsed.properties.dealname).toBe("Q3 Expansion");
    });

    it("should create a deal given only a name", async () => {
      // Given: only the deal name is provided
      mockClient.createDeal.mockResolvedValue({
        id: "1002",
        properties: { dealname: "Minimal Deal" },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with just a dealname
      const handler = mockServer.getHandler("hubspot_create_deal");
      const result = await handler({ dealname: "Minimal Deal" });

      // Then: the deal is created with name property only
      expect(mockClient.createDeal).toHaveBeenCalledWith({ dealname: "Minimal Deal" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1002");
    });

    it("should return an error given an invalid pipeline ID", async () => {
      // Given: the pipeline ID does not exist
      mockClient.createDeal.mockRejectedValue(new Error("PIPELINE_NOT_FOUND"));

      // When: the tool is invoked with a bad pipeline
      const handler = mockServer.getHandler("hubspot_create_deal");
      const result = await handler({
        dealname: "Bad Pipeline Deal",
        pipeline: "nonexistent-pipeline",
      });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("PIPELINE_NOT_FOUND");
    });
  });

  // ── hubspot_update_deal ─────────────────────────────────────

  describe("hubspot_update_deal", () => {
    it("should move a deal to closed-won stage given a valid deal ID", async () => {
      // Given: the deal exists and the stage transition is valid
      mockClient.updateDeal.mockResolvedValue({
        id: "801",
        properties: { dealname: "Enterprise Renewal Q2", dealstage: "closedwon" },
        createdAt: "2026-01-10T00:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked to move to closedwon
      const handler = mockServer.getHandler("hubspot_update_deal");
      const result = await handler({
        deal_id: "801",
        properties: { dealstage: "closedwon" },
      });

      // Then: the updated deal reflects the new stage
      expect(mockClient.updateDeal).toHaveBeenCalledWith("801", { dealstage: "closedwon" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.dealstage).toBe("closedwon");
    });

    it("should update the deal amount given a renegotiated value", async () => {
      // Given: the deal amount needs to be revised upward
      mockClient.updateDeal.mockResolvedValue({
        id: "801",
        properties: { dealname: "Enterprise Renewal Q2", amount: "65000" },
        createdAt: "2026-01-10T00:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with the new amount
      const handler = mockServer.getHandler("hubspot_update_deal");
      const result = await handler({
        deal_id: "801",
        properties: { amount: "65000" },
      });

      // Then: the updated amount is returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.amount).toBe("65000");
    });

    it("should return an error given a non-existent deal ID", async () => {
      // Given: the deal does not exist
      mockClient.updateDeal.mockRejectedValue(new Error("Deal 555 not found"));

      // When: the tool is invoked with that deal_id
      const handler = mockServer.getHandler("hubspot_update_deal");
      const result = await handler({
        deal_id: "555",
        properties: { dealstage: "closedlost" },
      });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("555");
    });
  });
});

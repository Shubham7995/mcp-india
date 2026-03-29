/**
 * BDD spec: HubSpot company tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   hubspot_search_companies, hubspot_get_company,
 *   hubspot_create_company, hubspot_update_company
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HubSpotClient } from "../client.js";
import { registerCompanyTools } from "./companies.js";

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

describe("hubspot company tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerCompanyTools(mockServer as any, mockClient as any);
  });

  // ── hubspot_search_companies ────────────────────────────────

  describe("hubspot_search_companies", () => {
    it("should return matching companies given a domain query", async () => {
      // Given: HubSpot has a company matching the domain
      mockClient.searchCompanies.mockResolvedValue({
        total: 1,
        results: [
          {
            id: "501",
            properties: { name: "Acme Corp", domain: "acme.com", industry: "Technology" },
            createdAt: "2026-01-10T00:00:00Z",
            updatedAt: "2026-03-10T00:00:00Z",
            archived: false,
          },
        ],
      });

      // When: the tool is invoked with the domain as a query
      const handler = mockServer.getHandler("hubspot_search_companies");
      const result = await handler({ query: "acme.com", limit: 10 });

      // Then: the response contains the matching company
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.results[0].properties.domain).toBe("acme.com");
    });

    it("should return empty results given a query that matches no companies", async () => {
      // Given: no companies match the query
      mockClient.searchCompanies.mockResolvedValue({ total: 0, results: [] });

      // When: the tool is invoked with an obscure name
      const handler = mockServer.getHandler("hubspot_search_companies");
      const result = await handler({ query: "zzznomatch999" });

      // Then: total is zero and results are empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.results).toHaveLength(0);
    });

    it("should return an error response given an API authentication failure", async () => {
      // Given: the access token is invalid
      mockClient.searchCompanies.mockRejectedValue(new Error("Invalid token"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_search_companies");
      const result = await handler({ query: "test" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid token");
    });
  });

  // ── hubspot_get_company ─────────────────────────────────────

  describe("hubspot_get_company", () => {
    it("should return full company detail given a known company ID", async () => {
      // Given: the company exists in HubSpot
      mockClient.getCompany.mockResolvedValue({
        id: "501",
        properties: {
          name: "Acme Corp",
          domain: "acme.com",
          industry: "Technology",
          city: "San Francisco",
          phone: "+14155550100",
        },
        createdAt: "2026-01-10T00:00:00Z",
        updatedAt: "2026-03-10T00:00:00Z",
      });

      // When: the tool is invoked with that company_id
      const handler = mockServer.getHandler("hubspot_get_company");
      const result = await handler({ company_id: "501" });

      // Then: all company properties are returned
      expect(mockClient.getCompany).toHaveBeenCalledWith(
        "501",
        ["name", "domain", "industry", "city", "phone"],
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.industry).toBe("Technology");
    });

    it("should return an error given an unknown company ID", async () => {
      // Given: the company does not exist
      mockClient.getCompany.mockRejectedValue(new Error("Not found: company 777"));

      // When: the tool is invoked with a non-existent ID
      const handler = mockServer.getHandler("hubspot_get_company");
      const result = await handler({ company_id: "777" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("777");
    });
  });

  // ── hubspot_create_company ──────────────────────────────────

  describe("hubspot_create_company", () => {
    it("should create a company given a name and domain", async () => {
      // Given: HubSpot will accept the new company
      mockClient.createCompany.mockResolvedValue({
        id: "701",
        properties: { name: "StartupXYZ", domain: "startupxyz.com" },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with name and domain
      const handler = mockServer.getHandler("hubspot_create_company");
      const result = await handler({ name: "StartupXYZ", domain: "startupxyz.com" });

      // Then: the created company is returned with an ID
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("701");
      expect(parsed.properties.domain).toBe("startupxyz.com");
    });

    it("should create a company given only a name", async () => {
      // Given: only the company name is available
      mockClient.createCompany.mockResolvedValue({
        id: "702",
        properties: { name: "NameOnlyCo" },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with just a name
      const handler = mockServer.getHandler("hubspot_create_company");
      const result = await handler({ name: "NameOnlyCo" });

      // Then: the company is created with name property only
      expect(mockClient.createCompany).toHaveBeenCalledWith({ name: "NameOnlyCo" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("702");
    });

    it("should return an error given a validation failure from HubSpot", async () => {
      // Given: HubSpot rejects the request due to invalid data
      mockClient.createCompany.mockRejectedValue(new Error("INVALID_EMAIL_ADDRESS"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_create_company");
      const result = await handler({ name: "BadCo", domain: "not-a-valid-domain!!" });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("INVALID_EMAIL_ADDRESS");
    });
  });

  // ── hubspot_update_company ──────────────────────────────────

  describe("hubspot_update_company", () => {
    it("should update a company's industry given a valid company ID", async () => {
      // Given: the company exists and can be updated
      mockClient.updateCompany.mockResolvedValue({
        id: "501",
        properties: { name: "Acme Corp", industry: "FinTech" },
        createdAt: "2026-01-10T00:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with the company_id and new industry
      const handler = mockServer.getHandler("hubspot_update_company");
      const result = await handler({
        company_id: "501",
        properties: { industry: "FinTech" },
      });

      // Then: the updated company is returned
      expect(mockClient.updateCompany).toHaveBeenCalledWith("501", { industry: "FinTech" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.industry).toBe("FinTech");
    });

    it("should return an error given an attempt to update a non-existent company", async () => {
      // Given: the company ID does not exist
      mockClient.updateCompany.mockRejectedValue(new Error("Company 888 not found"));

      // When: the tool is invoked with that company_id
      const handler = mockServer.getHandler("hubspot_update_company");
      const result = await handler({
        company_id: "888",
        properties: { city: "Chicago" },
      });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("888");
    });
  });
});

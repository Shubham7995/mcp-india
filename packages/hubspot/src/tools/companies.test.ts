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

describe("Company Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerCompanyTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 4 company tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("hubspot_search_companies");
      expect(tools).toContain("hubspot_get_company");
      expect(tools).toContain("hubspot_create_company");
      expect(tools).toContain("hubspot_update_company");
      expect(tools).toHaveLength(4);
    });
  });

  describe("hubspot_search_companies", () => {
    it("should return companies as JSON text content", async () => {
      mockClient.searchCompanies.mockResolvedValue({
        total: 2,
        results: [
          {
            id: "501",
            properties: { name: "Acme Corp", domain: "acme.com", industry: "Technology" },
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-03-01T00:00:00Z",
            archived: false,
          },
          {
            id: "502",
            properties: { name: "Globex Inc", domain: "globex.com", industry: "Manufacturing" },
            createdAt: "2026-01-02T00:00:00Z",
            updatedAt: "2026-03-02T00:00:00Z",
            archived: false,
          },
        ],
      });

      const handler = mockServer.getHandler("hubspot_search_companies");
      const result = await handler({ query: "corp", limit: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(2);
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0].properties.name).toBe("Acme Corp");
    });

    it("should call searchCompanies with default properties when none provided", async () => {
      mockClient.searchCompanies.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_companies");
      await handler({ query: "acme", limit: 5 });

      expect(mockClient.searchCompanies).toHaveBeenCalledWith(
        "acme",
        ["name", "domain", "industry", "city", "phone"],
        5,
        undefined,
      );
    });

    it("should call searchCompanies with custom properties when provided", async () => {
      mockClient.searchCompanies.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_companies");
      await handler({ query: "acme", properties: ["name", "domain"], limit: 10 });

      expect(mockClient.searchCompanies).toHaveBeenCalledWith(
        "acme",
        ["name", "domain"],
        10,
        undefined,
      );
    });

    it("should forward pagination cursor when after is provided", async () => {
      mockClient.searchCompanies.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_companies");
      await handler({ query: "tech", limit: 10, after: "pageToken456" });

      expect(mockClient.searchCompanies).toHaveBeenCalledWith(
        "tech",
        ["name", "domain", "industry", "city", "phone"],
        10,
        "pageToken456",
      );
    });

    it("should return error response on API failure", async () => {
      mockClient.searchCompanies.mockRejectedValue(new Error("Service unavailable"));

      const handler = mockServer.getHandler("hubspot_search_companies");
      const result = await handler({ query: "acme" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Service unavailable");
    });
  });

  describe("hubspot_get_company", () => {
    it("should fetch a single company by ID", async () => {
      mockClient.getCompany.mockResolvedValue({
        id: "501",
        properties: {
          name: "Acme Corp",
          domain: "acme.com",
          industry: "Technology",
          city: "San Francisco",
          phone: "+14155550100",
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_get_company");
      const result = await handler({ company_id: "501" });

      expect(mockClient.getCompany).toHaveBeenCalledWith(
        "501",
        ["name", "domain", "industry", "city", "phone"],
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("501");
      expect(parsed.properties.name).toBe("Acme Corp");
    });

    it("should use custom properties when provided", async () => {
      mockClient.getCompany.mockResolvedValue({
        id: "501",
        properties: { name: "Acme Corp", domain: "acme.com" },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_get_company");
      await handler({ company_id: "501", properties: ["name", "domain"] });

      expect(mockClient.getCompany).toHaveBeenCalledWith("501", ["name", "domain"]);
    });

    it("should return error response when company is not found", async () => {
      mockClient.getCompany.mockRejectedValue(new Error("Company not found: 999"));

      const handler = mockServer.getHandler("hubspot_get_company");
      const result = await handler({ company_id: "999" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("999");
    });
  });

  describe("hubspot_create_company", () => {
    it("should create a company with all provided fields", async () => {
      mockClient.createCompany.mockResolvedValue({
        id: "601",
        properties: {
          name: "NewCo",
          domain: "newco.io",
          industry: "SaaS",
          city: "Austin",
          phone: "+15125550200",
        },
        createdAt: "2026-03-29T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_company");
      const result = await handler({
        name: "NewCo",
        domain: "newco.io",
        industry: "SaaS",
        city: "Austin",
        phone: "+15125550200",
      });

      expect(mockClient.createCompany).toHaveBeenCalledWith({
        name: "NewCo",
        domain: "newco.io",
        industry: "SaaS",
        city: "Austin",
        phone: "+15125550200",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("601");
    });

    it("should create a company with only name provided", async () => {
      mockClient.createCompany.mockResolvedValue({
        id: "602",
        properties: { name: "NameOnly Corp" },
        createdAt: "2026-03-29T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_company");
      await handler({ name: "NameOnly Corp" });

      expect(mockClient.createCompany).toHaveBeenCalledWith({ name: "NameOnly Corp" });
    });

    it("should omit undefined optional fields from the properties object", async () => {
      mockClient.createCompany.mockResolvedValue({ id: "603", properties: {} });

      const handler = mockServer.getHandler("hubspot_create_company");
      await handler({ name: "Sparse Inc", domain: "sparse.io" });

      expect(mockClient.createCompany).toHaveBeenCalledWith({
        name: "Sparse Inc",
        domain: "sparse.io",
      });
    });

    it("should return error response on API failure", async () => {
      mockClient.createCompany.mockRejectedValue(new Error("Invalid properties"));

      const handler = mockServer.getHandler("hubspot_create_company");
      const result = await handler({ name: "BadCo" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid properties");
    });
  });

  describe("hubspot_update_company", () => {
    it("should update company properties by ID", async () => {
      mockClient.updateCompany.mockResolvedValue({
        id: "501",
        properties: { name: "Acme Corp", domain: "acme-updated.com" },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_update_company");
      const result = await handler({
        company_id: "501",
        properties: { domain: "acme-updated.com" },
      });

      expect(mockClient.updateCompany).toHaveBeenCalledWith("501", {
        domain: "acme-updated.com",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.domain).toBe("acme-updated.com");
    });

    it("should return error response on API failure", async () => {
      mockClient.updateCompany.mockRejectedValue(new Error("Forbidden"));

      const handler = mockServer.getHandler("hubspot_update_company");
      const result = await handler({
        company_id: "501",
        properties: { industry: "Finance" },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forbidden");
    });
  });
});

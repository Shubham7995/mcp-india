import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HubSpotClient } from "../client.js";
import { registerContactTools } from "./contacts.js";

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

describe("Contact Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerContactTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 4 contact tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("hubspot_search_contacts");
      expect(tools).toContain("hubspot_get_contact");
      expect(tools).toContain("hubspot_create_contact");
      expect(tools).toContain("hubspot_update_contact");
      expect(tools).toHaveLength(4);
    });
  });

  describe("hubspot_search_contacts", () => {
    it("should return contacts as JSON text content", async () => {
      mockClient.searchContacts.mockResolvedValue({
        total: 2,
        results: [
          {
            id: "101",
            properties: { email: "alice@example.com", firstname: "Alice", lastname: "Smith" },
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-03-01T00:00:00Z",
            archived: false,
          },
          {
            id: "102",
            properties: { email: "bob@example.com", firstname: "Bob", lastname: "Jones" },
            createdAt: "2026-01-02T00:00:00Z",
            updatedAt: "2026-03-02T00:00:00Z",
            archived: false,
          },
        ],
      });

      const handler = mockServer.getHandler("hubspot_search_contacts");
      const result = await handler({ query: "example.com", limit: 10 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(2);
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0].properties.email).toBe("alice@example.com");
    });

    it("should call searchContacts with default properties when none provided", async () => {
      mockClient.searchContacts.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_contacts");
      await handler({ query: "test", limit: 5 });

      expect(mockClient.searchContacts).toHaveBeenCalledWith(
        "test",
        ["email", "firstname", "lastname", "phone", "company"],
        5,
        undefined,
      );
    });

    it("should call searchContacts with custom properties when provided", async () => {
      mockClient.searchContacts.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_contacts");
      await handler({ query: "alice", properties: ["email", "firstname"], limit: 10 });

      expect(mockClient.searchContacts).toHaveBeenCalledWith(
        "alice",
        ["email", "firstname"],
        10,
        undefined,
      );
    });

    it("should forward pagination cursor when after is provided", async () => {
      mockClient.searchContacts.mockResolvedValue({ total: 0, results: [] });

      const handler = mockServer.getHandler("hubspot_search_contacts");
      await handler({ query: "test", limit: 10, after: "cursor123" });

      expect(mockClient.searchContacts).toHaveBeenCalledWith(
        "test",
        ["email", "firstname", "lastname", "phone", "company"],
        10,
        "cursor123",
      );
    });

    it("should return error response on API failure", async () => {
      mockClient.searchContacts.mockRejectedValue(new Error("Unauthorized"));

      const handler = mockServer.getHandler("hubspot_search_contacts");
      const result = await handler({ query: "test" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });

  describe("hubspot_get_contact", () => {
    it("should fetch a single contact by ID", async () => {
      mockClient.getContact.mockResolvedValue({
        id: "101",
        properties: {
          email: "alice@example.com",
          firstname: "Alice",
          lastname: "Smith",
          phone: "+1234567890",
          company: "Acme Inc",
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_get_contact");
      const result = await handler({ contact_id: "101" });

      expect(mockClient.getContact).toHaveBeenCalledWith(
        "101",
        ["email", "firstname", "lastname", "phone", "company"],
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("101");
      expect(parsed.properties.email).toBe("alice@example.com");
    });

    it("should use custom properties when provided", async () => {
      mockClient.getContact.mockResolvedValue({
        id: "101",
        properties: { email: "alice@example.com" },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_get_contact");
      await handler({ contact_id: "101", properties: ["email"] });

      expect(mockClient.getContact).toHaveBeenCalledWith("101", ["email"]);
    });

    it("should return error response when contact is not found", async () => {
      mockClient.getContact.mockRejectedValue(new Error("Contact not found: 999"));

      const handler = mockServer.getHandler("hubspot_get_contact");
      const result = await handler({ contact_id: "999" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("999");
    });
  });

  describe("hubspot_create_contact", () => {
    it("should create a contact with all provided fields", async () => {
      mockClient.createContact.mockResolvedValue({
        id: "201",
        properties: {
          email: "new@example.com",
          firstname: "New",
          lastname: "User",
          phone: "+9876543210",
          company: "NewCo",
        },
        createdAt: "2026-03-29T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_contact");
      const result = await handler({
        email: "new@example.com",
        firstname: "New",
        lastname: "User",
        phone: "+9876543210",
        company: "NewCo",
      });

      expect(mockClient.createContact).toHaveBeenCalledWith({
        email: "new@example.com",
        firstname: "New",
        lastname: "User",
        phone: "+9876543210",
        company: "NewCo",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("201");
    });

    it("should create a contact with only email provided", async () => {
      mockClient.createContact.mockResolvedValue({
        id: "202",
        properties: { email: "minimal@example.com" },
        createdAt: "2026-03-29T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_contact");
      await handler({ email: "minimal@example.com" });

      expect(mockClient.createContact).toHaveBeenCalledWith({
        email: "minimal@example.com",
      });
    });

    it("should omit undefined optional fields from the properties object", async () => {
      mockClient.createContact.mockResolvedValue({ id: "203", properties: {} });

      const handler = mockServer.getHandler("hubspot_create_contact");
      await handler({ firstname: "OnlyFirst" });

      expect(mockClient.createContact).toHaveBeenCalledWith({
        firstname: "OnlyFirst",
      });
    });

    it("should return error response on validation failure", async () => {
      mockClient.createContact.mockRejectedValue(new Error("CONTACT_EXISTS"));

      const handler = mockServer.getHandler("hubspot_create_contact");
      const result = await handler({ email: "duplicate@example.com" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("CONTACT_EXISTS");
    });
  });

  describe("hubspot_update_contact", () => {
    it("should update contact properties by ID", async () => {
      mockClient.updateContact.mockResolvedValue({
        id: "101",
        properties: { email: "updated@example.com", phone: "+1111111111" },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_update_contact");
      const result = await handler({
        contact_id: "101",
        properties: { email: "updated@example.com", phone: "+1111111111" },
      });

      expect(mockClient.updateContact).toHaveBeenCalledWith("101", {
        email: "updated@example.com",
        phone: "+1111111111",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("101");
      expect(parsed.properties.email).toBe("updated@example.com");
    });

    it("should return error response on API failure", async () => {
      mockClient.updateContact.mockRejectedValue(new Error("Rate limit exceeded"));

      const handler = mockServer.getHandler("hubspot_update_contact");
      const result = await handler({
        contact_id: "101",
        properties: { phone: "+999" },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit exceeded");
    });
  });
});

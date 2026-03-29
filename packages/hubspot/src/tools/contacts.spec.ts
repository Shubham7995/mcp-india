/**
 * BDD spec: HubSpot contact tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   hubspot_search_contacts, hubspot_get_contact,
 *   hubspot_create_contact, hubspot_update_contact
 */

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

describe("hubspot contact tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerContactTools(mockServer as any, mockClient as any);
  });

  // ── hubspot_search_contacts ─────────────────────────────────

  describe("hubspot_search_contacts", () => {
    it("should return matching contacts given a known email query", async () => {
      // Given: HubSpot has a contact matching the email
      mockClient.searchContacts.mockResolvedValue({
        total: 1,
        results: [
          {
            id: "101",
            properties: { email: "alice@acme.com", firstname: "Alice", lastname: "Smith" },
            createdAt: "2026-01-15T00:00:00Z",
            updatedAt: "2026-03-01T00:00:00Z",
            archived: false,
          },
        ],
      });

      // When: the tool is invoked with the email as a query
      const handler = mockServer.getHandler("hubspot_search_contacts");
      const result = await handler({ query: "alice@acme.com", limit: 10 });

      // Then: the response contains the matching contact
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(1);
      expect(parsed.results[0].properties.email).toBe("alice@acme.com");
    });

    it("should return empty results given a query that matches no contacts", async () => {
      // Given: no contacts match the query
      mockClient.searchContacts.mockResolvedValue({ total: 0, results: [] });

      // When: the tool is invoked with an obscure query
      const handler = mockServer.getHandler("hubspot_search_contacts");
      const result = await handler({ query: "zzznomatch999" });

      // Then: total is zero and results are empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total).toBe(0);
      expect(parsed.results).toHaveLength(0);
    });

    it("should return an error response given an API authentication failure", async () => {
      // Given: HubSpot returns an auth error
      mockClient.searchContacts.mockRejectedValue(new Error("Authentication required"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_search_contacts");
      const result = await handler({ query: "test" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Authentication required");
    });
  });

  // ── hubspot_get_contact ─────────────────────────────────────

  describe("hubspot_get_contact", () => {
    it("should return full contact detail given a known contact ID", async () => {
      // Given: the contact exists in HubSpot
      mockClient.getContact.mockResolvedValue({
        id: "101",
        properties: {
          email: "alice@acme.com",
          firstname: "Alice",
          lastname: "Smith",
          phone: "+1800555000",
          company: "Acme Corp",
        },
        createdAt: "2026-01-15T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      });

      // When: the tool is invoked with that contact_id
      const handler = mockServer.getHandler("hubspot_get_contact");
      const result = await handler({ contact_id: "101" });

      // Then: all contact properties are returned
      expect(mockClient.getContact).toHaveBeenCalledWith(
        "101",
        ["email", "firstname", "lastname", "phone", "company"],
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.company).toBe("Acme Corp");
    });

    it("should return an error given an unknown contact ID", async () => {
      // Given: the contact does not exist
      mockClient.getContact.mockRejectedValue(new Error("Not found: contact 999"));

      // When: the tool is invoked with a non-existent ID
      const handler = mockServer.getHandler("hubspot_get_contact");
      const result = await handler({ contact_id: "999" });

      // Then: the response is marked as an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("999");
    });
  });

  // ── hubspot_create_contact ──────────────────────────────────

  describe("hubspot_create_contact", () => {
    it("should create a contact given valid email and name fields", async () => {
      // Given: HubSpot will accept the new contact
      mockClient.createContact.mockResolvedValue({
        id: "301",
        properties: {
          email: "charlie@startup.io",
          firstname: "Charlie",
          lastname: "Brown",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with email, firstname, and lastname
      const handler = mockServer.getHandler("hubspot_create_contact");
      const result = await handler({
        email: "charlie@startup.io",
        firstname: "Charlie",
        lastname: "Brown",
      });

      // Then: the created contact is returned with an ID
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("301");
      expect(parsed.properties.email).toBe("charlie@startup.io");
    });

    it("should create a contact given only an email address", async () => {
      // Given: only email is provided (minimum required)
      mockClient.createContact.mockResolvedValue({
        id: "302",
        properties: { email: "minimal@startup.io" },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with just an email
      const handler = mockServer.getHandler("hubspot_create_contact");
      const result = await handler({ email: "minimal@startup.io" });

      // Then: the contact is created with just the email property
      expect(mockClient.createContact).toHaveBeenCalledWith({ email: "minimal@startup.io" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("302");
    });

    it("should return an error given a duplicate email address", async () => {
      // Given: a contact with this email already exists
      mockClient.createContact.mockRejectedValue(new Error("CONTACT_EXISTS"));

      // When: the tool attempts to create the duplicate
      const handler = mockServer.getHandler("hubspot_create_contact");
      const result = await handler({ email: "existing@acme.com" });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("CONTACT_EXISTS");
    });
  });

  // ── hubspot_update_contact ──────────────────────────────────

  describe("hubspot_update_contact", () => {
    it("should update a contact's phone number given a valid contact ID", async () => {
      // Given: the contact exists and can be updated
      mockClient.updateContact.mockResolvedValue({
        id: "101",
        properties: { email: "alice@acme.com", phone: "+1999888777" },
        createdAt: "2026-01-15T00:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with the contact_id and new phone
      const handler = mockServer.getHandler("hubspot_update_contact");
      const result = await handler({
        contact_id: "101",
        properties: { phone: "+1999888777" },
      });

      // Then: the updated contact is returned
      expect(mockClient.updateContact).toHaveBeenCalledWith("101", { phone: "+1999888777" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.properties.phone).toBe("+1999888777");
    });

    it("should return an error given an attempt to update a non-existent contact", async () => {
      // Given: the contact ID does not exist
      mockClient.updateContact.mockRejectedValue(new Error("Contact 888 not found"));

      // When: the tool is invoked with that contact_id
      const handler = mockServer.getHandler("hubspot_update_contact");
      const result = await handler({
        contact_id: "888",
        properties: { company: "Ghost Corp" },
      });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("888");
    });
  });
});

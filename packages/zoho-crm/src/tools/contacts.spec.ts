/**
 * BDD spec: Zoho CRM contact tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   zoho_search_contacts, zoho_create_contact,
 *   zoho_update_contact, zoho_get_contact
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ZohoCrmClient } from "../client.js";
import { registerContactTools } from "./contacts.js";

function createMockClient() {
  return {
    searchContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
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

describe("Zoho CRM contact tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerContactTools(mockServer as any, mockClient);
  });

  // ── zoho_search_contacts ───────────────────────────────────

  describe("zoho_search_contacts", () => {
    it("should return matching contacts given a search by email", async () => {
      // Given: Zoho CRM has a contact with this email
      (mockClient.searchContacts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          { id: "5000000000001", First_Name: "Priya", Last_Name: "Sharma", Email: "priya@example.com", Phone: "+919876543210" },
        ],
        info: { count: 1, more_records: false, page: 1, per_page: 20 },
      });

      // When: the tool is invoked searching by email
      const handler = mockServer.getHandler("zoho_search_contacts");
      const result = await handler({ query: "priya@example.com", search_by: "email" });

      // Then: the contact data is returned
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].Email).toBe("priya@example.com");
    });

    it("should return matching contacts given a search by phone", async () => {
      // Given: Zoho CRM has contacts with this phone
      (mockClient.searchContacts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          { id: "5000000000002", First_Name: "Raj", Last_Name: "Patel", Email: "raj@example.com", Phone: "+919876543210" },
        ],
        info: { count: 1, more_records: false, page: 1, per_page: 20 },
      });

      // When: the tool is invoked searching by phone
      const handler = mockServer.getHandler("zoho_search_contacts");
      const result = await handler({ query: "+919876543210", search_by: "phone" });

      // Then: the matching contact is returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].Phone).toBe("+919876543210");
    });

    it("should return matching contacts given a keyword search", async () => {
      // Given: Zoho has contacts matching a keyword
      (mockClient.searchContacts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          { id: "5000000000003", First_Name: "Amit", Last_Name: "Kumar", Email: "amit@acme.com", Phone: null },
          { id: "5000000000004", First_Name: "Amita", Last_Name: "Singh", Email: "amita@acme.com", Phone: null },
        ],
        info: { count: 2, more_records: false, page: 1, per_page: 20 },
      });

      // When: the tool is invoked with a word search
      const handler = mockServer.getHandler("zoho_search_contacts");
      const result = await handler({ query: "Amit", search_by: "word" });

      // Then: multiple matching contacts are returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
    });

    it("should return an error response given the API throws", async () => {
      // Given: the OAuth token has expired
      (mockClient.searchContacts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Authentication failed for Zoho CRM"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_search_contacts");
      const result = await handler({ query: "test@example.com", search_by: "email" });

      // Then: isError is true
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Authentication failed");
    });
  });

  // ── zoho_create_contact ────────────────────────────────────

  describe("zoho_create_contact", () => {
    it("should create a contact given required and optional fields", async () => {
      // Given: Zoho CRM accepts the creation request
      (mockClient.createContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "5000000000010" }, message: "record added", status: "success" }],
      });

      // When: the tool is invoked with all fields
      const handler = mockServer.getHandler("zoho_create_contact");
      const result = await handler({
        last_name: "Sharma",
        first_name: "Priya",
        email: "priya@example.com",
        phone: "+919876543210",
      });

      // Then: success response with the new contact ID
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].details.id).toBe("5000000000010");
      expect(parsed.data[0].code).toBe("SUCCESS");
    });

    it("should create a contact given only the required last_name field", async () => {
      // Given: Zoho CRM accepts minimal fields
      (mockClient.createContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "5000000000011" }, message: "record added", status: "success" }],
      });

      // When: the tool is invoked with just last_name
      const handler = mockServer.getHandler("zoho_create_contact");
      const result = await handler({ last_name: "Kumar" });

      // Then: the contact is created
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].code).toBe("SUCCESS");
    });

    it("should return an error given the API rejects the request", async () => {
      // Given: a validation error
      (mockClient.createContact as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Zoho CRM: mandatory field missing"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_create_contact");
      const result = await handler({ last_name: "" });

      // Then: error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("mandatory field");
    });
  });

  // ── zoho_update_contact ────────────────────────────────────

  describe("zoho_update_contact", () => {
    it("should update contact fields given a valid contact ID", async () => {
      // Given: the contact exists and can be updated
      (mockClient.updateContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "5000000000001" }, message: "record updated", status: "success" }],
      });

      // When: the tool updates the email
      const handler = mockServer.getHandler("zoho_update_contact");
      const result = await handler({ contact_id: "5000000000001", fields: { Email: "new@example.com" } });

      // Then: success
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].code).toBe("SUCCESS");
    });

    it("should pass only the provided fields to the API", async () => {
      // Given: update succeeds
      (mockClient.updateContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "5000000000001" }, message: "record updated", status: "success" }],
      });

      // When: updating multiple fields
      const handler = mockServer.getHandler("zoho_update_contact");
      await handler({ contact_id: "5000000000001", fields: { Phone: "+1234567890", Email: "updated@test.com" } });

      // Then: the client received the exact fields
      expect(mockClient.updateContact).toHaveBeenCalledWith(
        "5000000000001",
        { Phone: "+1234567890", Email: "updated@test.com" },
      );
    });

    it("should return an error given the contact is not found", async () => {
      // Given: the contact doesn't exist
      (mockClient.updateContact as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Zoho CRM record not found"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_update_contact");
      const result = await handler({ contact_id: "invalid_id", fields: { Email: "x@y.com" } });

      // Then: error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });

  // ── zoho_get_contact ───────────────────────────────────────

  describe("zoho_get_contact", () => {
    it("should return the full contact record given a valid ID", async () => {
      // Given: the contact exists
      (mockClient.getContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "5000000000001",
        First_Name: "Priya",
        Last_Name: "Sharma",
        Email: "priya@example.com",
        Phone: "+919876543210",
        Account_Name: { name: "Acme Corp", id: "4000000000001" },
        Created_Time: "2026-03-01T10:00:00+05:30",
        Modified_Time: "2026-03-15T14:30:00+05:30",
      });

      // When: the tool fetches the contact
      const handler = mockServer.getHandler("zoho_get_contact");
      const result = await handler({ contact_id: "5000000000001" });

      // Then: the complete record is returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("5000000000001");
      expect(parsed.Last_Name).toBe("Sharma");
      expect(parsed.Email).toBe("priya@example.com");
      expect(parsed.Account_Name.name).toBe("Acme Corp");
    });

    it("should return an error given the contact ID does not exist", async () => {
      // Given: no such contact
      (mockClient.getContact as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Zoho CRM record not found: Contacts/invalid"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_get_contact");
      const result = await handler({ contact_id: "invalid" });

      // Then: error response
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });

    it("should pass the correct contact ID to the client", async () => {
      // Given: the client returns data
      (mockClient.getContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "5000000000099",
        First_Name: "Test",
        Last_Name: "User",
      });

      // When: a specific ID is requested
      const handler = mockServer.getHandler("zoho_get_contact");
      await handler({ contact_id: "5000000000099" });

      // Then: the correct ID was passed
      expect(mockClient.getContact).toHaveBeenCalledWith("5000000000099");
    });
  });
});

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

describe("Contact Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerContactTools(mockServer as any, mockClient);
  });

  describe("tool registration", () => {
    it("should register all 4 contact tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("zoho_search_contacts");
      expect(tools).toContain("zoho_create_contact");
      expect(tools).toContain("zoho_update_contact");
      expect(tools).toContain("zoho_get_contact");
      expect(tools).toHaveLength(4);
    });
  });

  describe("zoho_search_contacts", () => {
    it("should return search results as JSON", async () => {
      (mockClient.searchContacts as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: "1", Last_Name: "Test" }],
        info: { count: 1, more_records: false, page: 1, per_page: 20 },
      });

      const handler = mockServer.getHandler("zoho_search_contacts");
      const result = await handler({ query: "test@example.com", search_by: "email" });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(1);
    });

    it("should pass email search params to the client", async () => {
      (mockClient.searchContacts as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], info: null });

      const handler = mockServer.getHandler("zoho_search_contacts");
      await handler({ query: "test@example.com", search_by: "email", page: 2, per_page: 50 });

      expect(mockClient.searchContacts).toHaveBeenCalledWith({
        email: "test@example.com",
        page: 2,
        per_page: 50,
      });
    });
  });

  describe("zoho_create_contact", () => {
    it("should create a contact with mapped fields", async () => {
      (mockClient.createContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "10" }, message: "record added", status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_create_contact");
      const result = await handler({ last_name: "Doe", first_name: "Jane", email: "jane@test.com" });

      expect(mockClient.createContact).toHaveBeenCalledWith({
        Last_Name: "Doe",
        First_Name: "Jane",
        Email: "jane@test.com",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].code).toBe("SUCCESS");
    });

    it("should only pass provided optional fields", async () => {
      (mockClient.createContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "11" }, message: "record added", status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_create_contact");
      await handler({ last_name: "Solo" });

      expect(mockClient.createContact).toHaveBeenCalledWith({
        Last_Name: "Solo",
      });
    });
  });

  describe("zoho_update_contact", () => {
    it("should pass ID and fields to the client", async () => {
      (mockClient.updateContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "1" }, message: "record updated", status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_update_contact");
      await handler({ contact_id: "1", fields: { Email: "new@test.com" } });

      expect(mockClient.updateContact).toHaveBeenCalledWith("1", { Email: "new@test.com" });
    });
  });

  describe("zoho_get_contact", () => {
    it("should return the contact record", async () => {
      (mockClient.getContact as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "1",
        First_Name: "Test",
        Last_Name: "User",
        Email: "test@example.com",
      });

      const handler = mockServer.getHandler("zoho_get_contact");
      const result = await handler({ contact_id: "1" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1");
      expect(parsed.Last_Name).toBe("User");
    });

    it("should handle API errors gracefully", async () => {
      (mockClient.getContact as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Zoho CRM record not found"),
      );

      const handler = mockServer.getHandler("zoho_get_contact");
      const result = await handler({ contact_id: "invalid" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });
});

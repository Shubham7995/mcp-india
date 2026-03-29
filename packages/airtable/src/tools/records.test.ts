import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AirtableClient } from "../client.js";
import { registerRecordTools } from "./records.js";

function createMockClient(): {
  [K in keyof AirtableClient]: ReturnType<typeof vi.fn>;
} {
  return {
    listRecords: vi.fn(),
    getRecord: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
    listBases: vi.fn(),
    listTables: vi.fn(),
    getTableSchema: vi.fn(),
    bulkCreate: vi.fn(),
    bulkUpdate: vi.fn(),
  } as unknown as { [K in keyof AirtableClient]: ReturnType<typeof vi.fn> };
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

describe("Record Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerRecordTools(mockServer as any, mockClient as any);
  });

  it("should register 6 record tools", () => {
    const tools = mockServer.getRegisteredTools();
    expect(tools).toHaveLength(6);
    expect(tools).toContain("airtable_list_records");
    expect(tools).toContain("airtable_get_record");
    expect(tools).toContain("airtable_create_record");
    expect(tools).toContain("airtable_update_record");
    expect(tools).toContain("airtable_delete_record");
    expect(tools).toContain("airtable_search_records");
  });

  // ── List Records ──────────────────────────────────────────

  describe("airtable_list_records", () => {
    it("should return records as JSON", async () => {
      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Name: "Alice" }, createdTime: "2026-01-01T00:00:00.000Z" },
        ],
      });

      const handler = mockServer.getHandler("airtable_list_records");
      const result = await handler({ table: "Tasks", max_records: 100 });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.records).toHaveLength(1);
      expect(parsed.records[0].id).toBe("rec001");
      expect(mockClient.listRecords).toHaveBeenCalledWith({
        table: "Tasks",
        baseId: undefined,
        view: undefined,
        sort: undefined,
        filterByFormula: undefined,
        maxRecords: 100,
        offset: undefined,
      });
    });

    it("should pass optional filter and view parameters", async () => {
      mockClient.listRecords.mockResolvedValue({ records: [] });

      const handler = mockServer.getHandler("airtable_list_records");
      await handler({
        table: "Tasks",
        view: "Grid view",
        filter: "{Status} = 'Active'",
        max_records: 50,
      });

      expect(mockClient.listRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          view: "Grid view",
          filterByFormula: "{Status} = 'Active'",
          maxRecords: 50,
        }),
      );
    });

    it("should pass sort parameters", async () => {
      mockClient.listRecords.mockResolvedValue({ records: [] });

      const handler = mockServer.getHandler("airtable_list_records");
      await handler({
        table: "Tasks",
        sort: [{ field: "Name", direction: "asc" }],
        max_records: 100,
      });

      expect(mockClient.listRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ field: "Name", direction: "asc" }],
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      mockClient.listRecords.mockRejectedValue(new Error("API error"));

      const handler = mockServer.getHandler("airtable_list_records");
      const result = await handler({ table: "Tasks", max_records: 100 });

      expect(result.isError).toBe(true);
    });
  });

  // ── Get Record ────────────────────────────────────────────

  describe("airtable_get_record", () => {
    it("should return a single record", async () => {
      mockClient.getRecord.mockResolvedValue({
        id: "rec001",
        fields: { Name: "Alice", Email: "alice@test.com" },
        createdTime: "2026-01-01T00:00:00.000Z",
      });

      const handler = mockServer.getHandler("airtable_get_record");
      const result = await handler({ table: "Contacts", record_id: "rec001" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.id).toBe("rec001");
      expect(parsed.fields.Name).toBe("Alice");
      expect(mockClient.getRecord).toHaveBeenCalledWith({
        table: "Contacts",
        recordId: "rec001",
        baseId: undefined,
      });
    });

    it("should pass base_id override", async () => {
      mockClient.getRecord.mockResolvedValue({
        id: "rec001",
        fields: {},
        createdTime: "2026-01-01T00:00:00.000Z",
      });

      const handler = mockServer.getHandler("airtable_get_record");
      await handler({ table: "Tasks", record_id: "rec001", base_id: "appOTHER" });

      expect(mockClient.getRecord).toHaveBeenCalledWith({
        table: "Tasks",
        recordId: "rec001",
        baseId: "appOTHER",
      });
    });
  });

  // ── Create Record ─────────────────────────────────────────

  describe("airtable_create_record", () => {
    it("should create a record with fields", async () => {
      mockClient.createRecord.mockResolvedValue({
        id: "recNEW",
        fields: { Name: "Bob", Status: "Active" },
        createdTime: "2026-03-01T00:00:00.000Z",
      });

      const handler = mockServer.getHandler("airtable_create_record");
      const result = await handler({
        table: "Contacts",
        fields: { Name: "Bob", Status: "Active" },
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.id).toBe("recNEW");
      expect(parsed.fields.Name).toBe("Bob");
      expect(mockClient.createRecord).toHaveBeenCalledWith({
        table: "Contacts",
        fields: { Name: "Bob", Status: "Active" },
        baseId: undefined,
      });
    });
  });

  // ── Update Record ─────────────────────────────────────────

  describe("airtable_update_record", () => {
    it("should update record fields", async () => {
      mockClient.updateRecord.mockResolvedValue({
        id: "rec001",
        fields: { Status: "Done" },
        createdTime: "2026-01-01T00:00:00.000Z",
      });

      const handler = mockServer.getHandler("airtable_update_record");
      const result = await handler({
        table: "Tasks",
        record_id: "rec001",
        fields: { Status: "Done" },
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.fields.Status).toBe("Done");
      expect(mockClient.updateRecord).toHaveBeenCalledWith({
        table: "Tasks",
        recordId: "rec001",
        fields: { Status: "Done" },
        baseId: undefined,
      });
    });
  });

  // ── Delete Record ─────────────────────────────────────────

  describe("airtable_delete_record", () => {
    it("should delete a record and return confirmation", async () => {
      mockClient.deleteRecord.mockResolvedValue({
        id: "rec001",
        deleted: true,
      });

      const handler = mockServer.getHandler("airtable_delete_record");
      const result = await handler({ table: "Tasks", record_id: "rec001" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe("rec001");
      expect(mockClient.deleteRecord).toHaveBeenCalledWith({
        table: "Tasks",
        recordId: "rec001",
        baseId: undefined,
      });
    });
  });

  // ── Search Records ────────────────────────────────────────

  describe("airtable_search_records", () => {
    it("should search using formula passthrough", async () => {
      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec002", fields: { Email: "bob@acme.com" }, createdTime: "2026-01-01T00:00:00.000Z" },
        ],
      });

      const handler = mockServer.getHandler("airtable_search_records");
      const result = await handler({
        table: "Contacts",
        formula: "{Email} = 'bob@acme.com'",
        max_records: 100,
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.records).toHaveLength(1);
      expect(mockClient.listRecords).toHaveBeenCalledWith({
        table: "Contacts",
        baseId: undefined,
        filterByFormula: "{Email} = 'bob@acme.com'",
        maxRecords: 100,
      });
    });

    it("should handle errors", async () => {
      mockClient.listRecords.mockRejectedValue(new Error("Not found"));

      const handler = mockServer.getHandler("airtable_search_records");
      const result = await handler({
        table: "Contacts",
        formula: "{Email} = 'x'",
        max_records: 100,
      });

      expect(result.isError).toBe(true);
    });
  });
});

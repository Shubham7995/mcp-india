import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AirtableClient } from "../client.js";
import { registerBulkTools } from "./bulk.js";

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

describe("Airtable Bulk Tools — BDD", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerBulkTools(mockServer as any, mockClient as any);
  });

  // ── Bulk Create ───────────────────────────────────────────

  describe("airtable_bulk_create", () => {
    it("should create multiple records given an array of field objects", async () => {
      // Given: the user wants to batch-create 3 contacts
      const inputRecords = [
        { fields: { Name: "Alice", Email: "alice@test.com" } },
        { fields: { Name: "Bob", Email: "bob@test.com" } },
        { fields: { Name: "Charlie", Email: "charlie@test.com" } },
      ];

      mockClient.bulkCreate.mockResolvedValue({
        records: [
          { id: "recA", fields: { Name: "Alice", Email: "alice@test.com" }, createdTime: "2026-03-01T00:00:00.000Z" },
          { id: "recB", fields: { Name: "Bob", Email: "bob@test.com" }, createdTime: "2026-03-01T00:00:00.000Z" },
          { id: "recC", fields: { Name: "Charlie", Email: "charlie@test.com" }, createdTime: "2026-03-01T00:00:00.000Z" },
        ],
      });

      // When: the bulk create tool is invoked
      const handler = mockServer.getHandler("airtable_bulk_create");
      const result = await handler({ table: "Contacts", records: inputRecords });
      const parsed = JSON.parse(result.content[0].text);

      // Then: all 3 records are created with IDs
      expect(parsed.records).toHaveLength(3);
      expect(parsed.records[0].id).toBe("recA");
      expect(parsed.records[2].fields.Name).toBe("Charlie");
    });

    it("should return error given more than 10 records", async () => {
      // Given: the user tries to create 11 records (exceeds Airtable's limit)
      mockClient.bulkCreate.mockRejectedValue(
        new Error("Airtable bulk operations are limited to 10 records per call"),
      );

      // When: the bulk create tool is invoked
      const handler = mockServer.getHandler("airtable_bulk_create");
      const result = await handler({
        table: "Tasks",
        records: Array.from({ length: 11 }, (_, i) => ({
          fields: { Name: `Task ${i + 1}` },
        })),
      });

      // Then: an error is returned
      expect(result.isError).toBe(true);
    });
  });

  // ── Bulk Update ───────────────────────────────────────────

  describe("airtable_bulk_update", () => {
    it("should update multiple records given IDs and new field values", async () => {
      // Given: multiple records need their status updated
      const inputRecords = [
        { id: "rec001", fields: { Status: "Complete" } },
        { id: "rec002", fields: { Status: "Complete" } },
      ];

      mockClient.bulkUpdate.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Name: "Task A", Status: "Complete" }, createdTime: "2026-01-01T00:00:00.000Z" },
          { id: "rec002", fields: { Name: "Task B", Status: "Complete" }, createdTime: "2026-01-02T00:00:00.000Z" },
        ],
      });

      // When: the bulk update tool is invoked
      const handler = mockServer.getHandler("airtable_bulk_update");
      const result = await handler({ table: "Tasks", records: inputRecords });
      const parsed = JSON.parse(result.content[0].text);

      // Then: updated records are returned
      expect(parsed.records).toHaveLength(2);
      expect(parsed.records[0].fields.Status).toBe("Complete");
      expect(parsed.records[1].fields.Status).toBe("Complete");
    });
  });

  // ── Table Summary ─────────────────────────────────────────

  describe("airtable_table_summary", () => {
    it("should return aggregated summary given a table with records", async () => {
      // Given: a table has a schema and sample records
      mockClient.getTableSchema.mockResolvedValue({
        id: "tblXYZ",
        name: "Inventory",
        fields: [
          { id: "fld1", name: "Product", type: "singleLineText" },
          { id: "fld2", name: "Quantity", type: "number" },
          { id: "fld3", name: "Category", type: "singleSelect" },
        ],
        primaryFieldId: "fld1",
      });

      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Product: "Widget", Quantity: 50, Category: "Parts" }, createdTime: "2026-01-01T00:00:00.000Z" },
          { id: "rec002", fields: { Product: "Gadget", Quantity: 30, Category: "Parts" }, createdTime: "2026-01-02T00:00:00.000Z" },
        ],
      });

      // When: the table summary tool is invoked
      const handler = mockServer.getHandler("airtable_table_summary");
      const result = await handler({ table: "Inventory" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: summary includes name, record count, field types, and samples
      expect(parsed.table_name).toBe("Inventory");
      expect(parsed.total_records).toBe(2);
      expect(parsed.fields).toEqual([
        { name: "Product", type: "singleLineText" },
        { name: "Quantity", type: "number" },
        { name: "Category", type: "singleSelect" },
      ]);
      expect(parsed.sample_records).toHaveLength(2);
    });

    it("should handle missing schema gracefully given null from getTableSchema", async () => {
      // Given: the table schema is not found
      mockClient.getTableSchema.mockResolvedValue(null);
      mockClient.listRecords.mockResolvedValue({ records: [] });

      // When: the table summary tool is invoked
      const handler = mockServer.getHandler("airtable_table_summary");
      const result = await handler({ table: "MissingTable" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: the summary uses the input table name and empty fields
      expect(parsed.table_name).toBe("MissingTable");
      expect(parsed.fields).toEqual([]);
      expect(parsed.total_records).toBe(0);
    });
  });
});

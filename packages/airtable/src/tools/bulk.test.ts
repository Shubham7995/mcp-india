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

describe("Bulk Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerBulkTools(mockServer as any, mockClient as any);
  });

  it("should register 3 bulk tools", () => {
    const tools = mockServer.getRegisteredTools();
    expect(tools).toHaveLength(3);
    expect(tools).toContain("airtable_bulk_create");
    expect(tools).toContain("airtable_bulk_update");
    expect(tools).toContain("airtable_table_summary");
  });

  // ── Bulk Create ───────────────────────────────────────────

  describe("airtable_bulk_create", () => {
    it("should create multiple records at once", async () => {
      const records = [
        { fields: { Name: "Alice" } },
        { fields: { Name: "Bob" } },
        { fields: { Name: "Charlie" } },
      ];

      mockClient.bulkCreate.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Name: "Alice" }, createdTime: "2026-01-01T00:00:00.000Z" },
          { id: "rec002", fields: { Name: "Bob" }, createdTime: "2026-01-01T00:00:00.000Z" },
          { id: "rec003", fields: { Name: "Charlie" }, createdTime: "2026-01-01T00:00:00.000Z" },
        ],
      });

      const handler = mockServer.getHandler("airtable_bulk_create");
      const result = await handler({ table: "Contacts", records });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.records).toHaveLength(3);
      expect(mockClient.bulkCreate).toHaveBeenCalledWith({
        table: "Contacts",
        records,
        baseId: undefined,
      });
    });

    it("should pass base_id override", async () => {
      mockClient.bulkCreate.mockResolvedValue({ records: [] });

      const handler = mockServer.getHandler("airtable_bulk_create");
      await handler({
        table: "Tasks",
        records: [{ fields: { Name: "X" } }],
        base_id: "appOTHER",
      });

      expect(mockClient.bulkCreate).toHaveBeenCalledWith(
        expect.objectContaining({ baseId: "appOTHER" }),
      );
    });

    it("should handle errors from client", async () => {
      mockClient.bulkCreate.mockRejectedValue(
        new Error("Airtable bulk operations are limited to 10 records per call"),
      );

      const handler = mockServer.getHandler("airtable_bulk_create");
      const result = await handler({
        table: "Tasks",
        records: Array.from({ length: 11 }, (_, i) => ({
          fields: { Name: `Item ${i}` },
        })),
      });

      expect(result.isError).toBe(true);
    });
  });

  // ── Bulk Update ───────────────────────────────────────────

  describe("airtable_bulk_update", () => {
    it("should update multiple records at once", async () => {
      const records = [
        { id: "rec001", fields: { Status: "Done" } },
        { id: "rec002", fields: { Status: "Done" } },
      ];

      mockClient.bulkUpdate.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Status: "Done" }, createdTime: "2026-01-01T00:00:00.000Z" },
          { id: "rec002", fields: { Status: "Done" }, createdTime: "2026-01-01T00:00:00.000Z" },
        ],
      });

      const handler = mockServer.getHandler("airtable_bulk_update");
      const result = await handler({ table: "Tasks", records });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.records).toHaveLength(2);
      expect(mockClient.bulkUpdate).toHaveBeenCalledWith({
        table: "Tasks",
        records,
        baseId: undefined,
      });
    });

    it("should handle errors", async () => {
      mockClient.bulkUpdate.mockRejectedValue(new Error("Validation error"));

      const handler = mockServer.getHandler("airtable_bulk_update");
      const result = await handler({
        table: "Tasks",
        records: [{ id: "rec001", fields: { Status: "Done" } }],
      });

      expect(result.isError).toBe(true);
    });
  });

  // ── Table Summary ─────────────────────────────────────────

  describe("airtable_table_summary", () => {
    it("should return table summary with schema and sample records", async () => {
      mockClient.getTableSchema.mockResolvedValue({
        id: "tblAAA",
        name: "Tasks",
        fields: [
          { id: "fld1", name: "Title", type: "singleLineText" },
          { id: "fld2", name: "Status", type: "singleSelect" },
        ],
        primaryFieldId: "fld1",
      });
      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Title: "Fix bug", Status: "Active" }, createdTime: "2026-01-01T00:00:00.000Z" },
          { id: "rec002", fields: { Title: "Add feature", Status: "Done" }, createdTime: "2026-01-02T00:00:00.000Z" },
        ],
      });

      const handler = mockServer.getHandler("airtable_table_summary");
      const result = await handler({ table: "Tasks" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.table_name).toBe("Tasks");
      expect(parsed.total_records).toBe(2);
      expect(parsed.fields).toHaveLength(2);
      expect(parsed.fields[0]).toEqual({ name: "Title", type: "singleLineText" });
      expect(parsed.sample_records).toHaveLength(2);
    });

    it("should use table name as fallback when schema is null", async () => {
      mockClient.getTableSchema.mockResolvedValue(null);
      mockClient.listRecords.mockResolvedValue({ records: [] });

      const handler = mockServer.getHandler("airtable_table_summary");
      const result = await handler({ table: "Unknown" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.table_name).toBe("Unknown");
      expect(parsed.fields).toEqual([]);
      expect(parsed.total_records).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      mockClient.getTableSchema.mockRejectedValue(new Error("API failure"));

      const handler = mockServer.getHandler("airtable_table_summary");
      const result = await handler({ table: "Tasks" });

      expect(result.isError).toBe(true);
    });
  });
});

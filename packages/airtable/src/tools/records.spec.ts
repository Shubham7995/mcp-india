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

describe("Airtable Record Tools — BDD", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerRecordTools(mockServer as any, mockClient as any);
  });

  // ── List Records ──────────────────────────────────────────

  describe("airtable_list_records", () => {
    it("should return records from the table given a valid table name", async () => {
      // Given: Airtable has records in the Projects table
      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Name: "Project Alpha", Status: "Active" }, createdTime: "2026-01-15T10:00:00.000Z" },
          { id: "rec002", fields: { Name: "Project Beta", Status: "Done" }, createdTime: "2026-01-16T10:00:00.000Z" },
        ],
      });

      // When: the tool is invoked with a table name
      const handler = mockServer.getHandler("airtable_list_records");
      const result = await handler({ table: "Projects", max_records: 100 });
      const parsed = JSON.parse(result.content[0].text);

      // Then: response contains records with fields
      expect(parsed.records).toHaveLength(2);
      expect(parsed.records[0].fields.Name).toBe("Project Alpha");
      expect(parsed.records[1].fields.Status).toBe("Done");
    });

    it("should filter records given an Airtable formula", async () => {
      // Given: Airtable has active and done records
      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec001", fields: { Name: "Task A", Status: "Active" }, createdTime: "2026-01-15T10:00:00.000Z" },
        ],
      });

      // When: the tool is invoked with a filter formula
      const handler = mockServer.getHandler("airtable_list_records");
      const result = await handler({
        table: "Tasks",
        filter: "{Status} = 'Active'",
        max_records: 100,
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: only matching records are returned
      expect(parsed.records).toHaveLength(1);
      expect(parsed.records[0].fields.Status).toBe("Active");
    });

    it("should return paginated results given an offset token", async () => {
      // Given: Airtable returns a page with an offset for more records
      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec003", fields: { Name: "Page 2 Item" }, createdTime: "2026-01-15T10:00:00.000Z" },
        ],
        offset: "itr_next_page_token",
      });

      // When: the tool is invoked with an offset
      const handler = mockServer.getHandler("airtable_list_records");
      const result = await handler({
        table: "Tasks",
        offset: "itr_prev_token",
        max_records: 100,
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: records and next offset are returned
      expect(parsed.records).toHaveLength(1);
      expect(parsed.offset).toBe("itr_next_page_token");
    });
  });

  // ── Get Record ────────────────────────────────────────────

  describe("airtable_get_record", () => {
    it("should return a full record given a valid record ID", async () => {
      // Given: a record exists with ID rec001
      mockClient.getRecord.mockResolvedValue({
        id: "rec001",
        fields: { Name: "Alice", Email: "alice@test.com", Phone: "+1-555-0100" },
        createdTime: "2026-01-10T08:00:00.000Z",
      });

      // When: the tool is invoked with the record ID
      const handler = mockServer.getHandler("airtable_get_record");
      const result = await handler({ table: "Contacts", record_id: "rec001" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: the full record with all fields is returned
      expect(parsed.id).toBe("rec001");
      expect(parsed.fields.Name).toBe("Alice");
      expect(parsed.fields.Email).toBe("alice@test.com");
      expect(parsed.createdTime).toBeDefined();
    });

    it("should use base_id override given a different base", async () => {
      // Given: a record exists in a different base
      mockClient.getRecord.mockResolvedValue({
        id: "rec005",
        fields: { Title: "External Item" },
        createdTime: "2026-02-01T00:00:00.000Z",
      });

      // When: the tool is invoked with a base_id override
      const handler = mockServer.getHandler("airtable_get_record");
      await handler({ table: "Items", record_id: "rec005", base_id: "appEXTERNAL" });

      // Then: the client receives the overridden base ID
      expect(mockClient.getRecord).toHaveBeenCalledWith(
        expect.objectContaining({ baseId: "appEXTERNAL" }),
      );
    });
  });

  // ── Create Record ─────────────────────────────────────────

  describe("airtable_create_record", () => {
    it("should create a record given field values", async () => {
      // Given: the table accepts new records
      mockClient.createRecord.mockResolvedValue({
        id: "recNEW",
        fields: { Name: "New Contact", Status: "Lead" },
        createdTime: "2026-03-01T12:00:00.000Z",
      });

      // When: the tool is invoked with field values
      const handler = mockServer.getHandler("airtable_create_record");
      const result = await handler({
        table: "Contacts",
        fields: { Name: "New Contact", Status: "Lead" },
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: the created record is returned with an ID
      expect(parsed.id).toBe("recNEW");
      expect(parsed.fields.Name).toBe("New Contact");
    });
  });

  // ── Update Record ─────────────────────────────────────────

  describe("airtable_update_record", () => {
    it("should update specific fields given a record ID and new values", async () => {
      // Given: a record exists with Status = "Active"
      mockClient.updateRecord.mockResolvedValue({
        id: "rec001",
        fields: { Name: "Alice", Status: "Closed" },
        createdTime: "2026-01-10T08:00:00.000Z",
      });

      // When: the tool is invoked to update the Status
      const handler = mockServer.getHandler("airtable_update_record");
      const result = await handler({
        table: "Contacts",
        record_id: "rec001",
        fields: { Status: "Closed" },
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: the updated record reflects the new status
      expect(parsed.fields.Status).toBe("Closed");
    });
  });

  // ── Delete Record ─────────────────────────────────────────

  describe("airtable_delete_record", () => {
    it("should confirm deletion given a valid record ID", async () => {
      // Given: a record exists to be deleted
      mockClient.deleteRecord.mockResolvedValue({
        id: "rec001",
        deleted: true,
      });

      // When: the tool is invoked to delete the record
      const handler = mockServer.getHandler("airtable_delete_record");
      const result = await handler({ table: "Tasks", record_id: "rec001" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: the response confirms deletion
      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe("rec001");
    });
  });

  // ── Search Records ────────────────────────────────────────

  describe("airtable_search_records", () => {
    it("should return matching records given a formula search", async () => {
      // Given: Airtable has records matching the formula
      mockClient.listRecords.mockResolvedValue({
        records: [
          { id: "rec010", fields: { Email: "team@acme.com", Name: "ACME Corp" }, createdTime: "2026-02-01T00:00:00.000Z" },
        ],
      });

      // When: the tool is invoked with a formula search
      const handler = mockServer.getHandler("airtable_search_records");
      const result = await handler({
        table: "Companies",
        formula: "FIND('acme', LOWER({Email}))",
        max_records: 100,
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: matching records are returned
      expect(parsed.records).toHaveLength(1);
      expect(parsed.records[0].fields.Email).toBe("team@acme.com");
    });

    it("should return empty results given a formula with no matches", async () => {
      // Given: no records match the formula
      mockClient.listRecords.mockResolvedValue({ records: [] });

      // When: the tool is invoked with a non-matching formula
      const handler = mockServer.getHandler("airtable_search_records");
      const result = await handler({
        table: "Contacts",
        formula: "{Email} = 'nonexistent@test.com'",
        max_records: 100,
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: empty records array is returned
      expect(parsed.records).toHaveLength(0);
    });
  });
});

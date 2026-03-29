import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AirtableClient } from "../client.js";
import { registerSchemaTools } from "./schema.js";

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

describe("Airtable Schema Tools — BDD", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerSchemaTools(mockServer as any, mockClient as any);
  });

  // ── List Bases ────────────────────────────────────────────

  describe("airtable_list_bases", () => {
    it("should return all accessible bases given valid credentials", async () => {
      // Given: the user has access to multiple Airtable bases
      mockClient.listBases.mockResolvedValue({
        bases: [
          { id: "appAAA", name: "Sales CRM", permissionLevel: "create" },
          { id: "appBBB", name: "Product Roadmap", permissionLevel: "edit" },
          { id: "appCCC", name: "HR Tracker", permissionLevel: "read" },
        ],
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("airtable_list_bases");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      // Then: all bases with their IDs and permission levels are returned
      expect(parsed.bases).toHaveLength(3);
      expect(parsed.bases[0].id).toBe("appAAA");
      expect(parsed.bases[2].permissionLevel).toBe("read");
    });
  });

  // ── List Tables ───────────────────────────────────────────

  describe("airtable_list_tables", () => {
    it("should return table summaries with field counts given a base", async () => {
      // Given: a base has multiple tables with fields
      mockClient.listTables.mockResolvedValue({
        tables: [
          {
            id: "tbl001",
            name: "Contacts",
            description: "Company contacts",
            fields: [
              { id: "fld1", name: "Name", type: "singleLineText" },
              { id: "fld2", name: "Email", type: "email" },
              { id: "fld3", name: "Phone", type: "phoneNumber" },
            ],
            primaryFieldId: "fld1",
          },
          {
            id: "tbl002",
            name: "Deals",
            description: "Sales pipeline",
            fields: [
              { id: "fld4", name: "Deal Name", type: "singleLineText" },
              { id: "fld5", name: "Amount", type: "currency" },
            ],
            primaryFieldId: "fld4",
          },
        ],
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("airtable_list_tables");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      // Then: each table shows name, ID, and field count
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("Contacts");
      expect(parsed[0].field_count).toBe(3);
      expect(parsed[1].name).toBe("Deals");
      expect(parsed[1].field_count).toBe(2);
    });
  });

  // ── Get Table Schema ──────────────────────────────────────

  describe("airtable_get_table_schema", () => {
    it("should return full field definitions given a valid table name", async () => {
      // Given: a table has fields with various types and options
      mockClient.getTableSchema.mockResolvedValue({
        id: "tbl001",
        name: "Contacts",
        description: "Company contacts",
        fields: [
          { id: "fld1", name: "Name", type: "singleLineText" },
          { id: "fld2", name: "Email", type: "email" },
          {
            id: "fld3",
            name: "Priority",
            type: "singleSelect",
            options: {
              choices: [
                { id: "opt1", name: "High", color: "red" },
                { id: "opt2", name: "Medium", color: "yellow" },
                { id: "opt3", name: "Low", color: "green" },
              ],
            },
          },
        ],
        primaryFieldId: "fld1",
      });

      // When: the tool is invoked for a table
      const handler = mockServer.getHandler("airtable_get_table_schema");
      const result = await handler({ table: "Contacts" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: full field definitions including options are returned
      expect(parsed.fields).toHaveLength(3);
      expect(parsed.fields[0].type).toBe("singleLineText");
      expect(parsed.fields[2].options.choices).toHaveLength(3);
      expect(parsed.fields[2].options.choices[0].name).toBe("High");
    });

    it("should return an error given a non-existent table name", async () => {
      // Given: no table matches the name
      mockClient.getTableSchema.mockResolvedValue(null);

      // When: the tool is invoked with a non-existent table
      const handler = mockServer.getHandler("airtable_get_table_schema");
      const result = await handler({ table: "MissingTable" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: an error message mentions the table name
      expect(parsed.error).toContain("MissingTable");
    });
  });
});

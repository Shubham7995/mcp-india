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

describe("Schema Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerSchemaTools(mockServer as any, mockClient as any);
  });

  it("should register 3 schema tools", () => {
    const tools = mockServer.getRegisteredTools();
    expect(tools).toHaveLength(3);
    expect(tools).toContain("airtable_list_bases");
    expect(tools).toContain("airtable_list_tables");
    expect(tools).toContain("airtable_get_table_schema");
  });

  // ── List Bases ────────────────────────────────────────────

  describe("airtable_list_bases", () => {
    it("should return list of accessible bases", async () => {
      mockClient.listBases.mockResolvedValue({
        bases: [
          { id: "appABC123", name: "CRM Base", permissionLevel: "create" },
          { id: "appDEF456", name: "Projects Base", permissionLevel: "edit" },
        ],
      });

      const handler = mockServer.getHandler("airtable_list_bases");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.bases).toHaveLength(2);
      expect(parsed.bases[0].id).toBe("appABC123");
      expect(parsed.bases[1].name).toBe("Projects Base");
    });

    it("should handle errors gracefully", async () => {
      mockClient.listBases.mockRejectedValue(new Error("Auth failed"));

      const handler = mockServer.getHandler("airtable_list_bases");
      const result = await handler({});

      expect(result.isError).toBe(true);
    });
  });

  // ── List Tables ───────────────────────────────────────────

  describe("airtable_list_tables", () => {
    it("should return table summaries with field counts", async () => {
      mockClient.listTables.mockResolvedValue({
        tables: [
          {
            id: "tblAAA",
            name: "Contacts",
            description: "All contacts",
            fields: [
              { id: "fld1", name: "Name", type: "singleLineText" },
              { id: "fld2", name: "Email", type: "email" },
            ],
            primaryFieldId: "fld1",
          },
          {
            id: "tblBBB",
            name: "Tasks",
            description: null,
            fields: [
              { id: "fld3", name: "Title", type: "singleLineText" },
            ],
            primaryFieldId: "fld3",
          },
        ],
      });

      const handler = mockServer.getHandler("airtable_list_tables");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("Contacts");
      expect(parsed[0].field_count).toBe(2);
      expect(parsed[1].field_count).toBe(1);
      expect(parsed[0].primary_field_id).toBe("fld1");
    });

    it("should pass base_id override to client", async () => {
      mockClient.listTables.mockResolvedValue({ tables: [] });

      const handler = mockServer.getHandler("airtable_list_tables");
      await handler({ base_id: "appOTHER" });

      expect(mockClient.listTables).toHaveBeenCalledWith("appOTHER");
    });
  });

  // ── Get Table Schema ──────────────────────────────────────

  describe("airtable_get_table_schema", () => {
    it("should return full field definitions", async () => {
      mockClient.getTableSchema.mockResolvedValue({
        id: "tblAAA",
        name: "Contacts",
        description: "All contacts",
        fields: [
          { id: "fld1", name: "Name", type: "singleLineText" },
          { id: "fld2", name: "Email", type: "email" },
          {
            id: "fld3",
            name: "Status",
            type: "singleSelect",
            options: {
              choices: [
                { id: "opt1", name: "Active", color: "green" },
                { id: "opt2", name: "Inactive", color: "red" },
              ],
            },
          },
        ],
        primaryFieldId: "fld1",
      });

      const handler = mockServer.getHandler("airtable_get_table_schema");
      const result = await handler({ table: "Contacts" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.name).toBe("Contacts");
      expect(parsed.fields).toHaveLength(3);
      expect(parsed.fields[2].type).toBe("singleSelect");
      expect(parsed.fields[2].options.choices).toHaveLength(2);
    });

    it("should return error message when table not found", async () => {
      mockClient.getTableSchema.mockResolvedValue(null);

      const handler = mockServer.getHandler("airtable_get_table_schema");
      const result = await handler({ table: "NonExistent" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("NonExistent");
    });

    it("should handle client errors", async () => {
      mockClient.getTableSchema.mockRejectedValue(new Error("Network error"));

      const handler = mockServer.getHandler("airtable_get_table_schema");
      const result = await handler({ table: "Contacts" });

      expect(result.isError).toBe(true);
    });
  });
});

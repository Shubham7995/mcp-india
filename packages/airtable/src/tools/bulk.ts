/**
 * Airtable bulk operation tools.
 * Tools: airtable_bulk_create, airtable_bulk_update,
 *        airtable_table_summary
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AirtableClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";
import type { TableSummary } from "../types.js";

export function registerBulkTools(
  server: McpServer,
  client: AirtableClient,
): void {
  // ── Bulk Create ────────────────────────────────────────────
  server.tool(
    "airtable_bulk_create",
    "Create up to 10 records at once in an Airtable table",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      records: z
        .array(
          z.object({
            fields: z.record(z.unknown()),
          }),
        )
        .describe("Array of records to create (max 10). Each has a 'fields' object."),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
    },
    async ({ table, records, base_id }) => {
      try {
        const result = await client.bulkCreate({
          table,
          records: records as Array<{ fields: Record<string, unknown> }>,
          baseId: base_id,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Bulk Update ────────────────────────────────────────────
  server.tool(
    "airtable_bulk_update",
    "Update up to 10 records at once in an Airtable table",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      records: z
        .array(
          z.object({
            id: z.string(),
            fields: z.record(z.unknown()),
          }),
        )
        .describe("Array of records to update (max 10). Each has 'id' and 'fields'."),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
    },
    async ({ table, records, base_id }) => {
      try {
        const result = await client.bulkUpdate({
          table,
          records: records as Array<{ id: string; fields: Record<string, unknown> }>,
          baseId: base_id,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Table Summary ──────────────────────────────────────────
  server.tool(
    "airtable_table_summary",
    "Get a summary of an Airtable table: record count, field types, and a few sample records",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
    },
    async ({ table, base_id }) => {
      try {
        const [schema, records] = await Promise.all([
          client.getTableSchema(table, base_id),
          client.listRecords({ table, baseId: base_id, maxRecords: 5 }),
        ]);

        const summary: TableSummary = {
          table_name: schema?.name ?? table,
          total_records: records.records.length,
          fields: schema
            ? schema.fields.map((f) => ({ name: f.name, type: f.type }))
            : [],
          sample_records: records.records,
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(summary, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

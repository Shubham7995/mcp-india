/**
 * Airtable schema tools.
 * Tools: airtable_list_bases, airtable_list_tables,
 *        airtable_get_table_schema
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AirtableClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

export function registerSchemaTools(
  server: McpServer,
  client: AirtableClient,
): void {
  // ── List Bases ─────────────────────────────────────────────
  server.tool(
    "airtable_list_bases",
    "List all accessible Airtable bases with their IDs and names",
    {},
    async () => {
      try {
        const bases = await client.listBases();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(bases, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── List Tables ────────────────────────────────────────────
  server.tool(
    "airtable_list_tables",
    "List all tables in an Airtable base with field counts",
    {
      base_id: z
        .string()
        .optional()
        .describe("Base ID (default: AIRTABLE_BASE_ID env)"),
    },
    async ({ base_id }) => {
      try {
        const tables = await client.listTables(base_id);
        const summary = tables.tables.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          field_count: t.fields.length,
          primary_field_id: t.primaryFieldId,
        }));
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

  // ── Get Table Schema ───────────────────────────────────────
  server.tool(
    "airtable_get_table_schema",
    "Get full field definitions for an Airtable table (name, type, options)",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID (default: AIRTABLE_BASE_ID env)"),
    },
    async ({ table, base_id }) => {
      try {
        const schema = await client.getTableSchema(table, base_id);
        if (!schema) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: `Table "${table}" not found` }) },
            ],
          };
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(schema, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

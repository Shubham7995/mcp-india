/**
 * Airtable record tools.
 * Tools: airtable_list_records, airtable_get_record,
 *        airtable_create_record, airtable_update_record,
 *        airtable_delete_record, airtable_search_records
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AirtableClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

export function registerRecordTools(
  server: McpServer,
  client: AirtableClient,
): void {
  // ── List Records ───────────────────────────────────────────
  server.tool(
    "airtable_list_records",
    "List records from an Airtable table with optional view, sort, and filter formula",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override (default: AIRTABLE_BASE_ID env)"),
      view: z
        .string()
        .optional()
        .describe("View name or ID"),
      sort: z
        .array(
          z.object({
            field: z.string(),
            direction: z.enum(["asc", "desc"]),
          }),
        )
        .optional()
        .describe("Sort fields"),
      filter: z
        .string()
        .optional()
        .describe("Airtable formula filter (e.g. {Status} = 'Active')"),
      max_records: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum records to return (default: 100)"),
      offset: z
        .string()
        .optional()
        .describe("Pagination offset from previous response"),
    },
    async ({ table, base_id, view, sort, filter, max_records, offset }) => {
      try {
        const records = await client.listRecords({
          table,
          baseId: base_id,
          view,
          sort,
          filterByFormula: filter,
          maxRecords: max_records,
          offset,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(records, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Get Record ─────────────────────────────────────────────
  server.tool(
    "airtable_get_record",
    "Get a specific Airtable record by its ID",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      record_id: z
        .string()
        .describe("Record ID (starts with 'rec')"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
    },
    async ({ table, record_id, base_id }) => {
      try {
        const record = await client.getRecord({
          table,
          recordId: record_id,
          baseId: base_id,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(record, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Record ──────────────────────────────────────────
  server.tool(
    "airtable_create_record",
    "Create a new record in an Airtable table with field values",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      fields: z
        .record(z.unknown())
        .describe("Field values (e.g. { 'Name': 'Alice', 'Email': 'alice@test.com' })"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
    },
    async ({ table, fields, base_id }) => {
      try {
        const record = await client.createRecord({
          table,
          fields: fields as Record<string, unknown>,
          baseId: base_id,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(record, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Update Record ──────────────────────────────────────────
  server.tool(
    "airtable_update_record",
    "Update fields on an existing Airtable record",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      record_id: z
        .string()
        .describe("Record ID (starts with 'rec')"),
      fields: z
        .record(z.unknown())
        .describe("Fields to update (e.g. { 'Status': 'Done' })"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
    },
    async ({ table, record_id, fields, base_id }) => {
      try {
        const record = await client.updateRecord({
          table,
          recordId: record_id,
          fields: fields as Record<string, unknown>,
          baseId: base_id,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(record, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Delete Record ──────────────────────────────────────────
  server.tool(
    "airtable_delete_record",
    "Delete an Airtable record by its ID",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      record_id: z
        .string()
        .describe("Record ID to delete (starts with 'rec')"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
    },
    async ({ table, record_id, base_id }) => {
      try {
        const result = await client.deleteRecord({
          table,
          recordId: record_id,
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

  // ── Search Records ─────────────────────────────────────────
  server.tool(
    "airtable_search_records",
    "Search Airtable records using a formula filter. Formula examples: {Email} = 'test@example.com', FIND('alice', LOWER({Name}))",
    {
      table: z
        .string()
        .describe("Table name or ID"),
      formula: z
        .string()
        .describe("Airtable formula (e.g. {Email} = 'test@example.com')"),
      base_id: z
        .string()
        .optional()
        .describe("Base ID override"),
      max_records: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum records to return"),
    },
    async ({ table, formula, base_id, max_records }) => {
      try {
        const records = await client.listRecords({
          table,
          baseId: base_id,
          filterByFormula: formula,
          maxRecords: max_records,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(records, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

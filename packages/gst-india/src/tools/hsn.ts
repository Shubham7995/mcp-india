import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatToolError, ApiNotFoundError } from "@mcp-india/shared";
import { HSN_CODES, searchHsnCodes } from "../data/hsn-codes.js";
import { SAC_CODES, searchSacCodes } from "../data/sac-codes.js";
import { GST_RATE_SLABS } from "../data/gst-rates.js";

export function registerHsnTools(server: McpServer): void {
  // Tool 7: gst_search_hsn
  server.tool(
    "gst_search_hsn",
    "Search HSN (goods) and SAC (services) codes by keyword or partial code number. Returns up to 20 matching entries with descriptions and GST rates. HSN codes classify goods, SAC codes classify services.",
    { query: z.string().min(2).describe("Search keyword (e.g. 'laptop', 'rice') or partial code (e.g. '8471', '9983')") },
    async ({ query }) => {
      try {
        const hsnResults = searchHsnCodes(query);
        const sacResults = searchSacCodes(query);

        // Merge and cap at 20
        const combined = [...hsnResults, ...sacResults].slice(0, 20);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ query, result_count: combined.length, results: combined }, null, 2),
          }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // Tool 8: gst_get_hsn_details
  server.tool(
    "gst_get_hsn_details",
    "Get full details for a specific HSN or SAC code — description, GST rate, chapter/group, and schedule. Use exact code (e.g. '8471' for computers, '9983' for professional services).",
    { code: z.string().describe("Exact HSN or SAC code to look up") },
    async ({ code }) => {
      try {
        const trimmed = code.trim();

        // Search HSN codes first
        const hsnMatch = HSN_CODES.find((h) => h.code === trimmed);
        if (hsnMatch) {
          return { content: [{ type: "text" as const, text: JSON.stringify(hsnMatch, null, 2) }] };
        }

        // Then SAC codes
        const sacMatch = SAC_CODES.find((s) => s.code === trimmed);
        if (sacMatch) {
          return { content: [{ type: "text" as const, text: JSON.stringify(sacMatch, null, 2) }] };
        }

        throw new ApiNotFoundError("HSN/SAC code", trimmed);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // Tool 9: gst_list_rate_slabs
  server.tool(
    "gst_list_rate_slabs",
    "List all GST rate slabs (0%, 5%, 12%, 18%, 28%, and special 3%) with descriptions and example product/service categories for each slab.",
    {},
    async () => {
      try {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ slabs: GST_RATE_SLABS }, null, 2),
          }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

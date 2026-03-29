/**
 * HubSpot deal tools.
 * Tools: hubspot_search_deals, hubspot_get_deal,
 *        hubspot_create_deal, hubspot_update_deal
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HubSpotClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

const DEFAULT_DEAL_PROPS = [
  "dealname", "amount", "dealstage", "pipeline",
  "closedate", "hubspot_owner_id",
];

export function registerDealTools(
  server: McpServer,
  client: HubSpotClient,
): void {
  // ── Search Deals ───────────────────────────────────────────
  server.tool(
    "hubspot_search_deals",
    "Search HubSpot deals by name, stage, or pipeline",
    {
      query: z
        .string()
        .describe("Search query (e.g. 'Enterprise renewal' or deal name)"),
      properties: z
        .array(z.string())
        .optional()
        .describe("Properties to return (default: dealname, amount, dealstage, pipeline, closedate)"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
      after: z
        .string()
        .optional()
        .describe("Cursor for pagination"),
    },
    async ({ query, properties, limit, after }) => {
      try {
        const results = await client.searchDeals(
          query,
          properties ?? DEFAULT_DEAL_PROPS,
          limit,
          after,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(results, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Get Deal ───────────────────────────────────────────────
  server.tool(
    "hubspot_get_deal",
    "Get a specific HubSpot deal by ID with selected properties",
    {
      deal_id: z
        .string()
        .describe("HubSpot deal ID"),
      properties: z
        .array(z.string())
        .optional()
        .describe("Properties to return (default: dealname, amount, dealstage, pipeline, closedate)"),
    },
    async ({ deal_id, properties }) => {
      try {
        const deal = await client.getDeal(
          deal_id,
          properties ?? DEFAULT_DEAL_PROPS,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(deal, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Deal ────────────────────────────────────────────
  server.tool(
    "hubspot_create_deal",
    "Create a new HubSpot deal. Provide dealname and optionally amount, pipeline, and stage.",
    {
      dealname: z
        .string()
        .describe("Deal name"),
      amount: z
        .string()
        .optional()
        .describe("Deal amount as string (e.g. '50000')"),
      pipeline: z
        .string()
        .optional()
        .describe("Pipeline ID (default pipeline used if omitted)"),
      dealstage: z
        .string()
        .optional()
        .describe("Stage ID within the pipeline"),
      closedate: z
        .string()
        .optional()
        .describe("Expected close date (ISO string, e.g. 2026-06-30)"),
    },
    async ({ dealname, amount, pipeline, dealstage, closedate }) => {
      try {
        const properties: Record<string, string> = { dealname };
        if (amount) properties.amount = amount;
        if (pipeline) properties.pipeline = pipeline;
        if (dealstage) properties.dealstage = dealstage;
        if (closedate) properties.closedate = closedate;

        const deal = await client.createDeal(properties);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(deal, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Update Deal ────────────────────────────────────────────
  server.tool(
    "hubspot_update_deal",
    "Update properties on an existing HubSpot deal (including moving to a different stage)",
    {
      deal_id: z
        .string()
        .describe("HubSpot deal ID to update"),
      properties: z
        .record(z.string())
        .describe("Properties to update (e.g. { dealstage: 'closedwon', amount: '75000' })"),
    },
    async ({ deal_id, properties }) => {
      try {
        const deal = await client.updateDeal(deal_id, properties);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(deal, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

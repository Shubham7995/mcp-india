/**
 * Zoho CRM deal tools.
 * Tools: zoho_list_deals, zoho_create_deal,
 *        zoho_update_deal_stage, zoho_get_deal
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZohoCrmClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

export function registerDealTools(
  server: McpServer,
  client: ZohoCrmClient,
): void {
  // ── List Deals ─────────────────────────────────────────────
  server.tool(
    "zoho_list_deals",
    "List Zoho CRM deals with optional sorting and pagination",
    {
      sort_by: z.string().optional().describe("Field to sort by (e.g. 'Amount', 'Closing_Date')"),
      sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      page: z.number().optional().describe("Page number (1-indexed)"),
      per_page: z.number().optional().describe("Results per page (max 200)"),
    },
    async ({ sort_by, sort_order, page, per_page }) => {
      try {
        const deals = await client.listDeals({ sort_by, sort_order, page, per_page });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(deals, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Deal ────────────────────────────────────────────
  server.tool(
    "zoho_create_deal",
    "Create a new deal in Zoho CRM",
    {
      deal_name: z.string().describe("Deal name (required)"),
      stage: z.string().describe("Deal stage (e.g. 'Qualification', 'Proposal/Price Quote')"),
      amount: z.number().optional().describe("Deal amount"),
      closing_date: z.string().optional().describe("Expected closing date (YYYY-MM-DD)"),
      account_id: z.string().optional().describe("Associated account ID"),
      contact_id: z.string().optional().describe("Associated contact ID"),
    },
    async ({ deal_name, stage, amount, closing_date, account_id, contact_id }) => {
      try {
        const fields: Record<string, unknown> = {
          Deal_Name: deal_name,
          Stage: stage,
        };
        if (amount !== undefined) fields.Amount = amount;
        if (closing_date) fields.Closing_Date = closing_date;
        if (account_id) fields.Account_Name = account_id;
        if (contact_id) fields.Contact_Name = contact_id;

        const result = await client.createDeal(fields);
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

  // ── Update Deal Stage ──────────────────────────────────────
  server.tool(
    "zoho_update_deal_stage",
    "Move a Zoho CRM deal to a new stage",
    {
      deal_id: z.string().describe("Zoho CRM deal ID"),
      stage: z.string().describe("New deal stage"),
    },
    async ({ deal_id, stage }) => {
      try {
        const result = await client.updateDeal(deal_id, { Stage: stage });
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

  // ── Get Deal ───────────────────────────────────────────────
  server.tool(
    "zoho_get_deal",
    "Get a Zoho CRM deal by ID",
    {
      deal_id: z.string().describe("Zoho CRM deal ID"),
    },
    async ({ deal_id }) => {
      try {
        const deal = await client.getDeal(deal_id);
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

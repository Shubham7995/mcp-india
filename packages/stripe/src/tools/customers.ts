/**
 * Stripe customer tools.
 * Tools: stripe_list_customers, stripe_get_customer,
 *        stripe_create_customer, stripe_search_customers
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StripeClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function registerCustomerTools(
  server: McpServer,
  client: StripeClient,
): void {
  // ── List Customers ──────────────────────────────────────────
  server.tool(
    "stripe_list_customers",
    "List Stripe customers with optional email and date filters",
    {
      email: z
        .string()
        .optional()
        .describe("Filter by exact email address"),
      from: z
        .string()
        .optional()
        .describe("Start date (ISO string)"),
      to: z
        .string()
        .optional()
        .describe("End date (ISO string)"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
      starting_after: z
        .string()
        .optional()
        .describe("Cursor for pagination"),
    },
    async ({ email, from, to, limit, starting_after }) => {
      try {
        const customers = await client.listCustomers({
          email,
          created_gte: from ? toUnixTimestamp(from) : undefined,
          created_lte: to ? toUnixTimestamp(to) : undefined,
          limit,
          starting_after,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(customers, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Get Customer ────────────────────────────────────────────
  server.tool(
    "stripe_get_customer",
    "Get details of a specific Stripe customer by their ID",
    {
      customer_id: z
        .string()
        .describe("Customer ID (e.g. cus_ABC123)"),
    },
    async ({ customer_id }) => {
      try {
        const customer = await client.getCustomer(customer_id);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(customer, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Customer ─────────────────────────────────────────
  server.tool(
    "stripe_create_customer",
    "Create a new Stripe customer",
    {
      email: z
        .string()
        .optional()
        .describe("Customer email address"),
      name: z
        .string()
        .optional()
        .describe("Customer full name"),
      metadata: z
        .record(z.string())
        .optional()
        .describe("Key-value pairs for additional info"),
    },
    async ({ email, name, metadata }) => {
      try {
        const customer = await client.createCustomer({
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
          ...(metadata ? { metadata } : {}),
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(customer, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Search Customers ────────────────────────────────────────
  server.tool(
    "stripe_search_customers",
    "Search Stripe customers using Stripe's Search API query syntax. Examples: email:'foo@example.com' or name:'Acme' or metadata['plan']:'premium'",
    {
      query: z
        .string()
        .describe("Stripe Search query (e.g. email:'foo@example.com' or name:'Acme Inc')"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
    },
    async ({ query, limit }) => {
      try {
        const results = await client.searchCustomers(query, limit);
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
}

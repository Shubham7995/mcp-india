/**
 * Stripe product and price tools.
 * Tools: stripe_list_products, stripe_create_product,
 *        stripe_list_prices, stripe_create_price
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StripeClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

export function registerProductTools(
  server: McpServer,
  client: StripeClient,
): void {
  // ── List Products ───────────────────────────────────────────
  server.tool(
    "stripe_list_products",
    "List Stripe products. Use the active filter to show only active or archived products.",
    {
      active: z
        .boolean()
        .optional()
        .describe("Filter by active status. Omit to show all."),
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
    async ({ active, limit, starting_after }) => {
      try {
        const products = await client.listProducts({
          active,
          limit,
          starting_after,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(products, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Product ──────────────────────────────────────────
  server.tool(
    "stripe_create_product",
    "Create a new Stripe product. Products need at least one Price to be used in payments or subscriptions.",
    {
      name: z
        .string()
        .describe("Product name (e.g. 'Pro Plan', 'T-Shirt')"),
      description: z
        .string()
        .optional()
        .describe("Product description"),
      metadata: z
        .record(z.string())
        .optional()
        .describe("Key-value pairs for additional info"),
    },
    async ({ name, description, metadata }) => {
      try {
        const product = await client.createProduct({
          name,
          ...(description ? { description } : {}),
          ...(metadata ? { metadata } : {}),
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(product, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── List Prices ─────────────────────────────────────────────
  server.tool(
    "stripe_list_prices",
    "List Stripe prices, optionally filtered by product. Prices define how much and how often to charge.",
    {
      product_id: z
        .string()
        .optional()
        .describe("Filter by product ID (e.g. prod_ABC123)"),
      active: z
        .boolean()
        .optional()
        .describe("Filter by active status"),
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
    async ({ product_id, active, limit, starting_after }) => {
      try {
        const prices = await client.listPrices({
          product: product_id,
          active,
          limit,
          starting_after,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(prices, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Price ────────────────────────────────────────────
  server.tool(
    "stripe_create_price",
    "Create a new Stripe price for a product. Amount is in cents (e.g. 2000 = $20.00). Add recurring_interval to make it a subscription price.",
    {
      unit_amount: z
        .number()
        .describe("Price amount in cents (e.g. 2000 = $20.00)"),
      currency: z
        .string()
        .optional()
        .default("usd")
        .describe("Three-letter ISO currency code (default: usd)"),
      product_id: z
        .string()
        .describe("Product ID this price belongs to (e.g. prod_ABC123)"),
      recurring_interval: z
        .enum(["day", "week", "month", "year"])
        .optional()
        .describe("Billing interval for recurring prices. Omit for one-time prices."),
      recurring_interval_count: z
        .number()
        .optional()
        .default(1)
        .describe("Number of intervals between billings (default: 1)"),
    },
    async ({ unit_amount, currency, product_id, recurring_interval, recurring_interval_count }) => {
      try {
        const price = await client.createPrice({
          unit_amount,
          currency,
          product: product_id,
          ...(recurring_interval ? { recurring_interval } : {}),
          ...(recurring_interval && recurring_interval_count !== undefined
            ? { recurring_interval_count }
            : {}),
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(price, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

/**
 * Razorpay order tools.
 * Tools: razorpay_create_order, razorpay_list_orders, razorpay_fetch_order
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RazorpayClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function registerOrderTools(
  server: McpServer,
  client: RazorpayClient,
): void {
  // ── Create Order ────────────────────────────────────────────
  server.tool(
    "razorpay_create_order",
    "Create a new Razorpay order. Amount is in paisa (e.g. 50000 = ₹500)",
    {
      amount: z
        .number()
        .describe("Order amount in paisa (e.g. 50000 = ₹500)"),
      currency: z
        .string()
        .optional()
        .default("INR")
        .describe("Currency code (default: INR)"),
      receipt: z
        .string()
        .optional()
        .describe("Your internal receipt/order ID"),
      notes: z
        .record(z.string())
        .optional()
        .describe("Key-value pairs for additional info"),
    },
    async ({ amount, currency, receipt, notes }) => {
      try {
        const order = await client.createOrder({
          amount,
          currency,
          ...(receipt ? { receipt } : {}),
          ...(notes ? { notes } : {}),
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(order, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── List Orders ─────────────────────────────────────────────
  server.tool(
    "razorpay_list_orders",
    "List Razorpay orders with optional date filters and pagination",
    {
      from: z.string().optional().describe("Start date (ISO string)"),
      to: z.string().optional().describe("End date (ISO string)"),
      count: z.number().optional().default(10).describe("Number of results (max 100)"),
      skip: z.number().optional().default(0).describe("Number to skip for pagination"),
    },
    async ({ from, to, count, skip }) => {
      try {
        const orders = await client.listOrders({
          from: from ? toUnixTimestamp(from) : undefined,
          to: to ? toUnixTimestamp(to) : undefined,
          count,
          skip,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(orders, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Fetch Order ─────────────────────────────────────────────
  server.tool(
    "razorpay_fetch_order",
    "Get details of a specific Razorpay order by its ID",
    {
      order_id: z.string().describe("Order ID (e.g. order_ABC123)"),
    },
    async ({ order_id }) => {
      try {
        const order = await client.fetchOrder(order_id);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(order, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

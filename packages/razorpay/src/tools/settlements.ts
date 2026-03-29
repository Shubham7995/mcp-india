/**
 * Razorpay settlement, subscription, invoice, and customer tools.
 * Tools: razorpay_list_settlements, razorpay_fetch_settlement,
 *        razorpay_list_subscriptions, razorpay_create_subscription, razorpay_cancel_subscription,
 *        razorpay_create_invoice, razorpay_list_invoices,
 *        razorpay_list_customers, razorpay_create_customer
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RazorpayClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function registerSettlementTools(
  server: McpServer,
  client: RazorpayClient,
): void {
  // ── Settlements ─────────────────────────────────────────────

  server.tool(
    "razorpay_list_settlements",
    "List Razorpay settlements with optional date filters and pagination",
    {
      from: z.string().optional().describe("Start date (ISO string)"),
      to: z.string().optional().describe("End date (ISO string)"),
      count: z.number().optional().default(10).describe("Number of results"),
      skip: z.number().optional().default(0).describe("Number to skip"),
    },
    async ({ from, to, count, skip }) => {
      try {
        const settlements = await client.listSettlements({
          from: from ? toUnixTimestamp(from) : undefined,
          to: to ? toUnixTimestamp(to) : undefined,
          count,
          skip,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(settlements, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "razorpay_fetch_settlement",
    "Get details of a specific Razorpay settlement by its ID",
    {
      settlement_id: z.string().describe("Settlement ID"),
    },
    async ({ settlement_id }) => {
      try {
        const settlement = await client.fetchSettlement(settlement_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(settlement, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Subscriptions ───────────────────────────────────────────

  server.tool(
    "razorpay_list_subscriptions",
    "List Razorpay subscriptions with optional filters and pagination",
    {
      from: z.string().optional().describe("Start date (ISO string)"),
      to: z.string().optional().describe("End date (ISO string)"),
      count: z.number().optional().default(10).describe("Number of results"),
      skip: z.number().optional().default(0).describe("Number to skip"),
    },
    async ({ from, to, count, skip }) => {
      try {
        const subscriptions = await client.listSubscriptions({
          from: from ? toUnixTimestamp(from) : undefined,
          to: to ? toUnixTimestamp(to) : undefined,
          count,
          skip,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(subscriptions, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "razorpay_create_subscription",
    "Create a new Razorpay subscription for a plan",
    {
      plan_id: z.string().describe("Plan ID to subscribe to"),
      total_count: z.number().describe("Total billing cycles"),
      quantity: z.number().optional().describe("Quantity (default: 1)"),
      notes: z.record(z.string()).optional().describe("Additional notes"),
    },
    async ({ plan_id, total_count, quantity, notes }) => {
      try {
        const subscription = await client.createSubscription({
          plan_id,
          total_count,
          ...(quantity !== undefined ? { quantity } : {}),
          ...(notes ? { notes } : {}),
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(subscription, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "razorpay_cancel_subscription",
    "Cancel a Razorpay subscription. Can cancel at cycle end or immediately.",
    {
      subscription_id: z.string().describe("Subscription ID to cancel"),
      cancel_at_cycle_end: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, cancels at end of current cycle (default: true)"),
    },
    async ({ subscription_id, cancel_at_cycle_end }) => {
      try {
        const subscription = await client.cancelSubscription(
          subscription_id,
          cancel_at_cycle_end,
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(subscription, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Invoices ────────────────────────────────────────────────

  server.tool(
    "razorpay_create_invoice",
    "Create a Razorpay invoice with line items",
    {
      customer_id: z.string().describe("Customer ID to invoice"),
      line_items: z
        .array(
          z.object({
            name: z.string().describe("Item name"),
            amount: z.number().describe("Amount in paisa"),
            currency: z.string().optional().default("INR").describe("Currency"),
            quantity: z.number().optional().default(1).describe("Quantity"),
          }),
        )
        .describe("Invoice line items"),
    },
    async ({ customer_id, line_items }) => {
      try {
        const invoice = await client.createInvoice({
          type: "invoice",
          customer_id,
          line_items,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(invoice, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "razorpay_list_invoices",
    "List Razorpay invoices with pagination",
    {
      count: z.number().optional().default(10).describe("Number of results"),
      skip: z.number().optional().default(0).describe("Number to skip"),
    },
    async ({ count, skip }) => {
      try {
        const invoices = await client.listInvoices({ count, skip });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(invoices, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Customers ───────────────────────────────────────────────

  server.tool(
    "razorpay_list_customers",
    "List Razorpay customers with pagination",
    {
      count: z.number().optional().default(10).describe("Number of results"),
      skip: z.number().optional().default(0).describe("Number to skip"),
    },
    async ({ count, skip }) => {
      try {
        const customers = await client.listCustomers({ count, skip });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(customers, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    "razorpay_create_customer",
    "Create a new Razorpay customer",
    {
      name: z.string().describe("Customer name"),
      email: z.string().describe("Customer email"),
      contact: z.string().describe("Customer phone (e.g. 9876543210)"),
      notes: z.record(z.string()).optional().describe("Additional notes"),
    },
    async ({ name, email, contact, notes }) => {
      try {
        const customer = await client.createCustomer({
          name,
          email,
          contact,
          ...(notes ? { notes } : {}),
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(customer, null, 2) }],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

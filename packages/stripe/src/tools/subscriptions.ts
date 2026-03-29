/**
 * Stripe subscription and invoice tools.
 * Tools: stripe_list_subscriptions, stripe_get_subscription,
 *        stripe_create_subscription, stripe_cancel_subscription,
 *        stripe_list_invoices, stripe_get_invoice
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StripeClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function registerSubscriptionTools(
  server: McpServer,
  client: StripeClient,
): void {
  // ── List Subscriptions ──────────────────────────────────────
  server.tool(
    "stripe_list_subscriptions",
    "List Stripe subscriptions with optional status and customer filters",
    {
      status: z
        .enum([
          "incomplete",
          "incomplete_expired",
          "trialing",
          "active",
          "past_due",
          "canceled",
          "unpaid",
          "paused",
          "all",
        ])
        .optional()
        .describe("Filter by subscription status"),
      customer_id: z
        .string()
        .optional()
        .describe("Filter by customer ID"),
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
    async ({ status, customer_id, limit, starting_after }) => {
      try {
        const subs = await client.listSubscriptions({
          status,
          customer: customer_id,
          limit,
          starting_after,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(subs, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Get Subscription ────────────────────────────────────────
  server.tool(
    "stripe_get_subscription",
    "Get details of a specific Stripe subscription by its ID",
    {
      subscription_id: z
        .string()
        .describe("Subscription ID (e.g. sub_ABC123)"),
    },
    async ({ subscription_id }) => {
      try {
        const sub = await client.getSubscription(subscription_id);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(sub, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Subscription ─────────────────────────────────────
  server.tool(
    "stripe_create_subscription",
    "Create a new Stripe subscription for a customer. Requires a Price ID (from a Product).",
    {
      customer_id: z
        .string()
        .describe("Customer ID (e.g. cus_ABC123)"),
      price_id: z
        .string()
        .describe("Price ID to subscribe to (e.g. price_ABC123)"),
      trial_period_days: z
        .number()
        .optional()
        .describe("Number of trial days before billing starts"),
      metadata: z
        .record(z.string())
        .optional()
        .describe("Key-value pairs for additional info"),
    },
    async ({ customer_id, price_id, trial_period_days, metadata }) => {
      try {
        const sub = await client.createSubscription({
          customer: customer_id,
          price_id,
          trial_period_days,
          metadata,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(sub, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Cancel Subscription ─────────────────────────────────────
  server.tool(
    "stripe_cancel_subscription",
    "Cancel a Stripe subscription. By default cancels at the end of the billing period.",
    {
      subscription_id: z
        .string()
        .describe("Subscription ID to cancel"),
      cancel_at_period_end: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, cancels at billing period end. If false, cancels immediately."),
    },
    async ({ subscription_id, cancel_at_period_end }) => {
      try {
        const sub = await client.cancelSubscription(
          subscription_id,
          cancel_at_period_end,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(sub, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── List Invoices ───────────────────────────────────────────
  server.tool(
    "stripe_list_invoices",
    "List Stripe invoices with optional customer, status, and date filters. Amounts are in cents.",
    {
      customer_id: z
        .string()
        .optional()
        .describe("Filter by customer ID"),
      status: z
        .enum(["draft", "open", "paid", "void", "uncollectible"])
        .optional()
        .describe("Filter by invoice status"),
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
    async ({ customer_id, status, from, to, limit, starting_after }) => {
      try {
        const invoices = await client.listInvoices({
          customer: customer_id,
          status,
          created_gte: from ? toUnixTimestamp(from) : undefined,
          created_lte: to ? toUnixTimestamp(to) : undefined,
          limit,
          starting_after,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(invoices, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Get Invoice ─────────────────────────────────────────────
  server.tool(
    "stripe_get_invoice",
    "Get details of a specific Stripe invoice by its ID",
    {
      invoice_id: z
        .string()
        .describe("Invoice ID (e.g. in_ABC123)"),
    },
    async ({ invoice_id }) => {
      try {
        const invoice = await client.getInvoice(invoice_id);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(invoice, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

/**
 * Stripe payment and refund tools.
 * Tools: stripe_list_payments, stripe_get_payment,
 *        stripe_create_payment, stripe_capture_payment,
 *        stripe_create_refund, stripe_list_refunds
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StripeClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function registerPaymentTools(
  server: McpServer,
  client: StripeClient,
): void {
  // ── List Payments ───────────────────────────────────────────
  server.tool(
    "stripe_list_payments",
    "List Stripe PaymentIntents with optional filters for date range, status, customer, and pagination. Amounts are in cents.",
    {
      from: z
        .string()
        .optional()
        .describe("Start date (ISO string, e.g. 2026-03-01)"),
      to: z
        .string()
        .optional()
        .describe("End date (ISO string, e.g. 2026-03-28)"),
      customer_id: z
        .string()
        .optional()
        .describe("Filter by customer ID (e.g. cus_ABC123)"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
      starting_after: z
        .string()
        .optional()
        .describe("Cursor for pagination — ID of last item from previous page"),
    },
    async ({ from, to, customer_id, limit, starting_after }) => {
      try {
        const payments = await client.listPayments({
          created_gte: from ? toUnixTimestamp(from) : undefined,
          created_lte: to ? toUnixTimestamp(to) : undefined,
          customer: customer_id,
          limit,
          starting_after,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(payments, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Get Payment ─────────────────────────────────────────────
  server.tool(
    "stripe_get_payment",
    "Get details of a specific Stripe PaymentIntent by its ID",
    {
      payment_intent_id: z
        .string()
        .describe("PaymentIntent ID (e.g. pi_ABC123)"),
    },
    async ({ payment_intent_id }) => {
      try {
        const payment = await client.getPayment(payment_intent_id);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(payment, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Payment ──────────────────────────────────────────
  server.tool(
    "stripe_create_payment",
    "Create a new Stripe PaymentIntent. Amount is in cents (e.g. 5000 = $50.00).",
    {
      amount: z
        .number()
        .describe("Amount in cents (e.g. 5000 = $50.00)"),
      currency: z
        .string()
        .optional()
        .default("usd")
        .describe("Three-letter ISO currency code (default: usd)"),
      customer_id: z
        .string()
        .optional()
        .describe("Customer ID to attach the payment to"),
      metadata: z
        .record(z.string())
        .optional()
        .describe("Key-value pairs for additional info"),
    },
    async ({ amount, currency, customer_id, metadata }) => {
      try {
        const payment = await client.createPayment({
          amount,
          currency,
          ...(customer_id ? { customer: customer_id } : {}),
          ...(metadata ? { metadata } : {}),
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(payment, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Capture Payment ─────────────────────────────────────────
  server.tool(
    "stripe_capture_payment",
    "Capture a Stripe PaymentIntent that was created with capture_method: 'manual'",
    {
      payment_intent_id: z
        .string()
        .describe("PaymentIntent ID to capture (e.g. pi_ABC123)"),
    },
    async ({ payment_intent_id }) => {
      try {
        const payment = await client.capturePayment(payment_intent_id);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(payment, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Refund ───────────────────────────────────────────
  server.tool(
    "stripe_create_refund",
    "Create a refund for a Stripe payment. Amount is in cents. Omit amount for a full refund.",
    {
      payment_intent_id: z
        .string()
        .describe("PaymentIntent ID to refund"),
      amount: z
        .number()
        .optional()
        .describe("Amount to refund in cents. Omit for full refund."),
      reason: z
        .enum(["duplicate", "fraudulent", "requested_by_customer"])
        .optional()
        .describe("Reason for the refund"),
    },
    async ({ payment_intent_id, amount, reason }) => {
      try {
        const refund = await client.createRefund({
          payment_intent: payment_intent_id,
          ...(amount !== undefined ? { amount } : {}),
          ...(reason ? { reason } : {}),
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(refund, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── List Refunds ────────────────────────────────────────────
  server.tool(
    "stripe_list_refunds",
    "List Stripe refunds with optional filters for payment, date range, and pagination",
    {
      payment_intent_id: z
        .string()
        .optional()
        .describe("Filter by PaymentIntent ID"),
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
    async ({ payment_intent_id, from, to, limit, starting_after }) => {
      try {
        const refunds = await client.listRefunds({
          payment_intent: payment_intent_id,
          created_gte: from ? toUnixTimestamp(from) : undefined,
          created_lte: to ? toUnixTimestamp(to) : undefined,
          limit,
          starting_after,
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(refunds, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

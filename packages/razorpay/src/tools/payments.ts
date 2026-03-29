/**
 * Razorpay payment and refund tools.
 * Tools: razorpay_list_payments, razorpay_fetch_payment,
 *        razorpay_capture_payment, razorpay_create_refund, razorpay_list_refunds
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RazorpayClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function registerPaymentTools(
  server: McpServer,
  client: RazorpayClient,
): void {
  // ── List Payments ───────────────────────────────────────────
  server.tool(
    "razorpay_list_payments",
    "List Razorpay payments with optional filters for date range, status, and pagination",
    {
      from: z
        .string()
        .optional()
        .describe("Start date (ISO string, e.g. 2026-03-01)"),
      to: z
        .string()
        .optional()
        .describe("End date (ISO string, e.g. 2026-03-28)"),
      count: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
      skip: z
        .number()
        .optional()
        .default(0)
        .describe("Number to skip for pagination"),
    },
    async ({ from, to, count, skip }) => {
      try {
        const payments = await client.listPayments({
          from: from ? toUnixTimestamp(from) : undefined,
          to: to ? toUnixTimestamp(to) : undefined,
          count,
          skip,
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

  // ── Fetch Payment ───────────────────────────────────────────
  server.tool(
    "razorpay_fetch_payment",
    "Get details of a specific Razorpay payment by its ID",
    {
      payment_id: z
        .string()
        .describe("Payment ID (e.g. pay_ABC123)"),
    },
    async ({ payment_id }) => {
      try {
        const payment = await client.fetchPayment(payment_id);
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
    "razorpay_capture_payment",
    "Capture an authorized Razorpay payment. Amount is in paisa (e.g. 50000 = ₹500)",
    {
      payment_id: z.string().describe("Payment ID to capture"),
      amount: z
        .number()
        .describe("Amount to capture in paisa (e.g. 50000 = ₹500)"),
      currency: z
        .string()
        .optional()
        .default("INR")
        .describe("Currency code (default: INR)"),
    },
    async ({ payment_id, amount, currency }) => {
      try {
        const payment = await client.capturePayment(
          payment_id,
          amount,
          currency,
        );
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
    "razorpay_create_refund",
    "Create a refund for a Razorpay payment. Omit amount for a full refund.",
    {
      payment_id: z.string().describe("Payment ID to refund"),
      amount: z
        .number()
        .optional()
        .describe(
          "Amount to refund in paisa. Omit for full refund.",
        ),
    },
    async ({ payment_id, amount }) => {
      try {
        const refund = await client.createRefund(payment_id, {
          ...(amount !== undefined ? { amount } : {}),
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
    "razorpay_list_refunds",
    "List Razorpay refunds with optional date filters and pagination",
    {
      from: z
        .string()
        .optional()
        .describe("Start date (ISO string)"),
      to: z
        .string()
        .optional()
        .describe("End date (ISO string)"),
      count: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
      skip: z
        .number()
        .optional()
        .default(0)
        .describe("Number to skip for pagination"),
    },
    async ({ from, to, count, skip }) => {
      try {
        const refunds = await client.listRefunds({
          from: from ? toUnixTimestamp(from) : undefined,
          to: to ? toUnixTimestamp(to) : undefined,
          count,
          skip,
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

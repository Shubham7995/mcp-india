/**
 * Razorpay dashboard summary tool.
 * Custom aggregation tool — not a direct API wrapper.
 * Tools: razorpay_dashboard_summary
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RazorpayClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";
import type { DashboardSummary, RazorpayPayment, RazorpayRefund } from "../types.js";

export function registerDashboardTools(
  server: McpServer,
  client: RazorpayClient,
): void {
  server.tool(
    "razorpay_dashboard_summary",
    "Get a summary of Razorpay activity for a date: total revenue, payment count, refunds, and net amount in INR",
    {
      date: z
        .string()
        .optional()
        .describe(
          "Date to summarize (ISO format, e.g. 2026-03-28). Defaults to today.",
        ),
    },
    async ({ date }) => {
      try {
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const fromTs = Math.floor(startOfDay.getTime() / 1000);
        const toTs = Math.floor(endOfDay.getTime() / 1000);

        const [payments, refunds] = await Promise.all([
          client.listPayments({ from: fromTs, to: toTs, count: 100 }),
          client.listRefunds({ from: fromTs, to: toTs, count: 100 }),
        ]);

        const capturedPayments = payments.items.filter(
          (p: RazorpayPayment) => p.status === "captured",
        );
        const failedPayments = payments.items.filter(
          (p: RazorpayPayment) => p.status === "failed",
        );

        const totalRevenue =
          capturedPayments.reduce(
            (sum: number, p: RazorpayPayment) => sum + p.amount,
            0,
          ) / 100;
        const totalRefunds =
          refunds.items.reduce(
            (sum: number, r: RazorpayRefund) => sum + r.amount,
            0,
          ) / 100;

        const year = startOfDay.getFullYear();
        const month = String(startOfDay.getMonth() + 1).padStart(2, "0");
        const day = String(startOfDay.getDate()).padStart(2, "0");

        const summary: DashboardSummary = {
          date: `${year}-${month}-${day}`,
          total_payments: payments.items.length,
          captured_payments: capturedPayments.length,
          failed_payments: failedPayments.length,
          total_revenue_inr: totalRevenue,
          total_refunds_inr: totalRefunds,
          net_revenue_inr: totalRevenue - totalRefunds,
          currency: "INR",
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(summary, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

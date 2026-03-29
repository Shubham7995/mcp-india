/**
 * Stripe dashboard summary tool.
 * Tool: stripe_dashboard_summary
 *
 * Aggregates payment and refund data for a given date — custom computation,
 * not a direct Stripe API endpoint.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StripeClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";
import type { DashboardSummary } from "../types.js";

export function registerDashboardTools(
  server: McpServer,
  client: StripeClient,
): void {
  server.tool(
    "stripe_dashboard_summary",
    "Get a summary of Stripe activity for a given date: total charges, successful/failed payments, revenue, refunds, and net amount. Amounts are in cents.",
    {
      date: z
        .string()
        .optional()
        .describe("Date to summarize (ISO format, e.g. 2026-03-28). Defaults to today."),
      currency: z
        .string()
        .optional()
        .default("usd")
        .describe("Currency to report in (default: usd)"),
    },
    async ({ date, currency }) => {
      try {
        // Parse with T00:00:00 (no Z) to avoid UTC-shift when given a date string
        const targetDate = date ? new Date(date + "T00:00:00") : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const fromTs = Math.floor(startOfDay.getTime() / 1000);
        const toTs = Math.floor(endOfDay.getTime() / 1000);

        const [payments, refunds] = await Promise.all([
          client.listPayments({
            created_gte: fromTs,
            created_lte: toTs,
            limit: 100,
          }),
          client.listRefunds({
            created_gte: fromTs,
            created_lte: toTs,
            limit: 100,
          }),
        ]);

        const totalPayments = payments.data.length;
        const successfulPayments = payments.data.filter(
          (p) => p.status === "succeeded",
        ).length;
        const failedPayments = payments.data.filter(
          (p) => p.status === "canceled",
        ).length;
        const totalRevenueCents = payments.data
          .filter((p) => p.status === "succeeded")
          .reduce((sum, p) => sum + p.amount, 0);
        const totalRefundsCents = refunds.data.reduce(
          (sum, r) => sum + (r.amount ?? 0),
          0,
        );

        // Format from local time to avoid UTC date shift
        const yyyy = startOfDay.getFullYear();
        const mm = String(startOfDay.getMonth() + 1).padStart(2, "0");
        const dd = String(startOfDay.getDate()).padStart(2, "0");

        const summary: DashboardSummary = {
          date: `${yyyy}-${mm}-${dd}`,
          total_payments: totalPayments,
          successful_payments: successfulPayments,
          failed_payments: failedPayments,
          total_revenue_cents: totalRevenueCents,
          total_refunds_cents: totalRefundsCents,
          net_revenue_cents: totalRevenueCents - totalRefundsCents,
          currency,
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

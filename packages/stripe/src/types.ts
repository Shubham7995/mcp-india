/**
 * Type definitions for @mcp-india/stripe.
 *
 * Most Stripe types come directly from the `stripe` npm SDK.
 * This file defines custom computed types (e.g. DashboardSummary)
 * that don't exist in the Stripe API.
 */

export interface DashboardSummary {
  date: string;
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  total_revenue_cents: number;
  total_refunds_cents: number;
  net_revenue_cents: number;
  currency: string;
}

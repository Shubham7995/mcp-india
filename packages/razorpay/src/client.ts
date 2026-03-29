/**
 * Razorpay API client wrapper.
 * All external API calls go through this module — tools never call fetch or
 * the Razorpay SDK directly.
 */

import Razorpay from "razorpay";
import { RateLimiter } from "@mcp-india/shared";
import type {
  RazorpayPayment,
  RazorpayOrder,
  RazorpayRefund,
  RazorpaySettlement,
  RazorpaySubscription,
  RazorpayInvoice,
  RazorpayCustomer,
  RazorpayCollection,
} from "./types.js";

export interface RazorpayClientConfig {
  keyId: string;
  keySecret: string;
}

export class RazorpayClient {
  private readonly sdk: InstanceType<typeof Razorpay>;
  private readonly rateLimiter: RateLimiter;

  constructor(config: RazorpayClientConfig) {
    this.sdk = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });

    // Razorpay allows ~20 requests/second on live mode
    this.rateLimiter = new RateLimiter({
      maxRequests: 20,
      windowMs: 1000,
    });
  }

  // ── Payments ────────────────────────────────────────────────

  async listPayments(params: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }): Promise<RazorpayCollection<RazorpayPayment>> {
    await this.rateLimiter.acquire();
    return this.sdk.payments.all(params) as unknown as RazorpayCollection<RazorpayPayment>;
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    await this.rateLimiter.acquire();
    return this.sdk.payments.fetch(paymentId) as unknown as RazorpayPayment;
  }

  async capturePayment(
    paymentId: string,
    amount: number,
    currency: string,
  ): Promise<RazorpayPayment> {
    await this.rateLimiter.acquire();
    return this.sdk.payments.capture(
      paymentId,
      amount,
      currency,
    ) as unknown as RazorpayPayment;
  }

  // ── Refunds ─────────────────────────────────────────────────

  async createRefund(
    paymentId: string,
    params: { amount?: number; notes?: Record<string, string> },
  ): Promise<RazorpayRefund> {
    await this.rateLimiter.acquire();
    return this.sdk.payments.refund(
      paymentId,
      params,
    ) as unknown as RazorpayRefund;
  }

  async listRefunds(params: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }): Promise<RazorpayCollection<RazorpayRefund>> {
    await this.rateLimiter.acquire();
    return this.sdk.refunds.all(params) as unknown as RazorpayCollection<RazorpayRefund>;
  }

  // ── Orders ──────────────────────────────────────────────────

  async createOrder(params: {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    await this.rateLimiter.acquire();
    return this.sdk.orders.create(params) as unknown as RazorpayOrder;
  }

  async listOrders(params: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }): Promise<RazorpayCollection<RazorpayOrder>> {
    await this.rateLimiter.acquire();
    return this.sdk.orders.all(params) as unknown as RazorpayCollection<RazorpayOrder>;
  }

  async fetchOrder(orderId: string): Promise<RazorpayOrder> {
    await this.rateLimiter.acquire();
    return this.sdk.orders.fetch(orderId) as unknown as RazorpayOrder;
  }

  // ── Settlements ─────────────────────────────────────────────

  async listSettlements(params: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }): Promise<RazorpayCollection<RazorpaySettlement>> {
    await this.rateLimiter.acquire();
    return this.sdk.settlements.all(params) as unknown as RazorpayCollection<RazorpaySettlement>;
  }

  async fetchSettlement(
    settlementId: string,
  ): Promise<RazorpaySettlement> {
    await this.rateLimiter.acquire();
    return this.sdk.settlements.fetch(
      settlementId,
    ) as unknown as RazorpaySettlement;
  }

  // ── Subscriptions ───────────────────────────────────────────

  async listSubscriptions(params: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }): Promise<RazorpayCollection<RazorpaySubscription>> {
    await this.rateLimiter.acquire();
    return this.sdk.subscriptions.all(params) as unknown as RazorpayCollection<RazorpaySubscription>;
  }

  async createSubscription(params: {
    plan_id: string;
    total_count: number;
    quantity?: number;
    notes?: Record<string, string>;
  }): Promise<RazorpaySubscription> {
    await this.rateLimiter.acquire();
    return this.sdk.subscriptions.create(params) as unknown as RazorpaySubscription;
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean,
  ): Promise<RazorpaySubscription> {
    await this.rateLimiter.acquire();
    return this.sdk.subscriptions.cancel(
      subscriptionId,
      cancelAtCycleEnd,
    ) as unknown as RazorpaySubscription;
  }

  // ── Invoices ────────────────────────────────────────────────

  async createInvoice(params: {
    type: string;
    customer_id: string;
    line_items: Array<{
      name: string;
      amount: number;
      currency: string;
      quantity: number;
    }>;
  }): Promise<RazorpayInvoice> {
    await this.rateLimiter.acquire();
    return this.sdk.invoices.create(params) as unknown as RazorpayInvoice;
  }

  async listInvoices(params: {
    count?: number;
    skip?: number;
  }): Promise<RazorpayCollection<RazorpayInvoice>> {
    await this.rateLimiter.acquire();
    return this.sdk.invoices.all(params) as unknown as RazorpayCollection<RazorpayInvoice>;
  }

  // ── Customers ───────────────────────────────────────────────

  async listCustomers(params: {
    count?: number;
    skip?: number;
  }): Promise<RazorpayCollection<RazorpayCustomer>> {
    await this.rateLimiter.acquire();
    return this.sdk.customers.all(params) as unknown as RazorpayCollection<RazorpayCustomer>;
  }

  async createCustomer(params: {
    name: string;
    email: string;
    contact: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayCustomer> {
    await this.rateLimiter.acquire();
    return this.sdk.customers.create(params) as unknown as RazorpayCustomer;
  }
}

/** Create a RazorpayClient from environment variables. */
export function createClientFromEnv(): RazorpayClient {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET environment variables. " +
        "Set them in your MCP server configuration.",
    );
  }

  return new RazorpayClient({ keyId, keySecret });
}

/**
 * Stripe API client wrapper.
 * All external API calls go through this module — tools never call the
 * Stripe SDK directly.
 */

import Stripe from "stripe";
import { RateLimiter } from "@mcp-india/shared";

export interface StripeClientConfig {
  apiKey: string;
}

export class StripeClient {
  private readonly stripe: Stripe;
  private readonly rateLimiter: RateLimiter;

  constructor(config: StripeClientConfig) {
    this.stripe = new Stripe(config.apiKey);

    // Conservative: 25 req/s (Stripe allows 100/s live, 25/s test)
    this.rateLimiter = new RateLimiter({
      maxRequests: 25,
      windowMs: 1000,
    });
  }

  // ── Payments ────────────────────────────────────────────────

  async listPayments(params: {
    created_gte?: number;
    created_lte?: number;
    customer?: string;
    limit?: number;
    starting_after?: string;
  }): Promise<Stripe.ApiList<Stripe.PaymentIntent>> {
    await this.rateLimiter.acquire();
    return this.stripe.paymentIntents.list({
      ...(params.created_gte || params.created_lte
        ? {
            created: {
              ...(params.created_gte ? { gte: params.created_gte } : {}),
              ...(params.created_lte ? { lte: params.created_lte } : {}),
            },
          }
        : {}),
      ...(params.customer ? { customer: params.customer } : {}),
      limit: params.limit ?? 10,
      ...(params.starting_after
        ? { starting_after: params.starting_after }
        : {}),
    });
  }

  async getPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    await this.rateLimiter.acquire();
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createPayment(params: {
    amount: number;
    currency: string;
    customer?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    await this.rateLimiter.acquire();
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      ...(params.customer ? { customer: params.customer } : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });
  }

  async capturePayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    await this.rateLimiter.acquire();
    return this.stripe.paymentIntents.capture(paymentIntentId);
  }

  // ── Refunds ─────────────────────────────────────────────────

  async createRefund(params: {
    payment_intent: string;
    amount?: number;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  }): Promise<Stripe.Refund> {
    await this.rateLimiter.acquire();
    return this.stripe.refunds.create({
      payment_intent: params.payment_intent,
      ...(params.amount !== undefined ? { amount: params.amount } : {}),
      ...(params.reason ? { reason: params.reason } : {}),
    });
  }

  async listRefunds(params: {
    payment_intent?: string;
    created_gte?: number;
    created_lte?: number;
    limit?: number;
    starting_after?: string;
  }): Promise<Stripe.ApiList<Stripe.Refund>> {
    await this.rateLimiter.acquire();
    return this.stripe.refunds.list({
      ...(params.payment_intent
        ? { payment_intent: params.payment_intent }
        : {}),
      ...(params.created_gte || params.created_lte
        ? {
            created: {
              ...(params.created_gte ? { gte: params.created_gte } : {}),
              ...(params.created_lte ? { lte: params.created_lte } : {}),
            },
          }
        : {}),
      limit: params.limit ?? 10,
      ...(params.starting_after
        ? { starting_after: params.starting_after }
        : {}),
    });
  }

  // ── Customers ───────────────────────────────────────────────

  async listCustomers(params: {
    email?: string;
    created_gte?: number;
    created_lte?: number;
    limit?: number;
    starting_after?: string;
  }): Promise<Stripe.ApiList<Stripe.Customer>> {
    await this.rateLimiter.acquire();
    return this.stripe.customers.list({
      ...(params.email ? { email: params.email } : {}),
      ...(params.created_gte || params.created_lte
        ? {
            created: {
              ...(params.created_gte ? { gte: params.created_gte } : {}),
              ...(params.created_lte ? { lte: params.created_lte } : {}),
            },
          }
        : {}),
      limit: params.limit ?? 10,
      ...(params.starting_after
        ? { starting_after: params.starting_after }
        : {}),
    });
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    await this.rateLimiter.acquire();
    return this.stripe.customers.retrieve(
      customerId,
    ) as Promise<Stripe.Customer>;
  }

  async createCustomer(params: {
    name?: string;
    email?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    await this.rateLimiter.acquire();
    return this.stripe.customers.create(params);
  }

  async searchCustomers(
    query: string,
    limit?: number,
  ): Promise<Stripe.ApiSearchResult<Stripe.Customer>> {
    await this.rateLimiter.acquire();
    return this.stripe.customers.search({
      query,
      ...(limit ? { limit } : {}),
    });
  }

  // ── Subscriptions ───────────────────────────────────────────

  async listSubscriptions(params: {
    status?: string;
    customer?: string;
    limit?: number;
    starting_after?: string;
  }): Promise<Stripe.ApiList<Stripe.Subscription>> {
    await this.rateLimiter.acquire();
    return this.stripe.subscriptions.list({
      ...(params.status ? { status: params.status as Stripe.SubscriptionListParams["status"] } : {}),
      ...(params.customer ? { customer: params.customer } : {}),
      limit: params.limit ?? 10,
      ...(params.starting_after
        ? { starting_after: params.starting_after }
        : {}),
    });
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    await this.rateLimiter.acquire();
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async createSubscription(params: {
    customer: string;
    price_id: string;
    trial_period_days?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    await this.rateLimiter.acquire();
    return this.stripe.subscriptions.create({
      customer: params.customer,
      items: [{ price: params.price_id }],
      ...(params.trial_period_days !== undefined
        ? { trial_period_days: params.trial_period_days }
        : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<Stripe.Subscription> {
    await this.rateLimiter.acquire();
    if (cancelAtPeriodEnd) {
      return this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  // ── Invoices ────────────────────────────────────────────────

  async listInvoices(params: {
    customer?: string;
    status?: string;
    created_gte?: number;
    created_lte?: number;
    limit?: number;
    starting_after?: string;
  }): Promise<Stripe.ApiList<Stripe.Invoice>> {
    await this.rateLimiter.acquire();
    return this.stripe.invoices.list({
      ...(params.customer ? { customer: params.customer } : {}),
      ...(params.status ? { status: params.status as Stripe.InvoiceListParams["status"] } : {}),
      ...(params.created_gte || params.created_lte
        ? {
            created: {
              ...(params.created_gte ? { gte: params.created_gte } : {}),
              ...(params.created_lte ? { lte: params.created_lte } : {}),
            },
          }
        : {}),
      limit: params.limit ?? 10,
      ...(params.starting_after
        ? { starting_after: params.starting_after }
        : {}),
    });
  }

  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    await this.rateLimiter.acquire();
    return this.stripe.invoices.retrieve(invoiceId);
  }

  // ── Products & Prices ───────────────────────────────────────

  async listProducts(params: {
    active?: boolean;
    limit?: number;
    starting_after?: string;
  }): Promise<Stripe.ApiList<Stripe.Product>> {
    await this.rateLimiter.acquire();
    return this.stripe.products.list({
      ...(params.active !== undefined ? { active: params.active } : {}),
      limit: params.limit ?? 10,
      ...(params.starting_after
        ? { starting_after: params.starting_after }
        : {}),
    });
  }

  async createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Product> {
    await this.rateLimiter.acquire();
    return this.stripe.products.create({
      name: params.name,
      ...(params.description ? { description: params.description } : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });
  }

  async listPrices(params: {
    product?: string;
    active?: boolean;
    limit?: number;
    starting_after?: string;
  }): Promise<Stripe.ApiList<Stripe.Price>> {
    await this.rateLimiter.acquire();
    return this.stripe.prices.list({
      ...(params.product ? { product: params.product } : {}),
      ...(params.active !== undefined ? { active: params.active } : {}),
      limit: params.limit ?? 10,
      ...(params.starting_after
        ? { starting_after: params.starting_after }
        : {}),
    });
  }

  async createPrice(params: {
    unit_amount: number;
    currency: string;
    product: string;
    recurring_interval?: "day" | "week" | "month" | "year";
    recurring_interval_count?: number;
  }): Promise<Stripe.Price> {
    await this.rateLimiter.acquire();
    return this.stripe.prices.create({
      unit_amount: params.unit_amount,
      currency: params.currency,
      product: params.product,
      ...(params.recurring_interval
        ? {
            recurring: {
              interval: params.recurring_interval,
              ...(params.recurring_interval_count !== undefined
                ? { interval_count: params.recurring_interval_count }
                : {}),
            },
          }
        : {}),
    });
  }
}

/** Create a StripeClient from environment variables. */
export function createClientFromEnv(): StripeClient {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY environment variable. " +
        "Set it in your MCP server configuration. " +
        "Get your key at https://dashboard.stripe.com/apikeys",
    );
  }

  return new StripeClient({ apiKey });
}

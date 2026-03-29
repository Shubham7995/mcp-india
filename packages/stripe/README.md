# @mcp-india/stripe

[![npm version](https://img.shields.io/npm/v/@mcp-india/stripe.svg)](https://www.npmjs.com/package/@mcp-india/stripe)

MCP server that exposes Stripe payments, subscriptions, and billing as AI-callable tools. Enables AI assistants to manage Stripe operations through the Model Context Protocol.

## Quick Start

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@mcp-india/stripe"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_..."
      }
    }
  }
}
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key ([Dashboard → API keys](https://dashboard.stripe.com/apikeys)) |

## Tools (21)

### Payments (6 tools)

| Tool | Description |
|------|-------------|
| `stripe_list_payments` | List PaymentIntents with date/status/customer filters |
| `stripe_get_payment` | Get PaymentIntent details by ID |
| `stripe_create_payment` | Create a PaymentIntent (amount in cents) |
| `stripe_capture_payment` | Capture an authorized PaymentIntent |
| `stripe_create_refund` | Create a full or partial refund |
| `stripe_list_refunds` | List refunds with payment/date filters |

### Customers (4 tools)

| Tool | Description |
|------|-------------|
| `stripe_list_customers` | List customers with email/date filters |
| `stripe_get_customer` | Get customer details by ID |
| `stripe_create_customer` | Create a new customer |
| `stripe_search_customers` | Search using Stripe Search API syntax |

### Subscriptions & Invoices (6 tools)

| Tool | Description |
|------|-------------|
| `stripe_list_subscriptions` | List subscriptions with status/customer filters |
| `stripe_get_subscription` | Get subscription details by ID |
| `stripe_create_subscription` | Create a subscription (customer + price) |
| `stripe_cancel_subscription` | Cancel at period end or immediately |
| `stripe_list_invoices` | List invoices with customer/status/date filters |
| `stripe_get_invoice` | Get invoice details by ID |

### Products & Prices (4 tools)

| Tool | Description |
|------|-------------|
| `stripe_list_products` | List products with active/archived filter |
| `stripe_create_product` | Create a product (name, description, metadata) |
| `stripe_list_prices` | List prices filtered by product |
| `stripe_create_price` | Create one-time or recurring price (amount in cents) |

### Dashboard (1 tool)

| Tool | Description |
|------|-------------|
| `stripe_dashboard_summary` | Daily summary: revenue, charges, refunds, net amount |

## Currency Convention

All monetary amounts are in **cents** (smallest currency unit):
- `5000` = $50.00 USD
- `2000` = $20.00 USD
- `100` = $1.00 USD

## Examples

**List recent payments:**
> "Show me all payments from this week"

**Create a customer and subscription:**
> "Create a customer for alice@example.com, then subscribe them to price_ABC at $20/month"

**Daily revenue check:**
> "What's today's Stripe dashboard summary?"

**Search for a customer:**
> "Search Stripe for customers with email containing acme.com"

## Rate Limits

The server enforces a conservative 25 requests/second rate limit (Stripe's test mode limit). Requests exceeding this are queued automatically.

## License

MIT

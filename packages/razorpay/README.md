# @mcp-india/razorpay

[![npm version](https://img.shields.io/npm/v/@mcp-india/razorpay)](https://www.npmjs.com/package/@mcp-india/razorpay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

MCP server for the Razorpay payment gateway — query payments, manage orders, track settlements, handle subscriptions, create invoices, and summarize daily revenue, all from Claude.

---

## Installation

No installation required. Run directly with npx:

```bash
npx -y @mcp-india/razorpay
```

---

## Configuration

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "razorpay": {
      "command": "npx",
      "args": ["-y", "@mcp-india/razorpay"],
      "env": {
        "RAZORPAY_KEY_ID": "rzp_live_YOUR_KEY_ID",
        "RAZORPAY_KEY_SECRET": "YOUR_KEY_SECRET"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | Yes | Your Razorpay Key ID (starts with `rzp_live_` or `rzp_test_`) |
| `RAZORPAY_KEY_SECRET` | Yes | Your Razorpay Key Secret |

Generate keys at [dashboard.razorpay.com/app/keys](https://dashboard.razorpay.com/app/keys). Use `rzp_test_` keys during development — they do not charge real money.

---

## Available tools

### Payments

| Tool | Description |
|---|---|
| `razorpay_list_payments` | List payments with optional date range, status filter, and pagination |
| `razorpay_fetch_payment` | Get full details of a specific payment by ID |
| `razorpay_capture_payment` | Capture an authorized payment (amount in paisa, e.g. 50000 = 500) |
| `razorpay_create_refund` | Create a full or partial refund for a payment |
| `razorpay_list_refunds` | List refunds with optional date filters and pagination |

### Orders

| Tool | Description |
|---|---|
| `razorpay_create_order` | Create a new order (amount in paisa) |
| `razorpay_list_orders` | List orders with optional date filters and pagination |
| `razorpay_fetch_order` | Get details of a specific order by ID |

### Settlements

| Tool | Description |
|---|---|
| `razorpay_list_settlements` | List settlements with optional date filters and pagination |
| `razorpay_fetch_settlement` | Get details of a specific settlement by ID |

### Subscriptions

| Tool | Description |
|---|---|
| `razorpay_list_subscriptions` | List subscriptions with optional date filters and pagination |
| `razorpay_create_subscription` | Create a subscription for a plan with a specified billing cycle count |
| `razorpay_cancel_subscription` | Cancel a subscription immediately or at the end of the current cycle |

### Invoices

| Tool | Description |
|---|---|
| `razorpay_create_invoice` | Create an invoice for a customer with one or more line items |
| `razorpay_list_invoices` | List invoices with pagination |

### Customers

| Tool | Description |
|---|---|
| `razorpay_list_customers` | List customers with pagination |
| `razorpay_create_customer` | Create a new customer with name, email, and phone |

### Dashboard

| Tool | Description |
|---|---|
| `razorpay_dashboard_summary` | Aggregate daily summary: total revenue, payment count, refunds, and net revenue in INR |

---

## Example conversations

**Check today's revenue**

> "What is my Razorpay revenue today? Show me total payments, failed payments, refunds, and net amount."

Claude calls `razorpay_dashboard_summary` with today's date and returns a structured summary.

**Investigate a payment**

> "I have a complaint about payment pay_ABC123. Can you fetch its details and check if a refund was already issued?"

Claude calls `razorpay_fetch_payment` to get payment status, then `razorpay_list_refunds` filtered to the same day to check for existing refunds.

**Create an order and invoice**

> "Create a Razorpay order for 2500 rupees for customer cust_XYZ. Then create an invoice for the same amount with description 'Consulting - March 2026'."

Claude calls `razorpay_create_order` (amount 250000 paisa), then `razorpay_create_invoice` with the customer ID and line item.

---

## Troubleshooting

**"Server failed to start" in Claude Desktop**

- Confirm that Node.js 20 or later is installed: `node --version`
- Run the server manually to see the error: `RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=yyy npx -y @mcp-india/razorpay`
- Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in the `env` block of `claude_desktop_config.json`, not as shell environment variables.

**"Authentication failed" or 401 errors**

- Verify the key and secret match. The Key ID and Key Secret are separate values from the Razorpay dashboard — do not swap them.
- If using test keys (`rzp_test_`), confirm the request is hitting the Razorpay test environment. Test keys will not work against live data.

**Tools not appearing in Claude**

- Fully quit and relaunch Claude Desktop after editing `claude_desktop_config.json`. On macOS, use Cmd+Q, not just closing the window.
- Validate your JSON with a linter — a trailing comma or missing brace will silently prevent the config from loading.

**Amounts look wrong (100x off)**

- Razorpay uses **paisa** as its base unit. 1 INR = 100 paisa. An amount of `50000` is 500, not 50000. The `razorpay_dashboard_summary` tool converts to INR automatically.

---

## License

MIT — see [LICENSE](../../LICENSE).

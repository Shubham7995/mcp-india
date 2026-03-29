# @mcp-india/stripe

## 0.1.0

### Minor Changes

- Initial release of Stripe MCP server
- 21 tools across 5 domains:
  - **Payments**: list, get, create, capture PaymentIntents + create/list refunds
  - **Customers**: list, get, create, search customers
  - **Subscriptions**: list, get, create, cancel subscriptions + list/get invoices
  - **Products**: list/create products + list/create prices (one-time & recurring)
  - **Dashboard**: daily activity summary (revenue, refunds, net)
- Rate limiting at 25 req/s (Stripe test mode limit)
- All amounts in cents (smallest currency unit)

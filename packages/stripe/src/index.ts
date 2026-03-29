/**
 * @mcp-india/stripe — MCP server for Stripe payments, subscriptions, and billing.
 *
 * Exposes 21 tools: payments, refunds, customers, subscriptions,
 * invoices, products, prices, and a dashboard summary.
 *
 * Configuration:
 *   STRIPE_SECRET_KEY — Stripe API secret key
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client.js";
import { registerPaymentTools } from "./tools/payments.js";
import { registerCustomerTools } from "./tools/customers.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerProductTools } from "./tools/products.js";
import { registerDashboardTools } from "./tools/dashboard.js";

const server = new McpServer({
  name: "@mcp-india/stripe",
  version: "0.1.0",
});

const client = createClientFromEnv();

// Register all tool groups
registerPaymentTools(server, client);
registerCustomerTools(server, client);
registerSubscriptionTools(server, client);
registerProductTools(server, client);
registerDashboardTools(server, client);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});

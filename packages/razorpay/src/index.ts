/**
 * @mcp-india/razorpay — MCP server for Razorpay payment gateway.
 *
 * Exposes 18 tools: payments, orders, settlements, subscriptions,
 * invoices, customers, and a dashboard summary.
 *
 * Configuration:
 *   RAZORPAY_KEY_ID     — Razorpay API Key ID
 *   RAZORPAY_KEY_SECRET — Razorpay API Key Secret
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client.js";
import { registerPaymentTools } from "./tools/payments.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerSettlementTools } from "./tools/settlements.js";
import { registerDashboardTools } from "./tools/dashboard.js";

const server = new McpServer({
  name: "@mcp-india/razorpay",
  version: "0.1.0",
});

const client = createClientFromEnv();

// Register all tool groups
registerPaymentTools(server, client);
registerOrderTools(server, client);
registerSettlementTools(server, client);
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

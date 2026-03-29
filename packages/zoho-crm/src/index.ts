/**
 * @mcp-india/zoho-crm — MCP server for Zoho CRM.
 *
 * Exposes 14 tools: contacts, deals, tasks, calls, notes,
 * and sales pipeline reports.
 *
 * Configuration:
 *   ZOHO_CLIENT_ID       — OAuth2 Client ID
 *   ZOHO_CLIENT_SECRET   — OAuth2 Client Secret
 *   ZOHO_REFRESH_TOKEN   — OAuth2 Refresh Token
 *   ZOHO_API_DOMAIN      — (optional) e.g. zohoapis.in for India
 *   ZOHO_ACCOUNTS_DOMAIN — (optional) e.g. accounts.zoho.in for India
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerDealTools } from "./tools/deals.js";
import { registerActivityTools } from "./tools/activities.js";
import { registerReportTools } from "./tools/reports.js";

const server = new McpServer({
  name: "@mcp-india/zoho-crm",
  version: "0.1.0",
});

const client = createClientFromEnv();

// Register all tool groups
registerContactTools(server, client);
registerDealTools(server, client);
registerActivityTools(server, client);
registerReportTools(server, client);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});

/**
 * @mcp-india/hubspot — MCP server for HubSpot CRM.
 *
 * Exposes 18 tools: contacts, companies, deals, engagements,
 * and pipeline reports.
 *
 * Configuration:
 *   HUBSPOT_ACCESS_TOKEN — HubSpot Private App access token
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerDealTools } from "./tools/deals.js";
import { registerEngagementTools } from "./tools/engagements.js";
import { registerReportTools } from "./tools/reports.js";

const server = new McpServer({
  name: "@mcp-india/hubspot",
  version: "0.1.0",
});

const client = createClientFromEnv();

// Register all tool groups
registerContactTools(server, client);
registerCompanyTools(server, client);
registerDealTools(server, client);
registerEngagementTools(server, client);
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

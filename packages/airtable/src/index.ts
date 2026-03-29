/**
 * @mcp-india/airtable — MCP server for Airtable bases and records.
 *
 * Exposes 12 tools: record CRUD, search, schema discovery,
 * bulk operations, and table summary.
 *
 * Configuration:
 *   AIRTABLE_ACCESS_TOKEN — Airtable Personal Access Token
 *   AIRTABLE_BASE_ID      — Default base ID (starts with 'app')
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client.js";
import { registerRecordTools } from "./tools/records.js";
import { registerSchemaTools } from "./tools/schema.js";
import { registerBulkTools } from "./tools/bulk.js";

const server = new McpServer({
  name: "@mcp-india/airtable",
  version: "0.1.0",
});

const client = createClientFromEnv();

// Register all tool groups
registerRecordTools(server, client);
registerSchemaTools(server, client);
registerBulkTools(server, client);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});

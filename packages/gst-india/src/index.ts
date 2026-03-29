/**
 * @mcp-india/gst-india — Offline MCP server for Indian GST.
 *
 * Exposes 9 tools: GSTIN validation, invoice validation, state info,
 * GST calculation, supply type determination, reverse calculation,
 * HSN/SAC search, HSN/SAC details, and rate slab listing.
 *
 * No configuration required. Zero API keys. Works out of the box.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerValidationTools } from "./tools/validation.js";
import { registerCalculationTools } from "./tools/calculation.js";
import { registerHsnTools } from "./tools/hsn.js";

const server = new McpServer({
  name: "@mcp-india/gst-india",
  version: "0.1.0",
});

// Register all tool groups — no client needed (all tools are offline)
registerValidationTools(server);
registerCalculationTools(server);
registerHsnTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});

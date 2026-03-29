# Getting Started

## Prerequisites

- **Node.js 20** or later
- An MCP-compatible client (Claude Desktop, Cursor, Windsurf, VS Code, or Claude Code CLI)

## How it works

Each `@mcp-india/*` package is an MCP server that runs locally on your machine using **stdio** transport. There is nothing to host — the client starts the server as a child process, and tools are available immediately.

No global install needed. `npx -y` fetches and runs the latest version on demand.

## 1. Pick a server

| Package | What it does |
|---------|-------------|
| `@mcp-india/razorpay` | Payments, orders, settlements, subscriptions, invoices, customers |
| `@mcp-india/zoho-crm` | Contacts, deals, tasks, calls, notes, pipeline reports |
| `@mcp-india/gst-india` | GSTIN validation, tax calculation, HSN/SAC lookup (offline) |
| `@mcp-india/stripe` | Payments, customers, subscriptions, products, invoices |
| `@mcp-india/hubspot` | Contacts, companies, deals, engagements, pipeline reports |
| `@mcp-india/airtable` | Records, schema discovery, bulk operations, table summary |

## 2. Get API credentials

Each server needs its own credentials. See the `.env.example` file in each package for the required variables and links to the provider's dashboard.

**Exception**: `@mcp-india/gst-india` is fully offline and needs zero configuration.

## 3. Add to your MCP client

Add the server configuration to your client's config file. Here's an example with Razorpay:

```json
{
  "mcpServers": {
    "razorpay": {
      "command": "npx",
      "args": ["-y", "@mcp-india/razorpay"],
      "env": {
        "RAZORPAY_KEY_ID": "rzp_test_YOUR_KEY_ID",
        "RAZORPAY_KEY_SECRET": "YOUR_KEY_SECRET"
      }
    }
  }
}
```

See the [Configuration](/guide/configuration) page for the full setup for each client and all 6 servers.

## 4. Restart and start asking

Restart your MCP client. The server tools will appear automatically. Try:

> "What is my Razorpay revenue today?"

> "Search for contacts named Alice in Zoho CRM."

> "Is GSTIN 27AAPFU0939F1ZV valid?"

> "List my last 10 Stripe payments."

> "Show my HubSpot deal pipeline summary."

> "List all records in my Airtable Contacts table."

# mcp-india

[![CI](https://github.com/Shubham7995/mcp-india/actions/workflows/test.yml/badge.svg)](https://github.com/Shubham7995/mcp-india/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Shubham7995/mcp-india)](https://github.com/Shubham7995/mcp-india/stargazers)

MCP servers for Indian and global business tools — connect Claude to Razorpay, Zoho CRM, GST India, Stripe, HubSpot, Airtable, and more via the [Model Context Protocol](https://modelcontextprotocol.io).

**[Documentation](https://shubham7995.github.io/mcp-india)** | **[npm](https://www.npmjs.com/org/mcp-india)**

---

## Packages

| Package | Version | Tools | Description |
|---|---|---|---|
| [`@mcp-india/razorpay`](./packages/razorpay) | [![npm](https://img.shields.io/npm/v/@mcp-india/razorpay)](https://www.npmjs.com/package/@mcp-india/razorpay) | 17 | Payments, orders, settlements, subscriptions, invoices, customers |
| [`@mcp-india/zoho-crm`](./packages/zoho-crm) | [![npm](https://img.shields.io/npm/v/@mcp-india/zoho-crm)](https://www.npmjs.com/package/@mcp-india/zoho-crm) | 14 | Contacts, deals, tasks, calls, notes, pipeline reports |
| [`@mcp-india/gst-india`](./packages/gst-india) | [![npm](https://img.shields.io/npm/v/@mcp-india/gst-india)](https://www.npmjs.com/package/@mcp-india/gst-india) | 10 | GSTIN validation, tax calculation, HSN/SAC lookup (offline, zero config) |
| [`@mcp-india/stripe`](./packages/stripe) | [![npm](https://img.shields.io/npm/v/@mcp-india/stripe)](https://www.npmjs.com/package/@mcp-india/stripe) | 20 | Payments, customers, subscriptions, products, invoices, daily dashboard |
| [`@mcp-india/hubspot`](./packages/hubspot) | [![npm](https://img.shields.io/npm/v/@mcp-india/hubspot)](https://www.npmjs.com/package/@mcp-india/hubspot) | 18 | Contacts, companies, deals, engagements, pipeline reports |
| [`@mcp-india/airtable`](./packages/airtable) | [![npm](https://img.shields.io/npm/v/@mcp-india/airtable)](https://www.npmjs.com/package/@mcp-india/airtable) | 13 | Records, schema discovery, bulk operations, table summary |

**92 tools** across 6 servers. All run locally via stdio — zero hosting cost.

---

## Quick start

Each package runs as a standalone MCP server. No global install needed — npx fetches and runs the latest version on demand.

**1. Get your API credentials**

See each package's `.env.example` for required variables and dashboard links. Exception: `@mcp-india/gst-india` is fully offline and needs zero config.

**2. Add servers to Claude Desktop**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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
    },
    "zoho-crm": {
      "command": "npx",
      "args": ["-y", "@mcp-india/zoho-crm"],
      "env": {
        "ZOHO_CLIENT_ID": "1000.XXXXXXXXXXXX",
        "ZOHO_CLIENT_SECRET": "XXXXXXXXXXXXXXXX",
        "ZOHO_REFRESH_TOKEN": "1000.XXXXXXXX.XXXXXXXX"
      }
    },
    "gst-india": {
      "command": "npx",
      "args": ["-y", "@mcp-india/gst-india"]
    },
    "stripe": {
      "command": "npx",
      "args": ["-y", "@mcp-india/stripe"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_YOUR_SECRET_KEY"
      }
    },
    "hubspot": {
      "command": "npx",
      "args": ["-y", "@mcp-india/hubspot"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "pat-na1-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }
    },
    "airtable": {
      "command": "npx",
      "args": ["-y", "@mcp-india/airtable"],
      "env": {
        "AIRTABLE_ACCESS_TOKEN": "patXXXXXXXXXXXXXX.XXXXXXXX",
        "AIRTABLE_BASE_ID": "appXXXXXXXXXXXXXX"
      }
    }
  }
}
```

For Cursor, Windsurf, VS Code, and Claude Code CLI setup, see the [Configuration guide](https://shubham7995.github.io/mcp-india/guide/configuration).

**3. Restart Claude Desktop and start asking questions**

> "What is my Razorpay revenue today?"
> "Search for contacts named Alice in Zoho CRM."
> "Is GSTIN 27AAPFU0939F1ZV valid?"
> "List my last 10 Stripe payments."
> "Show my HubSpot deal pipeline summary."
> "List all records in my Airtable Contacts table."

See each package README for the full list of available tools and more examples.

---

## Requirements

- Node.js 20 or later
- npm 10 or later

---

## Development

This repository is a Turborepo monorepo with npm workspaces.

```bash
# Clone and install all dependencies
git clone https://github.com/Shubham7995/mcp-india.git
cd mcp-india
npm install

# Build all packages
npm run build

# Run tests across all packages
npm test

# Build and watch a specific package
cd packages/razorpay
npm run build -- --watch
```

### Repository structure

```
mcp-india/
  packages/
    razorpay/       # @mcp-india/razorpay MCP server
    zoho-crm/       # @mcp-india/zoho-crm MCP server
    gst-india/      # @mcp-india/gst-india MCP server (offline)
    stripe/         # @mcp-india/stripe MCP server (Stripe SDK)
    hubspot/        # @mcp-india/hubspot MCP server (native fetch)
    airtable/       # @mcp-india/airtable MCP server (native fetch)
    shared/         # @mcp-india/shared — shared utilities
    docs-site/      # VitePress documentation site
  docs/
    adr/            # Architecture Decision Records
  turbo.json        # Turborepo pipeline configuration
  tsconfig.base.json
```

### Architecture decisions

Key decisions are documented as ADRs in [`docs/adr/`](./docs/adr/):

- [ADR-0001](./docs/adr/0001-use-typescript-mcp-sdk.md) — Use TypeScript with @modelcontextprotocol/sdk
- [ADR-0002](./docs/adr/0002-monorepo-with-turborepo.md) — Monorepo with Turborepo and npm workspaces
- [ADR-0003](./docs/adr/0003-file-per-domain-tool-structure.md) — File-per-domain tool structure

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for anything beyond a small bug fix, so we can discuss the approach first.

1. Fork the repository and create a branch from `main`.
2. Make your changes. Add or update tests as appropriate.
3. Run `npm test` and `npm run typecheck` from the repository root and confirm both pass.
4. Open a pull request with a clear description of what changed and why.

For a new MCP server package, follow the structure of `packages/razorpay` and register the package in this README's package table.

---

## License

MIT — see [LICENSE](./LICENSE).

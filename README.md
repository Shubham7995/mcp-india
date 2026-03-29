# mcp-india

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

MCP servers for Indian and global business tools — connect Claude to Razorpay, Zoho CRM, GST India, and more via the [Model Context Protocol](https://modelcontextprotocol.io).

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@mcp-india/razorpay`](./packages/razorpay) | [![npm](https://img.shields.io/npm/v/@mcp-india/razorpay)](https://www.npmjs.com/package/@mcp-india/razorpay) | Payments, orders, settlements, subscriptions, invoices, customers |
| [`@mcp-india/zoho-crm`](./packages/zoho-crm) | [![npm](https://img.shields.io/npm/v/@mcp-india/zoho-crm)](https://www.npmjs.com/package/@mcp-india/zoho-crm) | Contacts, deals, tasks, calls, notes, pipeline reports |
| [`@mcp-india/gst-india`](./packages/gst-india) | [![npm](https://img.shields.io/npm/v/@mcp-india/gst-india)](https://www.npmjs.com/package/@mcp-india/gst-india) | GSTIN validation, tax calculation, HSN/SAC lookup (offline, zero config) |

---

## Quick start

Each package runs as a standalone MCP server. No global install needed — npx fetches and runs the latest version on demand.

**1. Get your API credentials**

For Razorpay: visit [dashboard.razorpay.com/app/keys](https://dashboard.razorpay.com/app/keys) and generate a key pair. Use `rzp_test_` keys for development.

**2. Add the server to Claude Desktop**

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
    }
  }
}
```

**3. Restart Claude Desktop and start asking questions**

> "What is my Razorpay revenue today?"
> "List the last 10 failed payments."
> "Create a refund for payment pay_ABC123."

See the package README for the full list of available tools and more examples.

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
    shared/         # @mcp-india/shared — shared utilities
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

# ADR-0001: Use TypeScript with @modelcontextprotocol/sdk

**Status:** Accepted

**Date:** 2025-01-01

---

## Context

MCP servers in this project run on the user's local machine and communicate with Claude Desktop via stdio. Two implementation paths were available:

1. **TypeScript** using `@modelcontextprotocol/sdk` — Anthropic's official SDK, which provides typed request/response models, a `McpServer` abstraction, and `StdioServerTransport` out of the box.
2. **Python** using `mcp` (the Python SDK) — also officially supported and commonly used for data-heavy tooling.

The project targets developers building integrations for Indian business services (Razorpay, Zoho CRM, GST). The Razorpay Node.js SDK (`razorpay` npm package) is the most complete and actively maintained client for the Razorpay API. A TypeScript implementation can reuse it directly, whereas a Python implementation would require either a thin HTTP wrapper or a community library.

Type safety matters here because tools accept structured inputs (amounts in paisa, ISO date strings, record types) and incorrect types would silently produce wrong API calls. The TypeScript compiler and Zod schema validation together catch these errors at build time and at the tool-call boundary.

## Decision

We will implement all MCP servers in this repository using **TypeScript** and the **`@modelcontextprotocol/sdk`** package (`^1.12.0`).

Tool input schemas are defined with **Zod** and passed directly to `server.tool()`, which generates the JSON Schema that Claude uses to invoke the tools correctly. All packages compile to ESM via `tsup` and target Node 20+.

## Consequences

**Positive:**
- Full type safety end-to-end: TypeScript types for SDK primitives, Zod schemas for tool inputs, and typed Razorpay API client.
- Native reuse of the `razorpay` npm package without wrapping or reimplementing the HTTP client.
- `@modelcontextprotocol/sdk` handles the MCP wire protocol, framing, and capability negotiation — no manual JSON-RPC handling needed.
- Compile-time enforcement of ESM module boundaries (`"type": "module"` in all packages).

**Negative / trade-offs:**
- Requires Node 20 or later on the user's machine. Earlier Node versions (especially 16/18) are not supported.
- ESM-only output means CommonJS `require()` interop does not work without a compatibility shim. Consumers must use `import`.
- TypeScript build step (via `tsup`) adds development complexity absent from a plain JavaScript approach.

**Neutral / follow-on work:**
- Any future packages added to the monorepo (e.g., `zoho-crm`, `gst-india`) will follow the same TypeScript + MCP SDK pattern for consistency.
- The `@mcp-india/shared` utility package is also TypeScript, allowing common helpers like `formatToolError` to be type-checked across all servers.

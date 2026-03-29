# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mcp-india** is a Turborepo monorepo of MCP (Model Context Protocol) servers exposing India-specific and global business APIs as AI-callable tools. Each server ships as a separate npm package under the `@mcp-india` scope.

**Phase 1 servers**: `@mcp-india/razorpay`, `@mcp-india/zoho-crm`, `@mcp-india/gst-india`

MCP servers run on the user's machine (stdio transport) — zero hosting cost. Users install via `npx -y @mcp-india/<server>`.

## Commands

```bash
# Install all workspace dependencies
npm install

# Build all packages
npx turbo run build

# Build a single package
npx turbo run build --filter=@mcp-india/razorpay

# Run all tests
npx turbo run test

# Run tests for a single package
npx turbo run test --filter=@mcp-india/razorpay

# Run a single test file
npx vitest run packages/razorpay/src/tools/payments.test.ts

# Run tests in watch mode
npx vitest --watch

# Lint all packages
npx turbo run lint

# Type-check without emitting
npx tsc --noEmit

# Create a changeset for versioning
npx changeset

# Version packages (applies changesets, updates CHANGELOGs)
npx changeset version

# Publish changed packages to npm
npx changeset publish

# Publish a single package manually (requires npm login + bypass-2FA token)
cd packages/razorpay && npm publish
```

## Architecture

```
mcp-india/
├── packages/
│   ├── razorpay/                    # @mcp-india/razorpay
│   │   ├── src/
│   │   │   ├── index.ts             # MCP server entrypoint + tool registration
│   │   │   ├── tools/
│   │   │   │   ├── payments.ts      # Payment tools (list, fetch, capture, refund)
│   │   │   │   ├── payments.test.ts # Unit tests — mirrors payments.ts
│   │   │   │   ├── payments.spec.ts # BDD specs — Given/When/Then
│   │   │   │   ├── orders.ts        # Order tools (create, list, fetch)
│   │   │   │   ├── orders.test.ts
│   │   │   │   ├── orders.spec.ts
│   │   │   │   ├── settlements.ts   # Settlements, subscriptions, invoices, customers
│   │   │   │   ├── settlements.test.ts
│   │   │   │   ├── settlements.spec.ts
│   │   │   │   ├── dashboard.ts     # Dashboard summary (composite aggregation tool)
│   │   │   │   ├── dashboard.test.ts
│   │   │   │   └── dashboard.spec.ts
│   │   │   ├── client.ts            # Razorpay API client wrapper
│   │   │   └── types.ts             # Package-specific types
│   │   ├── CHANGELOG.md
│   │   ├── tsup.config.ts
│   │   ├── vitest.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── zoho-crm/                    # @mcp-india/zoho-crm
│   │   ├── src/
│   │   │   ├── index.ts             # MCP server entrypoint + tool registration
│   │   │   ├── tools/
│   │   │   │   ├── contacts.ts      # Contact tools (search, create, update, get)
│   │   │   │   ├── contacts.test.ts
│   │   │   │   ├── contacts.spec.ts
│   │   │   │   ├── deals.ts         # Deal tools (list, create, update_stage, get)
│   │   │   │   ├── deals.test.ts
│   │   │   │   ├── deals.spec.ts
│   │   │   │   ├── activities.ts    # Activity tools (task, list_tasks, log_call, note)
│   │   │   │   ├── activities.test.ts
│   │   │   │   ├── activities.spec.ts
│   │   │   │   ├── reports.ts       # Report tools (pipeline summary, revenue forecast)
│   │   │   │   ├── reports.test.ts
│   │   │   │   └── reports.spec.ts
│   │   │   ├── client.ts            # Zoho CRM API client (OAuth2 + native fetch)
│   │   │   └── types.ts             # Zoho CRM response/request types
│   │   ├── CHANGELOG.md
│   │   ├── tsup.config.ts
│   │   ├── vitest.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/                      # @mcp-india/shared (internal, not published)
│       └── src/
│           ├── index.ts             # Re-exports all shared utilities
│           ├── error-handling.ts
│           ├── error-handling.test.ts
│           ├── rate-limiter.ts
│           ├── rate-limiter.test.ts
│           ├── pagination.ts
│           └── pagination.test.ts
├── docs/
│   ├── adr/                         # Architecture Decision Records
│   └── mcp-servers.md               # Strategy + technical blueprint
├── .changeset/                      # Changesets version management
├── .github/workflows/
│   ├── test.yml                     # CI: test on push
│   └── publish.yml                  # CD: publish to npm on release
├── .npmrc                           # access=public for scoped packages
├── vitest.config.ts                 # Root Vitest config (projects: packages/*)
├── turbo.json                       # Build pipeline orchestration
├── package.json                     # Workspace root (npm workspaces)
└── CLAUDE.md
```

**Key patterns:**
- Each MCP server is a self-contained package under `packages/`
- Tools are grouped by domain in a single file (`payments.ts` contains list, fetch, capture, refund)
- Each tool file exports tool handlers + Zod input schemas; `index.ts` registers them with the MCP server
- External API calls go through a dedicated `client.ts` — tool files never call `fetch` directly
- `packages/shared/` contains cross-package utilities (error handling, rate limiting, pagination)

## Test Structure

**Tests mirror the src file structure exactly.** Test files live alongside their source files within each package:

- `packages/razorpay/src/tools/payments.ts` → `payments.test.ts` (unit) + `payments.spec.ts` (BDD)
- `packages/razorpay/src/tools/dashboard.ts` → `dashboard.test.ts` + `dashboard.spec.ts`
- `packages/shared/src/rate-limiter.ts` → `rate-limiter.test.ts`

## Development Practices

### TDD (Test-Driven Development)

All features follow the Red-Green-Refactor cycle:

1. **Red** — Write a failing test for the desired behavior first
2. **Green** — Write the minimum code to pass the test
3. **Refactor** — Clean up while keeping tests green

Do not write implementation code without a failing test. Unit tests use `.test.ts` extension.

### BDD (Behavior-Driven Development)

Acceptance-level behavior is captured in `.spec.ts` files using describe/it blocks with Given/When/Then naming:

```ts
describe("razorpay_list_payments", () => {
  it("should return captured payments given a valid date range", async () => {
    // Given: Razorpay API has payments in the date range
    // When: the tool is invoked with from/to dates
    // Then: response contains payment items with status, amount, currency
  });
});
```

BDD specs define the contract from the user's perspective before implementation begins.

### ADR (Architecture Decision Records)

Significant architectural decisions are recorded in `docs/adr/`:

```
docs/adr/
├── 0001-use-typescript-mcp-sdk.md
├── 0002-monorepo-with-turborepo.md
├── 0003-file-per-domain-tool-structure.md
└── template.md
```

ADR format:
- **Title** — Short description
- **Status** — Proposed | Accepted | Deprecated | Superseded
- **Context** — What prompted the decision
- **Decision** — What was decided and why
- **Consequences** — Trade-offs and what changes

Write ADRs at decision time, not retroactively. Include rejected alternatives.

## Conventions

- **Tool naming**: Underscore prefix by service — `razorpay_list_payments`, `gst_verify_gstin`, `zoho_search_contacts`
- **Input validation**: Zod schemas defined in the tool file, not separately
- **API clients**: Dedicated `client.ts` per package — tools never call `fetch` directly
- **Rate limiting**: All API clients must handle rate limiting and return typed errors
- **Env vars**: Use each service's native variable names — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ZOHO_CLIENT_ID`
- **Bundling**: tsup compiles each package to ESM
- **npm packaging**: `files` whitelist (`dist`, `README.md`) + `publishConfig.access: "public"` + `prepublishOnly` build hook
- **Versioning**: Changesets for coordinated version bumps and changelogs
- **Build orchestration**: Turborepo with npm workspaces

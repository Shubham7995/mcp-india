# ADR-0003: File-per-Domain Tool Structure

**Status:** Accepted

**Date:** 2025-01-01

---

## Context

Each MCP server exposes 18 tools. These tools operate across several business domains — for the Razorpay server: payments, refunds, orders, settlements, subscriptions, invoices, customers, and a dashboard summary. Two organizational schemes were considered:

**Option A: One directory per tool**
```
src/tools/
  razorpay_list_payments/
    index.ts
    schema.ts
  razorpay_fetch_payment/
    index.ts
    schema.ts
  ...   (18 directories)
```
This mirrors how some plugin systems or CLI command frameworks organize commands, one directory per entry point.

**Option B: One file per domain**
```
src/tools/
  payments.ts       # list, fetch, capture, create_refund, list_refunds
  orders.ts         # create, list, fetch
  settlements.ts    # settlements + subscriptions + invoices + customers
  dashboard.ts      # dashboard_summary
```
This groups tools by the Razorpay resource they operate on, which maps directly to the Razorpay API documentation sections.

With 18 tools, Option A would produce 18 directories each containing one or two files — most of which share a common import, the same `RazorpayClient` type, and identical error-handling patterns. Navigation cost is high: finding "how is a refund created" requires locating the right directory among 18.

Option B keeps related tools together. A developer reading `payments.ts` sees all payment-and-refund operations in sequence. The `RazorpayClient` import, the `toUnixTimestamp` helper, and the `formatToolError` usage are written once per file rather than duplicated across 5 separate directories.

The trade-off is file length: `settlements.ts` is the largest file (248 lines) because it covers settlements, subscriptions, invoices, and customers. This was judged acceptable because those domains share registration structure and the alternative (splitting further) would not reduce cognitive load.

## Decision

We will use **one TypeScript file per business domain** under `src/tools/`. Each file exports a single `register<Domain>Tools(server, client)` function that registers all tools for that domain. `index.ts` imports and calls each registration function in sequence.

New domains added in the future will follow the same pattern: create `src/tools/<domain>.ts` and add one `register<Domain>Tools` call to `index.ts`.

## Consequences

**Positive:**
- Fewer files. The `src/tools/` directory contains 4 files (plus test files) rather than 18+ directories.
- Related tools — such as creating a refund and listing refunds — are co-located in `payments.ts`. Shared utilities like `toUnixTimestamp` are defined once at the top of the file.
- Easier to scan: the `index.ts` register call list gives an immediate overview of which domains the server supports.
- Test files mirror the structure: `payments.test.ts`, `orders.test.ts`, one test file per domain file.

**Negative / trade-offs:**
- Individual domain files grow as more tools are added. `settlements.ts` already covers four Razorpay resource types; if subscriptions or invoices become complex, the file may warrant splitting.
- There is no enforced maximum file length, so the convention requires discipline to maintain.
- Co-location within a domain file means that an unrelated change to a settlement tool will show up in the same git diff as a subscription tool change.

**Neutral / follow-on work:**
- If a domain file exceeds roughly 300–400 lines and the tools within it no longer feel cohesive, the correct response is to split by sub-domain (e.g., extract `subscriptions.ts` from `settlements.ts`) and update `index.ts`. This does not require an ADR revision — it is an application of the same principle at finer granularity.

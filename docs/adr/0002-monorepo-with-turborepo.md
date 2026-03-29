# ADR-0002: Monorepo with Turborepo and npm Workspaces

**Status:** Accepted

**Date:** 2025-01-01

---

## Context

The project contains multiple MCP servers targeting different services: `razorpay`, `zoho-crm`, and `gst-india`, with more planned. These servers share non-trivial utilities:

- `formatToolError` — consistent error formatting across all tools
- TypeScript compiler configuration (`tsconfig.base.json`)
- Build tooling (`tsup`) and test configuration (`vitest`)

The question was how to structure these servers: as independent repositories, as a single package with sub-modules, or as a monorepo.

**Independent repositories** would require publishing and versioning the shared utility package separately, adding overhead for every cross-cutting change (a bug fix in `formatToolError` would require: fix → publish `shared` → bump dep in each repo → release). With three or more servers this quickly becomes unworkable.

**Single package** would co-locate all server code but make it impossible to publish each server independently on npm — users would install the entire bundle even if they only need Razorpay.

**Monorepo with npm workspaces** allows independent packages while sharing code via workspace protocol (`"@mcp-india/shared": "*"`), without publishing the shared package to a registry during development.

Turborepo was chosen over alternatives (Nx, Lerna, manual scripts) because it adds a task pipeline layer on top of npm workspaces with minimal configuration: `turbo.json` specifies that `build` depends on `build` in dependencies, which means `tsup` for `razorpay` will not run until `shared` has built its types. Turborepo also provides remote caching (optional) and incremental local caching via `.turbo/`.

## Decision

We will use **Turborepo** (`turbo ^2.4.0`) together with **npm workspaces** to manage the monorepo.

All packages live under `packages/`. The root `package.json` defines the workspace globs and delegates `build`, `test`, `lint`, `typecheck`, and `clean` to `turbo run <task>`. The pipeline in `turbo.json` declares dependency ordering so shared utilities always compile before the servers that consume them.

## Consequences

**Positive:**
- Shared utilities (`@mcp-india/shared`) are developed, tested, and built in the same repository as the servers that use them. A single PR can fix a shared helper and update two servers simultaneously.
- Incremental builds: Turborepo caches task outputs by content hash. Unchanged packages are skipped on subsequent `turbo run build` invocations, keeping CI and local build times short as the monorepo grows.
- Consistent tooling: one root `tsconfig.base.json`, one `vitest.config.ts` pattern, one lint configuration — all packages extend the same base settings.
- Each package is published independently to npm under the `@mcp-india` scope, so users install only what they need.

**Negative / trade-offs:**
- Added complexity for contributors unfamiliar with monorepos: understanding workspace symlinks, `turbo run` task ordering, and why `npm install` at the root is different from `npm install` inside a package directory.
- `npm install` must be run from the repository root, not from individual package directories, to ensure workspace links resolve correctly.
- Turborepo's cache invalidation is based on file hashes. Changes to `turbo.json` or the root `package.json` invalidate the entire cache.

**Neutral / follow-on work:**
- Remote caching (Vercel Remote Cache or self-hosted) is not configured. It can be added later by running `turbo login` and `turbo link` without any code changes.
- When `zoho-crm` and `gst-india` packages are added, they will follow the same `packages/<name>/` structure and be included automatically via the `"packages/*"` workspace glob.

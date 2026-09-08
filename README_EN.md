<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero-dark.svg" />
    <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero.svg" alt="React Query Helper: Your API. Query-ready. TypeScript in, reusable options out." width="1120" />
  </picture>
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  Keep your API functions. Generate the repetitive query setup.<br />
  Type-safe TanStack Query v5 option factories, built from TypeScript.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/%40uiwwsw%2Freact-query-helper?style=flat-square&amp;label=npm&amp;color=133c35" alt="Published npm version" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/actions/workflows/ci.yml"><img src="https://github.com/uiwwsw/react-query-helper/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status on main" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-f38466?style=flat-square" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md">Configuration and recipes</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#migrating-from-1x">Migrate from 1.x</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/README.md">한국어</a>
</p>

> **Version notice:** This README describes **2.x**. Check the npm badge above for the published version. If you use 1.x, read the [1.3.0 docs](https://github.com/uiwwsw/react-query-helper/blob/v1.3.0/README_EN.md) and [migration guide](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#migrating-from-1x). To try changes not yet published, [install from source](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#install-from-source-before-npm-publication).

## What Does It Remove?

Stop repeating keys and request options across components, prefetching, and cache reads.
**This is not a hook generator or an HTTP client.** Keep your existing API functions and TanStack Query.

| Without generation                     | With React Query Helper                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| Query keys repeated across call sites  | Keys derived from file paths, functions, and arguments      |
| Duplicate options for the same request | Reuse with query hooks, suspense, fetch, and prefetch       |
| Types maintained separately from APIs  | Inferred arguments, results, select, and cache data         |
| Manual cleanup when APIs change        | Watch regeneration, owned-file cleanup, CI freshness checks |

Caching and retries follow TanStack Query/QueryClient defaults.
Name-based generation rules are [explicitly configurable](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#generation-rules).

<a id="quick-start"></a>

## Quick Start

### 1. Install and Initialize

```sh
npm install @uiwwsw/react-query-helper@^2 @tanstack/react-query react
npx @uiwwsw/react-query-helper init
```

Install as a regular dependency, not with `-D`: generated code imports the runtime helpers.
Only add React and TanStack Query if your app does not already have them.

### 2. Point to Your APIs

Adjust the paths in the generated `rqh.config.ts` to match your app.
No custom plugins or import aliases are required.

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper/config";

export default {
  sourceDir: "./libs",
  outputDir: "./src/options",
  ignoredFiles: ["domain.ts", "adaptor.ts", "**/*.test.ts", "**/*.spec.ts"],
  template: { artifactStrategy: "smart" },
} satisfies AutoQueryConfig;
```

Place your existing API functions there. This minimal example demonstrates the flow:

```ts
// libs/users/api.ts
export const getUser = async (id: string) => ({ id, name: "Ada" });
```

### 3. Generate and Use

```sh
npx @uiwwsw/react-query-helper generate
```

The output `src/options/users/apiOptions.ts` exports `getUserKey`, `getUserQueryOption`,
and `getUserInfiniteQueryOption`. **Edit the source API, not the generated file.**
An infinite-query factory is generated too; configure pagination explicitly for your API.

```tsx
// src/UserName.tsx
import { useQuery } from "@tanstack/react-query";
import { getUserQueryOption } from "./options/users/apiOptions";

export function UserName({ id }: { id: string }) {
  const user = useQuery(
    getUserQueryOption.withOptions(
      { staleTime: 60_000, select: (data) => data.name },
      id,
    ),
  );

  if (user.isPending) return <p>Loading...</p>;
  if (user.isError) return <p>{user.error.message}</p>;
  return <p>{user.data}</p>;
}
```

Wrap the app in `QueryClientProvider`. The selected `user.data` is inferred as `string`.
Reuse the same factory outside components:

```ts
// With your existing QueryClient instance, client
await client.prefetchQuery(getUserQueryOption("u1"));
const cached = client.getQueryData(getUserQueryOption("u1").queryKey);
// { id: string; name: string } | undefined
```

### 4. Connect Your Workflow

```json
{
  "scripts": {
    "query:generate": "react-query-helper generate",
    "query:watch": "react-query-helper watch",
    "query:check": "react-query-helper generate --check"
  }
}
```

Use `npm run query:watch` during development and `npm run query:check` in application CI.
Check never writes files; missing, changed, or stale output causes exit code 1.
If you do not commit generated files, run `query:generate` before the application's typecheck instead.

## Find a Recipe

| Task                                              | Guide                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Config files, paths, and ignore globs             | [Configuration](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#configuration)                       |
| Choose query/mutation output per function         | [Generation and cache keys](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#generation-rules)        |
| Mutation arguments, cancellation, overrides       | [Runtime options](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#runtime-options)                   |
| Cursor pagination and `maxPages`                  | [Infinite queries](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#infinite-queries)                 |
| Upgrade an existing 1.x application               | [Migration checklist](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#migrating-from-1x)             |
| Unsupported syntax and custom plugins             | [Scope and extensions](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#scope-and-extensions)         |
| Tests, local installation, npm publishing         | [Development and releases](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#development-and-releases) |
| Findings behind this release and remaining limits | [Repository review](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REVIEW.md)                                       |

## Compatibility and Boundaries

| Area           | Support                                              |
| -------------- | ---------------------------------------------------- |
| Node.js        | 22+ for CLI/build; CI covers 22/24                   |
| React          | 18/19                                                |
| TanStack Query | `>=5.102.8 <6`                                       |
| TypeScript     | 5.8+; generated code targets TS bundlers             |
| Browser        | Browser-safe root entry; separate Node tool subpaths |

- **2.x contains breaking changes.** Move legacy generated files aside, regenerate, and migrate manual keys and persisted caches.
- API arguments become part of the cache key. Use serializable values and never include tokens or authorization headers.
- Pagination and cancellation are explicit. Configure cursor mapping and forward AbortSignal to the request yourself.
- The analyzer targets top-level functions, not every TypeScript construct. Re-export barrels, methods, and all generic/overload relationships are not universally supported.

[Changelog](https://github.com/uiwwsw/react-query-helper/blob/main/CHANGELOG.md) · [Logo and brand assets](https://github.com/uiwwsw/react-query-helper/blob/main/assets/README.md) · [MIT License](https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE)

An independent community tool, not an official React or TanStack project.

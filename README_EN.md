<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero-dark.svg" />
    <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero.svg" alt="React Query Helper logo" width="1120" />
  </picture>
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  A CLI and runtime helpers that generate query keys and TanStack Query v5 option factories (code that calls <code>queryOptions</code>, <code>infiniteQueryOptions</code> and <code>mutationOptions</code>) from TypeScript API function files.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/@uiwwsw/react-query-helper?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@uiwwsw/react-query-helper?style=flat-square" alt="License" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/uiwwsw/react-query-helper/ci.yml?branch=main&amp;style=flat-square&amp;label=CI" alt="CI status on main" /></a>
  <a href="https://tanstack.com/query"><img src="https://img.shields.io/npm/dependency-version/@uiwwsw/react-query-helper/peer/@tanstack/react-query?style=flat-square&amp;label=TanStack%20Query" alt="TanStack Query peer dependency range" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/node/v/@uiwwsw/react-query-helper?style=flat-square" alt="Node.js engine requirement" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/types/@uiwwsw/react-query-helper?style=flat-square" alt="Bundled TypeScript types" /></a>
</p>

<p align="center">
  <a href="https://react-query-helper.vercel.app/en/">Demo</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/docs/ARCHITECTURE_EN.md">Architecture</a> ·
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper">npm</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/CHANGELOG.md">Changelog</a> ·
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/README.md">한국어</a>
</p>

> **Version notice:** This README describes **2.x**. Check the npm badge above for the published version. If you use 1.x, read the [1.3.0 docs](https://github.com/uiwwsw/react-query-helper/blob/v1.3.0/README_EN.md) and [migration guide](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#migrating-from-1x). To try changes not yet published, [install from source](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#install-from-source-before-npm-publication).

Keep the TypeScript API functions you already have; the CLI generates query keys and TanStack Query v5 option factories (`queryOptions`, `infiniteQueryOptions`, `mutationOptions`) from them. Your API code is not changed, and no OpenAPI spec is needed.

## How it differs

- **Your API code stays as it is.** Generated files go to `outputDir` and only import your API functions, so existing `fetch` or axios wrappers with auth headers, interceptors and error handling keep working. [Orval](https://orval.dev), [Kubb](https://kubb.dev) and [Hey API](https://heyapi.dev) generate the API functions themselves from an OpenAPI spec, so hand-written API functions are replaced by generated ones (you can plug in your own fetch instance).
- **No spec required.** It works from TypeScript functions alone, including projects whose backend has no OpenAPI spec.
- **No hand-written keys.** [`@lukemorales/query-key-factory`](https://github.com/lukemorales/query-key-factory) needs the key structure written by hand; this tool derives keys from the file path and function name and generates the option factories too.
- **Types come from the original function.** Arguments, return values and `select` results are inferred, not declared again.
- **It follows API changes.** `watch` regenerates, and `generate --check` catches stale generated files in CI.

## What works now

- `generate`: for each top-level function in `sourceDir`, writes a key constant and query, infinite-query and mutation option factories to `*Options.ts`.
- Keys are built from the source path's directories, the file name and the function name.
- The function name prefix (`get`, `list`, `create` and so on) picks what is generated. Configuration can change this.
- Mutations of functions with two or more arguments get a variables object type and `mapVariablesToArgs`.
- `withOptions` overrides `staleTime`, `select` and similar; argument, result and `select` result types are inferred.
- `generate --check`: writes nothing and exits with code 1 when output is missing, changed or stale.
- `watch`: regenerates when the sources, the config file or a listed local plugin changes.
- Generated files carry an ownership header on the first line; an existing file without it is not overwritten and causes an error.
- `customAnalyzerPath` and `customTemplatePath` replace the analyzer and the template.

## Not done / planned

- Reading OpenAPI, Swagger or other spec files.
- Hook generation. `useQuery` and the rest are called from TanStack Query directly.
- HTTP client generation. Your existing API functions are called as they are.
- Clients other than React (Vue, Svelte, Solid and so on). Only TanStack Query v5 for React is targeted.
- Mock generation.
- Guessing pagination cursors or forwarding `AbortSignal`. Both are configured per API.
- Analysis of re-export barrels, class or object methods, and functions returned by higher-order functions.
- Preserving every generic/overload relationship in the option factory types.
- Deducing HTTP semantics from function names. When a name does not follow the prefix rules, set it with `artifactsByName`.
- `watch` noticing changes in external files that the config imports. A restart is needed.
- Directory-wide transactions. Writes are atomic per file only.
- Running generated files directly in Node ESM. They target TypeScript bundlers.
- Automatic migration of unmarked 1.x generated files. They must be moved by hand.

<a id="quick-start"></a>

## Install and Use

```sh
npm install @uiwwsw/react-query-helper@^2 @tanstack/react-query react
npx @uiwwsw/react-query-helper init
```

Generated code imports this package, so install it as a regular dependency (do not use `-D`).

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper/config";

export default {
  sourceDir: "./libs",
  outputDir: "./src/options",
  template: { artifactStrategy: "smart" },
} satisfies AutoQueryConfig;
```

```ts
// libs/users/api.ts
export const getUser = async (id: string) => ({ id, name: "Ada" });
```

Running `npx @uiwwsw/react-query-helper generate` writes `src/options/users/apiOptions.ts`.

```ts
// Generated by @uiwwsw/react-query-helper. DO NOT EDIT.
// Source root: "../../libs"
import { getUser } from "../../../libs/users/api";
import {
  queryOption as __rqh_query,
  infiniteOption as __rqh_infinite,
} from "@uiwwsw/react-query-helper";

export const getUserKey = ["users", "api", "getUser"] as const;
export const getUserQueryOption = __rqh_query(getUserKey, getUser);
export const getUserInfiniteQueryOption = __rqh_infinite(getUserKey, getUser);
```

Do not edit the generated file; change the source API instead. Usage:

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

```ts
// With your existing QueryClient instance, client
await client.prefetchQuery(getUserQueryOption("u1"));
const cached = client.getQueryData(getUserQueryOption("u1").queryKey);
// { id: string; name: string } | undefined
```

API arguments become part of the cache key. Do not pass tokens or authorization headers as arguments.

## Docs

- [Configuration and usage reference](docs/REFERENCE_EN.md): CLI, configuration, generation rules, runtime options, infinite queries, migrating from 1.x
- [Sections moved from the README](docs/GUIDE_EN.md): full feature list, step-by-step install, recipe table, compatibility, dependencies, demo
- [Architecture and dependencies](docs/ARCHITECTURE_EN.md): module layout, comparison with similar tools
- [Repository review](docs/REVIEW.md) · [Changelog](CHANGELOG.md) · [Demo](https://react-query-helper.vercel.app/en/)

## License

[MIT License](LICENSE)

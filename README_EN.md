<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero-dark.svg" />
    <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/readme-hero.svg" alt="React Query Helper logo" width="1120" />
  </picture>
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  Keep your existing TypeScript API functions; generate and sync the TanStack Query layer (query keys and options) on top of them
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

**No OpenAPI required. Keep your existing API. Automate the query layer.** React Query Helper generates query keys and TanStack Query v5 option factories (`queryOptions`, `infiniteQueryOptions`, `mutationOptions`) from the TypeScript API functions you already have, and regenerates them when the API changes.

## Why React Query Helper?

TanStack Query already provides `queryOptions` for reusable, type-safe query definitions. But you still connect each API function to those options by hand:

```ts
export const userOptions = (id: string) =>
  queryOptions({ queryKey: ["users", id], queryFn: () => getUser(id) });
```

Across hundreds of API functions and several developers, key naming, the link between functions and options, and keeping them in sync when arguments change become repetitive work. React Query Helper fixes that connection in a generator. TanStack Query still handles caching, retries and fetching; this tool generates only the code that connects your API to it.

## How it differs

- **Your API layer stays.** Generated files go to `outputDir` and only import your API functions, so existing `fetch` or axios wrappers with auth headers, interceptors, error handling and response transforms, and your business logic, stay as they are. [Orval](https://orval.dev), [Kubb](https://kubb.dev) and [Hey API](https://heyapi.dev) generate the API functions themselves from an OpenAPI spec, so hand-written API functions are replaced by generated ones (you can plug in your own fetch instance).
- **No spec required.** The input is the TypeScript functions you already have, including projects whose OpenAPI or Swagger spec is missing or out of date.
- **One key convention, automatically.** `getUser` in `libs/users/api.ts` becomes `["users", "api", "getUser"]`, so developers stop inventing their own key names. [`@lukemorales/query-key-factory`](https://github.com/lukemorales/query-key-factory) needs the key structure declared by hand; this tool also generates the option factories.
- **No repeated type declarations.** Arguments, return values and `select` results are inferred from the original function.
- **Generated code is ordinary TypeScript.** Real `.ts` files, not runtime API discovery, so they show up in code review and you can jump to definitions in your IDE. There is no extra cache or query engine.
- **API and query layer stay in sync.** `watch` regenerates on API changes, and `generate --check` catches stale generated files in CI.
- **Adapts to your project.** Choose artifacts per function (`artifactsByName`), or replace the analyzer (`customAnalyzerPath`) and template (`customTemplatePath`).

## Made for projects like these

- An existing `fetch` or axios API layer with auth and error handling
- A backend without an OpenAPI spec, or with one that does not match reality
- Many API functions and several developers who need one query key convention
- Teams standardizing TanStack Query usage without rewriting existing code

## What works now

- `generate`: for each top-level function in `sourceDir`, writes a key constant and query, infinite query and mutation option factories to `*Options.ts`.
- The function-name prefix picks the artifacts: `get`, `list`, `fetch` and similar get query and infinite query; `create`, `update`, `delete` and similar get a mutation; other names get query and mutation. `artifactsByName` and `enabledArtifacts` set them explicitly.
- Infinite query options take their paging rules from `withOptions` (`initialPageParam`, `getNextPageParam`); without them only the first page loads.
- Mutations of functions with two or more arguments get a variables object type and `mapVariablesToArgs`.
- `withOptions` overrides `staleTime`, `select` and others, with argument, return and `select` result types inferred.
- `generate --check` writes nothing and exits with code 1 when output is missing, changed or stale.
- `watch` regenerates when sources, the config or listed local plugins change.
- An ownership header on the first line marks generated files; unmarked existing files are never overwritten.

## Planned

- **Choose artifacts with JSDoc,** such as `/** @rqh mutation */` next to the function. Today `artifactsByName` in the config does this.
- **Infinite queries on request,** generated only for functions that paginate. Today `enabledArtifacts` or `artifactsByName` turn them off.
- **Keys that survive file moves,** with a namespace independent of the file path so refactoring does not change cache keys.
- **Preview before installing:** paste API functions into the demo and see the keys and options that would be generated.
- **Wider analysis:** re-export barrels, class and object methods, functions returned by higher-order functions.
- **Beyond React:** TanStack Query for Vue, Solid and Svelte.
- **Optional OpenAPI input,** generating new spec-based APIs and existing functions from one config.

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

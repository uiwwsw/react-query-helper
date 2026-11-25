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

## What it provides

- `init`: writes a starter `rqh.config.ts`. An existing config file is not overwritten.
- `generate`: reads top-level functions from the TypeScript files in `sourceDir` and writes `*Options.ts` files.
- For each function, a key constant `<functionName>Key`. The key is built from the source path's directories, the file name and the function name.
- For each function, factories that call the `queryOption`, `infiniteOption` and `mutationOption` helpers.
- The function name prefix (`get`, `list`, `create`, and so on) decides whether a query, infinite query or mutation is generated. Configuration can change this.
- For mutations of functions with two or more arguments, a variables object type and `mapVariablesToArgs`.
- `withOptions` on each factory overrides TanStack Query options such as `staleTime` and `select`. Argument, result and `select` result types are inferred.
- The same factory can be reused in `useQuery`, `useSuspenseQuery`, `prefetchQuery` and `getQueryData`.
- `generate --check`: writes nothing and exits with code 1 when output is missing, changed or stale.
- `watch`: regenerates when the sources, the config file or an explicitly listed local plugin file changes.
- An ownership header on the first line of each generated file. Only files with the header are updated or deleted; an existing file without it is not overwritten and causes an error.
- `customAnalyzerPath` and `customTemplatePath` replace the analyzer and the template.

Generation rules are [configurable](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#generation-rules).

<a id="quick-start"></a>

## Install and Use

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

The input `libs/users/api.ts` produces `src/options/users/apiOptions.ts`.
The import path and the `Source root` comment depend on where you place the directories.

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

**Edit the source API, not the generated file.**
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

## Not included

- Hooks. `useQuery` and the rest come from TanStack Query.
- An HTTP client. Your existing API functions are called as they are.
- Caching, retries and `QueryClient`. Defaults follow TanStack Query/`QueryClient`.
- Reading OpenAPI or other spec files. The input is TypeScript source files.
- Guessing pagination or request cancellation. Configure cursor mapping and forward `AbortSignal` to the request yourself.
- Analysis of re-export barrels, class or object methods, and functions returned by higher-order functions. The default target is top-level functions.
- Preserving every generic/overload relationship in the option factory types. Use a concrete wrapper or a custom template when you need it.
- Running generated files directly in Node ESM. Generated code targets TypeScript bundlers.
- Official React or TanStack status. This is an independent community tool.

## Built on

- [TanStack Query](https://tanstack.com/query): provides caching, retries, `QueryClient` and hooks. Generated code calls `queryOptions`, `infiniteQueryOptions` and `mutationOptions`. It is a peer dependency.
- [TypeScript](https://www.typescriptlang.org): its compiler API parses source files to extract the function list.
- [Prettier](https://prettier.io): formats the generated output.
- [Jiti](https://github.com/unjs/jiti): loads TypeScript config and plugin files.
- [picomatch](https://github.com/micromatch/picomatch): handles the `ignoredFiles` globs.
- [chokidar](https://github.com/paulmillr/chokidar): watches files for `watch`.

If you have an OpenAPI spec, also consider spec-based tools such as [Orval](https://orval.dev), [Kubb](https://kubb.dev) and [Hey API](https://heyapi.dev). Comparison and limits are in [Architecture and dependencies](https://github.com/uiwwsw/react-query-helper/blob/main/docs/ARCHITECTURE_EN.md).

## Find a Recipe

| Task                                                                     | Guide                                                                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Config files, paths, and ignore globs                                    | [Configuration](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#configuration)                       |
| Choose query/mutation output per function                                | [Generation and cache keys](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#generation-rules)        |
| Mutation arguments, cancellation, overrides                              | [Runtime options](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#runtime-options)                   |
| Cursor pagination and `maxPages`                                         | [Infinite queries](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#infinite-queries)                 |
| Upgrade an existing 1.x application                                      | [Migration checklist](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#migrating-from-1x)             |
| Unsupported syntax and custom plugins                                    | [Scope and extensions](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#scope-and-extensions)         |
| Tests, local installation, npm publishing                                | [Development and releases](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REFERENCE_EN.md#development-and-releases) |
| Module roles, dependencies, relation to TanStack Query and similar tools | [Architecture and dependencies](https://github.com/uiwwsw/react-query-helper/blob/main/docs/ARCHITECTURE_EN.md)                  |
| Findings behind this release and remaining limits                        | [Repository review](https://github.com/uiwwsw/react-query-helper/blob/main/docs/REVIEW.md)                                       |

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

## Demo

[한국어 데모](https://react-query-helper.vercel.app/) · [English demo](https://react-query-helper.vercel.app/en/)

The demo shows query, mutation and infinite-query output produced by this package's analyzer and generator. It does not call a live API. Deployment notes: [docs/SEO.md](https://github.com/uiwwsw/react-query-helper/blob/main/docs/SEO.md).

## License

[MIT License](https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE) · [Changelog](https://github.com/uiwwsw/react-query-helper/blob/main/CHANGELOG.md) · [Logo and brand assets](https://github.com/uiwwsw/react-query-helper/blob/main/assets/README.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/logo.svg" alt="React Query Helper" width="120" />
</p>

# React Query Helper

Generate **TanStack Query v5 option factories** from TypeScript API functions.
Use the results with `useQuery`, `useSuspenseQuery`, `useMutation`, `useInfiniteQuery`,
and QueryClient fetch/prefetch APIs. This package generates options, not React hooks.

[한국어](README.md) · [npm](https://www.npmjs.com/package/@uiwwsw/react-query-helper) · [Changelog](CHANGELOG.md)

## Requirements

- Node.js 22+ for the CLI/build; CI tests Node 22 and 24.
- React 18/19 and `@tanstack/react-query >=5.102.8 <6`.
- TypeScript 5.8+ and a bundler capable of handling generated TypeScript.
- The root entry is browser-safe. Node-only tools live under `/core/analyzer` and `/core/generator`.
- Bun can install this package in an application. Repository builds and CI use npm.

## Quick Start

Install as a runtime dependency: generated files import the helpers.
Skip React/TanStack installation if your application already has them.

```sh
npm install @uiwwsw/react-query-helper @tanstack/react-query react
npx @uiwwsw/react-query-helper init
```

The starter config needs no nonexistent plugin files or project-specific aliases:

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

```ts
// libs/users/api.ts
export const getUser = async (id: string) => ({ id, name: "Ada" });

export const updateUser = async (id: string, body?: { name: string }) => ({
  id,
  name: body?.name ?? "Ada",
});
```

```sh
npx @uiwwsw/react-query-helper generate
```

The output `src/options/users/apiOptions.ts` exports `getUserKey`,
`getUserQueryOption`, `getUserInfiniteQueryOption`, `updateUserKey`,
`updateUserMutationVariables`, and `updateUserMutationOption`. Do not hand-edit generated files.

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserKey,
  getUserQueryOption,
  updateUserMutationOption,
} from "./options/users/apiOptions";

export function User({ id }: { id: string }) {
  const client = useQueryClient();
  const user = useQuery(
    getUserQueryOption.withOptions(
      {
        staleTime: 60_000,
        select: (data) => data.name,
      },
      id,
    ),
  );
  const update = useMutation(
    updateUserMutationOption.withOptions({
      onSuccess: () => client.invalidateQueries({ queryKey: getUserKey }),
    }),
  );
  return (
    <button onClick={() => update.mutate({ id, body: { name: "Grace" } })}>
      {user.data ?? "Loading"}
    </button>
  );
}
```

Wrap your app in `QueryClientProvider`. Helpers use the official options helpers and
data tags, so `client.getQueryData(getUserQueryOption(id).queryKey)` infers the API result.

## CLI

| Command                          | Behavior                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `init`                           | Create a starter config in the current directory without overwriting an existing config |
| `generate`                       | Analyze all sources, update changed outputs, remove stale files owned by this generator |
| `generate --check`               | Read-only freshness check; exits 1 for missing, changed, or stale output                |
| `watch`                          | Generate initially, then watch source, config, and explicitly configured local plugins  |
| `--config ./tools/rqh.config.ts` | Use an explicit config path; directories resolve relative to that config                |
| `help`                           | Display usage                                                                           |

The `--init`, `--generate`, `--watch`, and `--help` aliases remain supported.
Invalid arguments/config/plugins/sources and generation failures exit 1.
During watch, a failed pass preserves previous output and retries on the next save.

```json
{
  "scripts": {
    "query:generate": "react-query-helper generate",
    "query:watch": "react-query-helper watch",
    "query:check": "react-query-helper generate --check"
  }
}
```

## Configuration

Config extensions: `rqh.config.ts/mts/cts/js/mjs/cjs`. Discovery searches upward from
the current directory; multiple candidates in the nearest config directory are an error.
An invalid or explicitly missing config never falls back silently. With no config at all,
the default is `./libs → ./src/options`.

TypeScript config/plugin imports are loaded using Jiti. Use default exports for ESM and
`module.exports` for CommonJS. Config and plugin modules execute as development code:
only load modules you trust.

| Option               | Default / purpose                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `sourceDir`          | `./libs`; must exist                                                                           |
| `outputDir`          | `./src/options`; must not equal or contain sourceDir                                           |
| `ignoredFiles`       | `["domain.ts", "adaptor.ts"]`; basename or glob, including root matches for `**/*.spec.ts`     |
| `sourceImportAlias`  | Relative imports by default; aliases such as `@/api` also require app/bundler configuration    |
| `templateDir`        | Helper import module/path, default `@uiwwsw/react-query-helper`; not an EJS template directory |
| `analyzer`           | Export, async-keyword, and name filters                                                        |
| `template`           | Artifact selection, per-function rules, naming and key style                                   |
| `customAnalyzerPath` | File/package exporting `analyzeFile(filePath, config)`                                         |
| `customTemplatePath` | File/package exporting `generateOptionsCode(params)`                                           |

The init template also ignores test/spec files. Declaration files, node_modules, .git,
and outputDir are excluded. Nested output directories do not recursively generate themselves.
Source symlinks are not followed; symlinks inside generated destinations are rejected.

## Generation Rules

The analyzer reads top-level declarations, arrow functions, and function expressions in
`.ts/.tsx` files. It supports default exports, local `export { fn as alias }`, overload
implementations, and `as`/`satisfies` wrappers. Private and ambient declarations are excluded by default.

Smart generation is a **name heuristic**, not HTTP or semantic analysis.

| Function prefix                                                   | Artifacts        |
| ----------------------------------------------------------------- | ---------------- |
| `getUser`, `listUsers`, `fetchItems` and other read prefixes      | query + infinite |
| `createUser`, `updateUser`, `deleteUser` and other write prefixes | mutation         |
| Unclassified names                                                | query + mutation |

```ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper/config";

export default {
  sourceDir: "./libs",
  outputDir: "./src/options",
  template: {
    enabledArtifacts: ["query", "mutation", "infinite"],
    artifactsByName: { getUser: ["query"], listUsers: ["infinite"] },
    artifactStrategy: "smart", // "all" generates every enabled artifact
    keyStyle: "path",
  },
  analyzer: {
    exportFilter: "exported-only",
    functionMatchMode: "all", // async-only/sync-only inspect the async keyword
    excludeNames: ["debugHelper"],
  },
} satisfies AutoQueryConfig;
```

`enabledArtifacts: []` disables generation. Filters use exported names.
`importNames` and `outputNames` customize helper identifiers and output suffixes.
Invalid or conflicting generated identifiers fail explicitly.

Default prefixes include all source-relative directories, the filename, and the function.
For `users/api.ts#getUser`, the prefix is `["users", "api", "getUser"]`.
Query keys are `[...prefix, "query", args]`; infinite keys are
`[...prefix, "infinite", args]`; mutations use the prefix. `file-only` and
`function-only` reduce namespacing and can collide across files.

## Runtime Options

Query/infinite factories expose `.withOptions(options, ...args)`; mutation factories expose
`.withOptions(options)`. TanStack options including `select`, `enabled`,
`staleTime: "static"`, `meta`, `scope`, `networkMode`, and `onMutate` pass through.
Optimistic rollback types are preserved.

Helpers do not force infinite cache lifetime or disable focus refetching.
Configure these policies using QueryClient defaults or per-call overrides.

Cancellation requires forwarding the provided signal to your actual API request.
The wrapper does not guess where to insert an AbortSignal into arbitrary function arguments.
Overrides receive the TanStack context, including client and meta.

```ts
import { queryOption } from "@uiwwsw/react-query-helper";

const getUser = (id: string, signal?: AbortSignal) =>
  fetch("/api/users/" + id, { signal }).then((r) => {
    if (!r.ok) throw new Error("Request failed");
    return r.json() as Promise<{ id: string; name: string }>;
  });

const userOptions = queryOption(["user"], getUser);
const options = userOptions.withOptions(
  {
    queryFn: ({ args: [id], signal }) => getUser(id, signal),
  },
  "u1",
);
```

Arguments changed through `args`/`mapArgs` also affect the key. Use serializable arguments
and keep tokens/authorization headers out of cache keys. Inject secrets inside queryFn,
or provide a safe explicit key containing a stable user/tenant identifier.
A full `queryKey` override replaces automatic namespacing too: keep query/infinite keys separate.

Single array mutation arguments stay arrays. Generated multi-argument factories accept
named objects and preserve optional properties. Destructuring/rest forms use tuples.
Direct multi-argument helpers require an explicit mapper or tuple mode:

```ts
import { mutationOption } from "@uiwwsw/react-query-helper";

const saveMany = mutationOption(["saveMany"], (ids: string[]) => ids.length);
const update = mutationOption(
  ["update"],
  (id: string, name: string) => ({ id, name }),
  { variablesMode: "tuple" },
);
// useMutation(saveMany()).mutate(["u1", "u2"])
// useMutation(update()).mutate(["u1", "Ada"])
```

## Infinite Queries

Configure `initialPageParam`, `getNextPageParam`, and argument mapping for your API.
The data type is `InfiniteData<Page, PageParam>`, with inferred select results.
Calling the base factory without overrides fetches one page and stops.

```ts
import { infiniteOption } from "@uiwwsw/react-query-helper";

const listUsers = async (params: { page: number }) => ({
  items: [{ id: String(params.page) }],
  nextPage: params.page < 3 ? params.page + 1 : undefined,
});
const listOptions = infiniteOption(["users"], listUsers);

const options = listOptions.withOptions(
  {
    initialPageParam: 0,
    pageParamToArgs: (page, [params]) => [{ ...params, page }],
    getNextPageParam: (lastPage) => lastPage.nextPage,
    maxPages: 3,
  },
  { page: 0 },
);
// useInfiniteQuery(options).data?.pages
```

Return undefined or null when pagination ends; zero is a valid cursor.
For bidirectional pagination with maxPages, configure getPreviousPageParam too.

## Scope and Extensions

- Re-export barrels, class/object methods, and higher-order factory results are not analyzed by default.
- Generic/overload syntax can be read, but the factory does not preserve every call-dependent generic relationship or overload. Use concrete API wrappers or a custom template.
- `exportFilter: "all"` is for custom analysis/templates. The built-in generator rejects private imports.
- Watch covers sources, the config file, and directly configured local plugins. Restart after changing imported external config dependencies, packages, or adding the first config file.
- Generated TS uses extensionless bundler imports and shortens index imports to directories. Generated files are not intended for direct Node ESM execution.
- Writes are atomic per file, not a directory-wide transaction. Analysis/collision failures are checked before writes; existing output is preserved on these failures.

A custom analyzer returns objects with name, parameters, isAsync, and isExported;
optional metadata includes importName, optionalParameters, and restParameterIndex.
A custom template receives functionInfos, importPath, keySegments (directories only),
fileName, templateImportPath, and config, and must return a string.

## Migrating from 1.x

1. Upgrade to Node 22+ and TanStack Query 5.102.8+, then install version 2.x.
2. Move old generated files aside and regenerate. Version 2 refuses to overwrite files without its ownership marker.
3. Update manually constructed keys and clear persisted caches or bump the persistence buster.
4. Set explicit QueryClient defaults if infinite cache lifetime or disabled focus refetching is desired.
5. Add an argument mapper or `variablesMode: "tuple"` to direct multi-argument mutations. Single arrays no longer spread.
6. Regenerate and typecheck your application.

## Development and Releases

```sh
npm ci
npm test
npm run smoke
```

Tests cover runtime behavior, emitted TypeScript, config formats, exit failures, watch,
a real tarball install, browser bundling and NodeNext types. package-lock.json is authoritative;
the stale Bun lockfile was removed.

Main pushes and pull requests run CI. Publishing requires a vX.Y.Z tag matching package.json,
including manual runs on a tag. Publishing runs validation, tests, and consumer-package checks first.

```sh
npm version major  # choose major/minor/patch for the actual release
git push origin main --follow-tags
```

The repository NPM_TOKEN must be a valid token with publishing permission. Alternatively,
configure the npm trusted publisher for this workflow to use OIDC. Releases include provenance.
Already published versions cannot be overwritten; changes require a new version.

## Official References

- [Query Options and inference](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
- [Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [Query Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
- [Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

[MIT License](LICENSE)

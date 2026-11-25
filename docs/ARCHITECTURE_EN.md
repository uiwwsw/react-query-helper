# Architecture and Dependencies

[Back to README](../README_EN.md) · [한국어](ARCHITECTURE.md) · [Configuration and usage guide](REFERENCE_EN.md)

This page was written from the 2.x source. It lists what each module does, which packages it depends on, and how it relates to TanStack Query and similar tools.

[Data flow](#data-flow) · [Source modules](#source-modules) · [Rest of the repository](#rest-of-the-repository) · [Dependencies](#dependencies) · [Relation to TanStack Query](#relation-to-tanstack-query) · [Similar tools](#similar-tools) · [When to use something else](#when-to-use-something-else)

## Data flow

```text
API source files (.ts/.tsx)
  → core/analyzer   parse with the TypeScript compiler, extract top-level functions (FunctionInfo[])
  → core/generator  turn the function list into *Options.ts source text
  → cli             format with prettier, add an ownership header, write files, prune stale ones
  → the app imports *Options.ts
  → utils/query     queryOption etc. call TanStack Query's queryOptions etc.
```

The package has two parts: a generator that runs in Node during development (CLI, analyzer, generator, config loader), and a runtime helper (`src/utils/query.ts`) that generated code imports in the app.
Only the runtime helper ends up in an app bundle, and its single external import is `@tanstack/react-query`.

## Source modules

Every file under `src/` and `libs/`.

| File                    | What it does                                                                                                                                                                     | Exposed as                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/index.ts`          | Package root entry. Re-exports everything from `utils/query.ts` and the `AutoQueryConfig` type                                                                                   | `.` (root import)                                            |
| `src/utils/query.ts`    | Runtime helpers `queryOption`, `mutationOption`, `infiniteOption` and their types. Details below                                                                                 | `.`                                                          |
| `src/config.ts`         | The `AutoQueryConfig` interface. Types only, so the built `dist/config.js` is empty                                                                                              | `./config`                                                   |
| `src/config-loader.ts`  | Finds `rqh.config.*` by walking up from the current directory, loads it with jiti, validates option names and values, fills defaults and resolves paths. Also loads user plugins | None (it is built and used by the CLI, but not in `exports`) |
| `src/core/analyzer.ts`  | Parses one file with the TypeScript compiler API and extracts function information                                                                                               | `./core/analyzer`                                            |
| `src/core/generator.ts` | Takes function information and produces `*Options.ts` source text                                                                                                                | `./core/generator`                                           |
| `src/cli.ts`            | The `react-query-helper` command: `init`, `generate`, `generate --check`, `watch`                                                                                                | `bin`                                                        |
| `libs/users/api.ts`     | Sample API file for trying `npm run generate` in this repository; `rqh.config.ts` points at `./libs`. Not part of the published package                                          | None                                                         |

### `core/analyzer.ts`

It parses a file with `ts.createSourceFile`. It does not type-check or build a `ts.Program`, so parameter and return types are not read. It reads syntax:

- top-level `function` declarations, `const f = () => ...` and `const f = function () {}`
- `export` modifiers, `export { a as b }` and `export default`
- function expressions wrapped in parentheses, `as`, `satisfies` or `!`
- parameter names, optionality (`?` or a default value), the rest-parameter position and the `async` keyword

`declare` declarations and body-less overload signatures are skipped, and `export =` (CommonJS) throws an error. A parse error fails generation.
The `analyzer` options (`exportFilter`, `functionMatchMode`, `includeNames`, `excludeNames`) are applied here.

### `core/generator.ts`

`generateOptionsCode` is a pure function that builds code from string templates. `validIdentifier` checks identifiers with the TypeScript scanner.

- With `artifactStrategy: "smart"`, the function name prefix decides which artifacts are produced. `create`, `update`, `delete` and similar give a mutation; `get`, `list`, `fetch` and similar give query and infinite; any other name gives query and mutation. This is a naming rule and does not look at HTTP semantics or return types.
- It exports a key constant `<name>Key` shaped like `[...directories, fileName, functionName] as const`. `keyStyle` can shorten the prefix.
- A mutation for a function with two or more parameters gets a variables object type and a `mapVariablesToArgs` mapper. With a rest parameter it uses `variablesMode: "tuple"`.
- Private-function imports, invalid identifiers and duplicate names are errors.

### `utils/query.ts`

This is the only code that runs in the app. The three functions have the same shape: they take a key and an API function and return a factory, and the factory calls a TanStack Query helper to build the options object.

| Function         | TanStack helper it calls | Key layout                                      |
| ---------------- | ------------------------ | ----------------------------------------------- |
| `queryOption`    | `queryOptions`           | `[...prefix, "query", argsArray]`               |
| `infiniteOption` | `infiniteQueryOptions`   | `[...prefix, "infinite", argsArray]`            |
| `mutationOption` | `mutationOptions`        | `[...prefix]` (extend with `appendMutationKey`) |

The file adds three things: the rule that call arguments go into the key, the `withOptions` way of overriding TanStack options (`args`, `mapArgs`, `appendQueryKey`, `pageParamToArgs`, `mapVariablesToArgs` and others), and the types for these.
It contains no `QueryClient`, caching, retry logic or hooks.

### `cli.ts`

`generate` runs these steps:

1. Check that `sourceDir` is an existing directory and that `outputDir` does not contain it.
2. Load `customAnalyzerPath` and `customTemplatePath` with jiti if set, and check that they export `analyzeFile` and `generateOptionsCode`.
3. Walk `sourceDir` recursively, skipping symlinks, `node_modules`, `.git`, the output directory and paths matching `ignoredFiles` globs (picomatch).
4. Call the analyzer and generator per file and format the result with prettier, using the project's prettier config.
5. Prepend an ownership header that starts with `// Generated by @uiwwsw/react-query-helper. DO NOT EDIT.`
6. Compare with existing files. An existing file without the header is never overwritten and causes an error. A file with the header that is no longer a generation target counts as stale and is deleted.
7. With `--check`, write nothing and fail when there is a difference. Otherwise write to a temporary file and `rename` it into place.

`watch` uses chokidar on `sourceDir`, the config file and directly configured plugin files. After a change it waits 100 ms, reloads the config and runs `generate`, one pass at a time.
`init` writes a starter `rqh.config.ts` and never overwrites an existing file.

## Rest of the repository

| Location                     | Role                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/build.mjs`          | Emits type declarations with `tsc` and bundles `dist/` with esbuild. External packages are not bundled                              |
| `scripts/smoke.mjs`          | Installs the `npm pack` output into a temporary project and checks `init`/`generate`/`--check`, NodeNext types and a browser bundle |
| `scripts/verify-release.mjs` | Checks in the publish workflow that the tag matches the `package.json` version                                                      |
| `scripts/build-site.mjs`     | Builds the Korean and English demo pages, with example output from the real analyzer and generator                                  |
| `scripts/check-site.mjs`     | Checks the built demo pages: canonical, hreflang, sitemap, fonts                                                                    |
| `test/`                      | Node test runner files and `tsc` type tests. README examples are generated and type-checked for real                                |
| `site/`                      | Demo page example input (`examples.ts`), styles, script and static assets                                                           |
| `assets/`                    | Logo and README banner SVGs                                                                                                         |
| `docs/`                      | This page, the configuration guides (`REFERENCE*.md`), the review notes (`REVIEW.md`) and demo deployment notes (`SEO.md`)          |
| `.github/`                   | CI, publish and documentation-hygiene workflows, and the check script                                                               |
| `vercel.json`, `.workspace/` | Demo site deployment settings                                                                                                       |

The npm package contains `dist/`, `README_EN.md` and `CHANGELOG.md` (the `files` field), and npm adds `README.md`, `LICENSE` and `package.json` automatically.

## Dependencies

### Peer dependency

| Package                 | Range      | Used by                                                                                                                                                     |
| ----------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tanstack/react-query` | `^5.102.8` | `utils/query.ts` imports `queryOptions`, `infiniteQueryOptions`, `mutationOptions` and several types. It is a peer so the app and the helper share one copy |

React is not imported by this package directly. The supported React 18/19 range follows the peer requirements of `@tanstack/react-query`.

### Dependencies (used by the CLI and generator)

All of these are imported only by the Node-side generator. The built root entry (`dist/index.js`) imports none of them.

| Package      | What it does                      | Used in                                 | Why it is here                                                       |
| ------------ | --------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `typescript` | TypeScript compiler API           | `core/analyzer.ts`, `core/generator.ts` | Source parsing and identifier validation, using the official parser  |
| `jiti`       | Loads TS/ESM/CJS files at runtime | `config-loader.ts`                      | Reads `rqh.config.ts` and user plugins without a separate build step |
| `picomatch`  | Glob matcher                      | `cli.ts`                                | Interprets `ignoredFiles`                                            |
| `prettier`   | Code formatter                    | `cli.ts`                                | Formats generated files to match the app's prettier config           |
| `chokidar`   | File system watcher               | `cli.ts`                                | The `watch` command                                                  |

### devDependencies (repository development)

`esbuild` (bundling), `typescript` (declarations and tests), `@tanstack/react-query`, `react` and `@types/react` (tests use a real `QueryClient` and hook types), `@types/node`, `@types/picomatch`. They are not part of the published package.

Node 22 or later is required (`engines`).

## Relation to TanStack Query

This package is a code generator that calls the option helpers provided by [TanStack Query](https://tanstack.com/query). The split of responsibility:

| Belongs to TanStack Query                                                                                                                                                                                                                                                                                                                                                                                                                | Written for this package                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Caching, retries, refetching, `QueryClient`, hooks. The option-factory concept: [`queryOptions`](https://tanstack.com/query/latest/docs/framework/react/reference/queryOptions), [`infiniteQueryOptions`](https://tanstack.com/query/latest/docs/framework/react/reference/infiniteQueryOptions), [`mutationOptions`](https://tanstack.com/query/latest/docs/framework/react/reference/mutationOptions), their type inference, `DataTag` | A CLI (`generate`, `watch`, `--check`) that reads functions from TS source and writes option-factory files                   |
| Colocating options in one place. The official guide describes it as [Query Options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)                                                                                                                                                                                                                                                                         | The rule that builds keys from file path, function name and arguments, and the name-prefix rule that picks query or mutation |
|                                                                                                                                                                                                                                                                                                                                                                                                                                          | Ownership header, stale-file pruning, refusal to overwrite unowned files                                                     |
|                                                                                                                                                                                                                                                                                                                                                                                                                                          | The `withOptions` argument overrides and multi-argument mutation variable mapping                                            |

The output is the same kind of object you would get from writing `queryOptions` by hand. This package reduces the work of writing that code per function. It does not change performance or caching behavior.

## Similar tools

The descriptions below come from each project's npm description and README, checked in November 2026, and features change between versions. No benchmark or accuracy comparison against this package has been done.

| Tool                                                                                                              | Input and output                                                                                                                   | Difference from this package                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory)                                | Runtime library for defining query keys with type safety. You declare the key structure by hand                                    | No code generation. This package derives keys from file path and function name                  |
| [Orval](https://orval.dev) ([GitHub](https://github.com/orval-labs/orval))                                        | Generates TypeScript clients from OpenAPI v3 / Swagger v2 specs, with React Query among its samples                                | Input is an OpenAPI spec. This package takes existing TS functions and generates no HTTP client |
| [openapi-typescript](https://openapi-ts.dev) / [openapi-react-query](https://openapi-ts.dev/openapi-react-query/) | Turns OpenAPI schemas into TS types, plus a TanStack Query wrapper used together with `openapi-fetch`                              | Schema-based. This package reads only TS source, no schema                                      |
| [Kubb](https://kubb.dev) (`@kubb/plugin-react-query`)                                                             | A plugin that generates `useQuery`, `useMutation` and `useInfiniteQuery` hooks per operation from an OpenAPI spec (per its README) | Spec-based and generates hooks. This package generates option factories, not hooks              |
| [Hey API](https://heyapi.dev) (`@hey-api/openapi-ts`)                                                             | Generates SDKs and more from OpenAPI, with a [TanStack Query plugin](https://heyapi.dev/openapi-ts/plugins/tanstack-query)         | Spec-based. This package needs no spec and covers a much narrower scope                         |

## When to use something else

- **You have an OpenAPI spec and the server API is managed through it.** Spec-based tools such as Orval, Kubb, Hey API and openapi-react-query fit better, since they can produce types and clients from the spec. This package does not read OpenAPI.
- **You have only a few queries.** Writing `queryOptions` by hand is simpler. There is not enough repetition to justify a generator, a config file and a CI check.
- **You want to design the key structure yourself.** A key library such as `@lukemorales/query-key-factory` fits. The keys here follow fixed rules (three `keyStyle` choices) with little room for change.
- **You want generated hooks.** Look at the hook-generating tools above. This package generates only the options you pass to `useQuery`.
- **Your API uses class methods, re-export barrels or complex generics/overloads.** The analyzer does not support them; see [Scope and Extensions](REFERENCE_EN.md#scope-and-extensions).
- **Your function names do not follow prefixes like `get` or `create`.** Automatic classification will not match, and you will need `artifactsByName` per function.

[MIT License](../LICENSE)

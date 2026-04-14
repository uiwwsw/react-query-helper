<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/assets/logo.svg" alt="React Query Helper Logo" width="160" />
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  <strong>🇺🇸 English</strong> · <a href="README.md">🇰🇷 한국어</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/@uiwwsw/react-query-helper.svg?color=2563eb" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/dm/@uiwwsw/react-query-helper.svg?color=9333ea" alt="npm downloads" /></a>
  <a href="https://bundlephobia.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/bundlephobia/minzip/@uiwwsw/react-query-helper.svg?color=10b981" alt="bundle size" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981.svg" alt="license" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/types/@uiwwsw/react-query-helper.svg?color=3178c6" alt="types" /></a>
</p>
<p align="center">
  <a href="https://github.com/uiwwsw/react-query-helper"><img src="https://img.shields.io/github/stars/uiwwsw/react-query-helper?style=social" alt="github stars" /></a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0-000000.svg?logo=node.js" alt="node version" />
  <img src="https://img.shields.io/badge/Bun-ready-f97316.svg?logo=bun" alt="bun ready" />
</p>

> React Query Helper automates the creation of React Query hooks and option objects from your TypeScript API functions. Configure it once and keep your data-fetching layer consistent across your entire project.

By default, only exported functions in each file are analyzed for generation.

---

## Table of Contents

- [Why React Query Helper](#why-react-query-helper)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Generate the Configuration File](#generate-the-configuration-file)
  - [Run the Generator](#run-the-generator)
- [CLI Commands](#cli-commands)
- [Configuration Options](#configuration-options)
- [Sample Output](#sample-output)
- [Custom Helper Imports](#custom-helper-imports)
- [Best Practices](#best-practices)
- [Star History](#star-history)
- [Contributing](#contributing)
- [License](#license)

## Why React Query Helper

- **Configuration-driven automation** – Define everything once in `rqh.config.ts` and let the CLI handle the rest.
- **Built-in initialization** – Run `react-query-helper --init` to generate a starter config file instantly.
- **Watch & Generate modes** – Use `--watch` during development for live updates or `--generate` for bootstrapping and regeneration.
- **Consistent query options** – Centralize caching, retry, and error handling via `queryOption`, `mutationOption`, and `infiniteOption` utilities.
- **Prettier integration** – All emitted files are formatted automatically to minimize noisy diffs.
- **Custom helper imports** – Use `templateDir` to change where generated files import `queryOption`, `mutationOption`, and `infiniteOption` from.
- **Conservative infinite defaults** – `infiniteOption` ships with a safe baseline and expects callers to override pagination-specific `pageParam` behavior.

## Quick Start

### Installation

```bash
bun add @uiwwsw/react-query-helper
# or
yarn add --dev @uiwwsw/react-query-helper
# or
npm install --save-dev @uiwwsw/react-query-helper
```

### Generate the Configuration File

Generate `rqh.config.ts` in your project root with:

```bash
npx @uiwwsw/react-query-helper --init
# or
bunx @uiwwsw/react-query-helper --init
```

If the package is already installed in your project, you can also run:

```bash
npx react-query-helper --init
# or
npm exec react-query-helper -- --init
```

The generated file looks like this:

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "@uiwwsw/react-query-helper";

const config: AutoQueryConfig = {
  sourceDir: "./libs",        // Where your API functions live
  outputDir: "./src/options", // Where generated hooks are stored
  ignoredFiles: ["domain.ts", "adaptor.ts"],
  templateDir: "@uiwwsw/react-query-helper",
};

export default config;
```

### Run the Generator

Add scripts to `package.json` for a consistent workflow.

```jsonc
// package.json
{
  "scripts": {
    "init:rqh": "react-query-helper --init",
    "watch": "react-query-helper --watch",
    "generate": "react-query-helper --generate"
  }
}
```

```bash
bun run watch      # watch mode for live development
bun run generate   # batch generation for every API file
# or
npm exec react-query-helper -- --generate
```

## CLI Commands

| Command | Description |
| --- | --- |
| `react-query-helper --init` | Creates a default `rqh.config.ts` file in the project root without overwriting an existing config. |
| `react-query-helper --watch` | Watches `sourceDir` and regenerates hooks whenever files change. |
| `react-query-helper --generate` | Parses every API file in `sourceDir` and generates hooks in one shot. |
| `react-query-helper --help` | Displays the available options and usage details. |

## Configuration Options

| Option | Required | Description |
| --- | --- | --- |
| `sourceDir` | ✅ | TypeScript directory containing your API functions (relative to the project root). |
| `outputDir` | ✅ | Destination directory for generated hooks and option objects. |
| `ignoredFiles` | ❌ | Array of filenames to exclude from generation. |
| `templateDir` | ❌ | Module path or relative directory used for importing `queryOption`, `mutationOption`, and `infiniteOption`. |

## Infinite Query Defaults

Because pagination rules vary by API, `infiniteOption` does not merge `pageParam` into your request automatically.

Override `queryFn`, `getNextPageParam`, and `initialPageParam` in the consuming code when you need custom infinite-query behavior.

```ts
const usersInfinite = {
  ...getUsersInfiniteQueryOption({ page: 1 }),
  initialPageParam: 1,
  queryFn: ({ pageParam }) => getUsers({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
};
```

## Release Flow

GitHub Actions now publishes to npm only on `v*` tag pushes or manual workflow runs instead of every push to `main`.

Example:

```bash
git tag v1.0.3
git push origin v1.0.3
```

## Sample Output

```ts
// libs/users/api.ts
export const getUser = async (id: string) => {
  return { id, name: `User ${id}` };
};

export const createUser = async (name: string) => {
  return { id: Date.now().toString(), name };
};
```

```ts
// src/options/users/apiOptions.ts (auto-generated)
import { createUser, getUser } from "../../../libs/users/api";
import {
  infiniteOption,
  mutationOption,
  queryOption,
} from "@uiwwsw/react-query-helper";

export const getUserKey = ["users", "getUser"] as const;
export const getUserQueryOption = queryOption(getUserKey, getUser);
export const getUserMutationOption = mutationOption(getUserKey, getUser);
export const getUserInfiniteQueryOption = infiniteOption(getUserKey, getUser);

export const createUserKey = ["users", "createUser"] as const;
export const createUserQueryOption = queryOption(createUserKey, createUser);
export const createUserMutationOption = mutationOption(createUserKey, createUser);
export const createUserInfiniteQueryOption = infiniteOption(
  createUserKey,
  createUser
);
```

## Custom Helper Imports

Point `templateDir` to your shared helper module if you want generated files to import from somewhere other than the package default.

```ts
const config: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  templateDir: "./src/query-helpers",
};
```

For example, generated files will import from that path instead of `@uiwwsw/react-query-helper`.

## Best Practices

- Keep a 1:1 relationship between API functions and generated hooks to simplify cache-key reasoning.
- Commit generated files so your CI/CD pipeline doesn’t need to rebuild them during deployment.
- Define shared behavior (e.g., `staleTime`, `retry`, `refetchOnWindowFocus`) in the helper utilities for consistent usage.
- When using watch mode, align your editor’s save formatter with Prettier to avoid conflicting edits.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=uiwwsw/react-query-helper&type=Date)](https://star-history.com/#uiwwsw/react-query-helper&Date)

## Contributing

We welcome bug reports, feature suggestions, and documentation improvements. Open an issue or submit a pull request to get involved.

## License

Distributed under the [MIT License](LICENSE).

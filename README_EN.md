<p align="center">
  <img src="./assets/logo.svg" alt="React Query Helper Logo" width="160" />
</p>

<h1 align="center">React Query Helper</h1>

<p align="center">
  <strong>🇺🇸 English</strong> · <a href="README.md">🇰🇷 한국어</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/v/@uiwwsw/react-query-helper.svg?color=2563eb" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/react-query-helper"><img src="https://img.shields.io/npm/dm/@uiwwsw/react-query-helper.svg?color=9333ea" alt="npm downloads" /></a>
  <a href="https://github.com/uiwwsw/react-query-helper/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-10b981.svg" alt="license" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0-000000.svg?logo=node.js" alt="node version" />
  <img src="https://img.shields.io/badge/Bun-ready-f97316.svg?logo=bun" alt="bun ready" />
</p>

> React Query Helper automates the creation of React Query hooks and option objects from your TypeScript API functions. Configure it once and keep your data-fetching layer consistent across your entire project.

---

## Table of Contents

- [Why React Query Helper](#why-react-query-helper)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Create the Configuration File](#create-the-configuration-file)
  - [Run the Generator](#run-the-generator)
- [CLI Commands](#cli-commands)
- [Configuration Options](#configuration-options)
- [Sample Output](#sample-output)
- [Custom Templates](#custom-templates)
- [Best Practices](#best-practices)
- [Star History](#star-history)
- [Contributing](#contributing)
- [License](#license)

## Why React Query Helper

- **Configuration-driven automation** – Define everything once in `rqh.config.ts` and let the CLI handle the rest.
- **Watch & Generate modes** – Use `--watch` during development for live updates or `--generate` for bootstrapping and regeneration.
- **Consistent query options** – Centralize caching, retry, and error handling via `queryOption`, `mutationOption`, and `infiniteOption` utilities.
- **Prettier integration** – All emitted files are formatted automatically to minimize noisy diffs.
- **Template extensibility** – Override the default templates to reflect your team’s conventions and project architecture.

## Quick Start

### Installation

```bash
bun add @uiwwsw/react-query-helper
# or
yarn add --dev @uiwwsw/react-query-helper
# or
npm install --save-dev @uiwwsw/react-query-helper
```

### Create the Configuration File

Place `rqh.config.ts` in the project root.

```ts
// rqh.config.ts
import type { AutoQueryConfig } from "./src/config";

const config: AutoQueryConfig = {
  sourceDir: "./libs",        // Where your API functions live
  outputDir: "./src/options", // Where generated hooks are stored
  // ignoredFiles: ["types.ts"],
  // templateDir: "./custom-templates",
};

export default config;
```

### Run the Generator

Add scripts to `package.json` for a consistent workflow.

```jsonc
// package.json
{
  "scripts": {
    "watch": "react-query-helper --watch",
    "generate": "react-query-helper --generate"
  }
}
```

```bash
bun run watch      # watch mode for live development
bun run generate   # batch generation for every API file
```

## CLI Commands

| Command | Description |
| --- | --- |
| `react-query-helper --watch` | Watches `sourceDir` and regenerates hooks whenever files change. |
| `react-query-helper --generate` | Parses every API file in `sourceDir` and generates hooks in one shot. |
| `react-query-helper --help` | Displays the available options and usage details. |

## Configuration Options

| Option | Required | Description |
| --- | --- | --- |
| `sourceDir` | ✅ | TypeScript directory containing your API functions (relative to the project root). |
| `outputDir` | ✅ | Destination directory for generated hooks and option objects. |
| `ignoredFiles` | ❌ | Array of filenames to exclude from generation. |
| `templateDir` | ❌ | Directory with custom templates to override the defaults. |

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
import { getUser, createUser } from "../../../libs/users/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryOption, mutationOption } from "@uiwwsw/react-query-helper/utils/query";

export const useGetUserQuery = (id: string) => {
  return useQuery(queryOption(["users", id], () => getUser(id))(id));
};

export const useCreateUserMutation = () => {
  return useMutation(mutationOption(["users"], createUser)());
};
```

## Custom Templates

Specify a `templateDir` to align the generated code with your team’s guidelines.

```ts
const config: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  templateDir: "./custom-templates", // Directory with your EJS templates
};
```

Update the templates to customize imports, hook signatures, option defaults, logging, and more. The generator will pick up your changes on the next run.

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

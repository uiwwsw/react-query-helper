import { build } from "esbuild";
import { rm, chmod } from "node:fs/promises";
import { execFileSync } from "node:child_process";

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });
execFileSync(process.execPath, ["node_modules/typescript/bin/tsc"], {
  stdio: "inherit",
});
await build({
  entryPoints: [
    "src/index.ts",
    "src/config.ts",
    "src/config-loader.ts",
    "src/core/analyzer.ts",
    "src/core/generator.ts",
  ],
  outbase: "src",
  outdir: "dist",
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node22",
});
await build({
  entryPoints: ["src/cli.ts"],
  outdir: "dist",
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node22",
  banner: { js: "#!/usr/bin/env node" },
});
await chmod(new URL("../dist/cli.js", import.meta.url), 0o755);

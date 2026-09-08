import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

const repo = resolve(".");
const root = await mkdtemp(join(tmpdir(), "rqh-package-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, cwd = root) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const packed = JSON.parse(
    run(
      npm,
      ["pack", "--ignore-scripts", "--json", "--pack-destination", root],
      repo,
    ),
  )[0];
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  run(npm, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(root, packed.filename),
    "@tanstack/react-query@5.102.8",
    `react@${process.env.RQH_TEST_REACT ?? "19"}`,
    `@types/react@${process.env.RQH_TEST_REACT ?? "19"}`,
  ]);
  const cli = join(root, "node_modules/@uiwwsw/react-query-helper/dist/cli.js");
  run(process.execPath, [cli, "init"]);
  await mkdir(join(root, "libs"));
  await writeFile(
    join(root, "libs/api.ts"),
    "export const getUser = (id: string) => ({id});",
  );
  run(process.execPath, [cli, "generate"]);
  run(process.execPath, [cli, "generate", "--check"]);
  await writeFile(
    join(root, "consumer.ts"),
    `
    import { queryOption } from "@uiwwsw/react-query-helper";
    import type { AutoQueryConfig } from "@uiwwsw/react-query-helper/config";
    import { QueryClient } from "@tanstack/react-query";
    const config: AutoQueryConfig = {sourceDir: "./libs", outputDir: "./src/options"};
    const options = queryOption(["user"], (id: string) => ({id}))("1");
    export const result: Promise<{id:string}> = new QueryClient().fetchQuery(options);
  `,
  );
  run(process.execPath, [
    join(repo, "node_modules/typescript/bin/tsc"),
    "--noEmit",
    "--strict",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--target",
    "ES2022",
    "consumer.ts",
  ]);
  const browser = await build({
    entryPoints: [join(root, "consumer.ts")],
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
  });
  if (!browser.outputFiles[0]?.text)
    throw new Error("Browser bundle is empty.");
  const shebang = await readFile(cli, "utf8");
  if (!shebang.startsWith("#!/usr/bin/env node\n"))
    throw new Error("Missing CLI shebang.");
  console.log(
    "Packed package: install, NodeNext types, browser bundle, init/generate/check passed.",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}

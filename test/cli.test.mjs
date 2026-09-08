import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
  symlink,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import ts from "typescript";
import { analyzeFile } from "../dist/core/analyzer.js";
import { generateOptionsCode } from "../dist/core/generator.js";

const repo = resolve(".");
const cli = join(repo, "dist/cli.js");
async function fixture(t, files = {}) {
  const root = await mkdtemp(join(tmpdir(), "test-rqh-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}
const run = (root, ...args) =>
  spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
const success = (result) =>
  assert.equal(result.status, 0, result.stdout + result.stderr);
const config =
  'export default { sourceDir: "./api", outputDir: "./generated" };';
const source = "export const getUser = (id: string) => ({id});";
async function compile(root) {
  const files = (await readdir(join(root, "generated")))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(root, "generated", f));
  const program = ts.createProgram(files, {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
    baseUrl: repo,
    paths: { "@uiwwsw/react-query-helper": [join(repo, "dist/index.d.ts")] },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (x) => x,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
    }),
  );
}

test("fresh init generates usable config and generated code typechecks", async (t) => {
  const root = await fixture(t, { "libs/api.ts": source });
  success(run(root, "init"));
  const initial = await readFile(join(root, "rqh.config.ts"), "utf8");
  assert.doesNotMatch(initial, /customAnalyzerPath|sourceImportAlias/);
  success(run(root, "--init"));
  assert.equal(await readFile(join(root, "rqh.config.ts"), "utf8"), initial);
  success(run(root, "generate"));
  success(run(root, "generate", "--check"));
  assert.match(
    await readFile(join(root, "src/options/apiOptions.ts"), "utf8"),
    /getUserQueryOption/,
  );
});

test("config formats and imported TypeScript dependencies work without temp files", async (t) => {
  for (const ext of ["ts", "mts", "cts", "js", "mjs", "cjs"]) {
    const body = ["cts", "cjs"].includes(ext)
      ? 'module.exports = { sourceDir: "./api", outputDir: "./generated" };'
      : config;
    const root = await fixture(t, {
      [`rqh.config.${ext}`]: body,
      "api/users.ts": source,
    });
    success(run(root, "generate"));
    assert.equal(
      (await readdir(root)).some((p) => /^\.rqh\.config\./.test(p)),
      false,
    );
  }
  const root = await fixture(t, {
    "rqh.config.ts": 'import paths from "./paths.ts"; export default paths;',
    "paths.ts": 'export default {sourceDir:"./api",outputDir:"./generated"};',
    "api/users.ts": source,
  });
  success(run(root, "generate"));
});

test("bad configs, missing paths, conflicting flags and bad plugins fail without writing output", async (t) => {
  const invalid = [
    "export default null",
    "export default []",
    "export const sourceDir = './api'",
    "export default {sourceDir: 4}",
    "export default {sourceDir:'./missing'}",
    "export default {sourceDir:'./api',ignoredFiles:'foo'}",
    "export default {sourceDir:'./api',template:{enabledArtifacts:['oops']}}",
    "export default {sourceDir:'./api',outputDir:'./api'}",
    "export default {sourceDir:'./api',outputDir:'.'}",
    "export default {sourceDir:'./api',customAnalyzerPath:'./missing.ts'}",
    "export default {sourceDir:'./api',customAnalyzerPath:'./bad-plugin.ts'}",
    "export default {sourceDir:'./api',typo:true}",
  ];
  for (const body of invalid) {
    const root = await fixture(t, {
      "rqh.config.ts": body,
      "api/users.ts": source,
      "bad-plugin.ts": "export default {};",
    });
    const result = run(root, "generate");
    assert.notEqual(result.status, 0, body);
    assert.doesNotMatch(result.stdout, /Generated/);
  }
  const root = await fixture(t, {
    "rqh.config.ts": config,
    "api/users.ts": source,
  });
  assert.notEqual(run(root, "generate", "watch").status, 0);
  assert.notEqual(run(root, "--config").status, 0);
  assert.notEqual(run(root, "generate", "--config", "missing.ts").status, 0);
});

test("custom config path, parent discovery, ignore globs and nested output avoid recursion", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts":
      'export default {sourceDir:"./api",outputDir:"./api/generated",ignoredFiles:["**/*.spec.ts","internal/**"]};',
    "api/users.ts": source,
    "api/a.spec.ts": source,
    "api/nested/b.spec.ts": source,
    "api/internal/secret.ts": source,
    "api/nested/more.ts": source,
  });
  success(run(join(root, "api/nested"), "generate"));
  success(run(root, "generate"));
  const output = await readdir(join(root, "api/generated"));
  assert.deepEqual(output.sort(), ["nested", "usersOptions.ts"]);
  success(run(root, "generate", "--config", "rqh.config.ts", "--check"));
});

test("default exports, aliases, overloads, optional args, destructuring and rest generate valid TypeScript", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts": config,
    "api/functions.ts": `
      const privateFn = () => 1;
      export const get = (id: string) => id;
      const local = (id: string) => id;
      export {local as getAlias};
      export default async function getDefault(id: string) { return id; }
      export function getOverloaded(id: string): string;
      export function getOverloaded(id: string) { return id; }
      export const createArray = (ids: string[]) => ids;
      export const updateUser = (id: string, body?: {name: string}) => ({id,body});
      export const updateRest = (id: string, ...values: number[]) => ({id,values});
      export const updateDestructured = ({id}: {id:string}, flag = false) => ({id,flag});
    `,
  });
  success(run(root, "generate"));
  const output = await readFile(
    join(root, "generated/functionsOptions.ts"),
    "utf8",
  );
  assert.doesNotMatch(output, /privateFn/);
  assert.match(output, /default as getDefault/);
  assert.match(output, /body\?:/);
  assert.match(output, /variablesMode: "tuple"/);
  await compile(root);
});

test("cache keys include filenames and explicit empty artifacts generate nothing", async (t) => {
  const root = await fixture(t, { "api/a.ts": source, "api/b.ts": source });
  const a = analyzeFile(join(root, "api/a.ts"));
  const code = (fileName) =>
    generateOptionsCode(a, "./api", {
      keySegments: ["users"],
      fileName,
      templateImportPath: "@uiwwsw/react-query-helper",
    });
  assert.match(code("a"), /\["users","a","getUser"\]/);
  assert.notEqual(code("a"), code("b"));
  assert.equal(
    generateOptionsCode(a, "./api", {
      keySegments: [],
      fileName: "a",
      templateImportPath: "pkg",
      template: { enabledArtifacts: [] },
    }),
    "",
  );
});

test("stale owned files are pruned while handwritten files and failing batches are preserved", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts": config,
    "api/users.ts": source,
  });
  success(run(root, "generate"));
  await writeFile(
    join(root, "generated/manualOptions.ts"),
    "export const keep = 1;",
  );
  await writeFile(join(root, "api/users.ts"), "const privateFn = () => 1;");
  assert.notEqual(run(root, "generate", "--check").status, 0);
  success(run(root, "generate"));
  assert.deepEqual(await readdir(join(root, "generated")), [
    "manualOptions.ts",
  ]);
  await writeFile(join(root, "api/users.ts"), source);
  await writeFile(join(root, "generated/usersOptions.ts"), "// handwritten");
  assert.notEqual(run(root, "generate").status, 0);
  assert.equal(
    await readFile(join(root, "generated/usersOptions.ts"), "utf8"),
    "// handwritten",
  );
});

test("syntax errors, private generation and output collisions fail", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts": config,
    "api/users.ts": "export const broken = ;",
  });
  assert.notEqual(run(root, "generate").status, 0);
  await writeFile(join(root, "api/users.ts"), source);
  await writeFile(join(root, "api/users.tsx"), source);
  assert.notEqual(run(root, "generate").status, 0);
  assert.throws(
    () =>
      generateOptionsCode(
        [
          {
            name: "privateFn",
            parameters: [],
            isExported: false,
            isAsync: false,
          },
        ],
        "./api",
        { keySegments: [], fileName: "api", templateImportPath: "pkg" },
      ),
    /private/,
  );
});

test("output symlinks cannot overwrite a source or outside file", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts": config,
    "api/users.ts": source,
    "outside.ts": "// outside",
  });
  await mkdir(join(root, "generated"));
  await symlink(
    join(root, "outside.ts"),
    join(root, "generated/usersOptions.ts"),
  );
  assert.notEqual(run(root, "generate").status, 0);
  assert.equal(await readFile(join(root, "outside.ts"), "utf8"), "// outside");
});

test("watch is ready before announcing startup, recovers after errors and removes deleted sources", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts": config,
    "api/users.ts": source,
  });
  const child = spawn(process.execPath, [cli, "watch"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (data) => {
    logs += data;
  });
  child.stderr.on("data", (data) => {
    logs += data;
  });
  t.after(() => child.kill("SIGTERM"));
  async function until(predicate) {
    const start = Date.now();
    while (!(await predicate())) {
      if (Date.now() - start > 8000) assert.fail(logs);
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  const output = join(root, "generated/usersOptions.ts");
  await until(() => logs.includes("Watching"));
  // An immediate edit after the readiness message must not be lost.
  await writeFile(
    join(root, "api/users.ts"),
    "export const getUpdated = () => 2;",
  );
  await until(async () =>
    (await readFile(output, "utf8")).includes("getUpdatedQueryOption"),
  );
  await writeFile(join(root, "api/users.ts"), "export const broken = ;");
  await until(() => logs.includes("Expression expected"));
  await writeFile(join(root, "api/users.ts"), source);
  await until(async () =>
    (await readFile(output, "utf8")).includes("getUserQueryOption"),
  );
  await rm(join(root, "api/users.ts"));
  await until(
    async () =>
      !(await readdir(join(root, "generated"))).includes("usersOptions.ts"),
  );
  const exit = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  assert.equal(await exit, 0);
});

test("TypeScript plugins can import relative dependencies and invalid results fail", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts":
      'export default { sourceDir:"./api", outputDir:"./generated", customAnalyzerPath:"./analyzer.ts", customTemplatePath:"./template.ts" };',
    "api/users.ts": source,
    "prefix.ts": 'export const name = "getUser";',
    "analyzer.ts":
      'import {name} from "./prefix.ts"; export function analyzeFile() { return [{name,parameters:["id"],isExported:true,isAsync:false}]; }',
    "template.ts":
      'export default { generateOptionsCode({functionInfos}) {return "export const count = " + functionInfos.length + ";";} };',
  });
  success(run(root, "generate"));
  const output = join(root, "generated/usersOptions.ts");
  const before = await readFile(output, "utf8");
  assert.match(before, /count = 1/);
  await writeFile(
    join(root, "analyzer.ts"),
    "export function analyzeFile() { return [null]; }",
  );
  assert.notEqual(run(root, "generate").status, 0);
  assert.equal(await readFile(output, "utf8"), before);
});

test("anonymous defaults avoid local names and duplicate default/named exports are deduplicated", async (t) => {
  const root = await fixture(t, {
    "rqh.config.ts": config,
    "api/users.ts": `
      export const defaultExport = (value: string) => value;
      export default (count: number) => count;
      function getNamed(id: string) { return id; }
      export { getNamed };
    `,
  });
  success(run(root, "generate"));
  await compile(root);
  await writeFile(
    join(root, "api/users.ts"),
    "export default function getNamed(id: string) { return id; } export { getNamed };",
  );
  success(run(root, "generate"));
  const infos = analyzeFile(join(root, "api/users.ts"));
  assert.equal(infos.length, 1);
  await compile(root);
});

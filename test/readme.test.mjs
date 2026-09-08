import test from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  access,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const repo = resolve(".");
const documents = [
  "README.md",
  "README_EN.md",
  "docs/REFERENCE.md",
  "docs/REFERENCE_EN.md",
  "assets/README.md",
];
const blocks = (text) => [...text.matchAll(/```(\w*)\n([\s\S]*?)\n```/g)];

test("README navigation and local image links resolve", async () => {
  for (const document of documents) {
    const body = (await readFile(join(repo, document), "utf8")).replace(
      /```[\s\S]*?```/g,
      "",
    );
    const links = [
      ...[...body.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]),
      ...[...body.matchAll(/(?:href|src|srcset)="([^"]+)"/g)].map((m) => m[1]),
    ];
    for (let link of links) {
      const raw =
        "https://raw.githubusercontent.com/uiwwsw/react-query-helper/main/";
      const github = "https://github.com/uiwwsw/react-query-helper/blob/main/";
      if (link.startsWith(raw)) link = resolve(repo, link.slice(raw.length));
      else if (link.startsWith(github))
        link = resolve(repo, link.slice(github.length));
      else if (/^[a-z]+:/i.test(link)) continue;
      const [path, fragment] = link.split("#");
      const target = path
        ? resolve(repo, dirname(document), path)
        : join(repo, document);
      await access(target);
      if (!fragment) continue;
      const targetBody = await readFile(target, "utf8");
      const anchors = [...targetBody.matchAll(/^#{1,6} (.+)$/gm)].map((m) =>
        m[1]
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, "")
          .replace(/ /g, "-"),
      );
      anchors.push(
        ...[...targetBody.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]),
      );
      assert.ok(
        anchors.includes(decodeURIComponent(fragment)),
        `${document}: ${link}`,
      );
    }
  }
});

test("brand assets are self-contained accessible SVGs", async () => {
  for (const name of ["logo", "readme-hero", "readme-hero-dark"]) {
    const svg = await readFile(join(repo, "assets", `${name}.svg`), "utf8");
    assert.match(svg, /<svg[^>]+viewBox="0 0 \d+ \d+"/);
    assert.match(svg, /role="img" aria-labelledby="title desc"/);
    assert.match(svg, /<title id="title">[^<]+<\/title>/);
    assert.match(svg, /<desc id="desc">[^<]+<\/desc>/);
    assert.doesNotMatch(
      svg,
      /<(?:script|foreignObject|image)\b|\son\w+=|(?:href|src)=|@import/i,
    );
  }
});

for (const suffix of ["", "_EN"]) {
  test(`README${suffix} examples generate and typecheck unchanged`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), "rqh-readme-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const readme = blocks(
      await readFile(join(repo, `README${suffix}.md`), "utf8"),
    );
    const reference = blocks(
      await readFile(join(repo, `docs/REFERENCE${suffix}.md`), "utf8"),
    );
    const find = (items, needle) => {
      const block = items.find((m) => m[2].includes(needle));
      assert.ok(block, `Missing documented example: ${needle}`);
      return block[2];
    };
    const files = {
      "rqh.config.ts": find(readme, "// rqh.config.ts"),
      "libs/users/api.ts": `${find(readme, "// libs/users/api.ts")}\n${find(reference, "export const updateUser")}`,
      "src/UserName.tsx": find(readme, "// src/UserName.tsx"),
      "src/RenameUser.tsx": find(reference, "// src/RenameUser.tsx"),
      "src/prefetch.ts": `import { QueryClient } from "@tanstack/react-query";
import { getUserQueryOption } from "./options/users/apiOptions";
const client = new QueryClient();
${find(readme, "await client.prefetchQuery")}
const checked: { id: string; name: string } | undefined = cached;`,
    };
    for (const [path, body] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), body);
    }
    for (const args of [["generate"], ["generate", "--check"]]) {
      const result = spawnSync(
        process.execPath,
        [join(repo, "dist/cli.js"), ...args],
        {
          cwd: root,
          encoding: "utf8",
        },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const program = ts.createProgram(
      Object.keys(files).map((p) => join(root, p)),
      {
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
        types: [],
        baseUrl: repo,
        paths: {
          "@uiwwsw/react-query-helper": ["dist/index.d.ts"],
          "@uiwwsw/react-query-helper/config": ["dist/config.d.ts"],
          "@tanstack/react-query": [
            "node_modules/@tanstack/react-query/build/modern/index.d.ts",
          ],
          react: ["node_modules/@types/react/index.d.ts"],
          "react/jsx-runtime": ["node_modules/@types/react/jsx-runtime.d.ts"],
        },
      },
    );
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
  });
}

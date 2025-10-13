import { watch } from "chokidar";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "path";
import { writeFileSync, existsSync, mkdirSync, unlinkSync, rmSync } from "fs";
import { analyzeFile } from "./core/analyzer";
import { generateOptionsCode } from "./core/generator";
import { loadConfig, type AutoQueryConfig } from "./config";
import prettier from "prettier";

let config: AutoQueryConfig;

async function clearDirectory(directory: string) {
  if (existsSync(directory)) {
    rmSync(directory, { recursive: true, force: true });
  }
  mkdirSync(directory, { recursive: true });
}

function normalizeModulePath(pathLike: string, forceRelativePrefix = false) {
  const normalized = pathLike.split(sep).join("/");
  if (forceRelativePrefix) {
    if (!normalized.startsWith(".") && !normalized.startsWith("/")) {
      return `./${normalized}`;
    }
    return normalized;
  }
  return normalized;
}

function shouldProcess(filePath: string) {
  if (filePath.endsWith(".d.ts")) {
    return false;
  }
  const extension = extname(filePath).toLowerCase();
  return extension === ".ts" || extension === ".tsx";
}

async function processFile(filePath: string) {
  if (!shouldProcess(filePath)) {
    return;
  }

  const sourceRoot = resolve(process.cwd(), config.sourceDir);
  const outputRoot = resolve(process.cwd(), config.outputDir);
  const relativePath = relative(sourceRoot, filePath);

  if (relativePath.startsWith("..")) {
    console.warn(`Skipping file outside of sourceDir: ${filePath}`);
    return;
  }

  const relativeDir = dirname(relativePath);
  const fileName = basename(filePath, extname(filePath));

  if (config.ignoredFiles?.includes(basename(filePath))) {
    console.log(`Skipping ignored file: ${filePath}`);
    return;
  }

  try {
    const functionInfos = analyzeFile(filePath);
    if (functionInfos.length === 0) {
      console.log(
        `No functions found in ${filePath}. Skipping code generation.`
      );
      return;
    }

    const outputFolder =
      relativeDir === "."
        ? outputRoot
        : join(outputRoot, relativeDir);
    const outputFile = join(outputFolder, `${fileName}Options.ts`);

    const generatedCode = generateOptionsCode(
      functionInfos,
      normalizeModulePath(
        relative(
          dirname(outputFile),
          filePath.replace(new RegExp(`${extname(filePath)}$`), "")
        ) || ".",
        true
      ),
      {
        keySegments:
          relativeDir === "."
            ? [fileName]
            : relativeDir.split(sep).filter(Boolean),
        templateImportPath:
          config.templateDir && config.templateDir.startsWith(".")
            ? normalizeModulePath(
                relative(
                  dirname(outputFile),
                  resolve(process.cwd(), config.templateDir)
                ) || ".",
                true
              )
            : config.templateDir ?? "@uiwwsw/react-query-helper",
      }
    );

    if (!existsSync(outputFolder)) {
      mkdirSync(outputFolder, { recursive: true });
    }

    const formattedCode = await prettier.format(generatedCode, {
      parser: "typescript",
    });
    writeFileSync(outputFile, formattedCode, "utf8");
    console.log(`✅ Generated options for ${filePath} -> ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error);
  }
}

async function runGenerate() {
  console.log("Generating options...");
  config = await loadConfig();

  const sourcePath = join(process.cwd(), config.sourceDir);
  const outputRootPath = join(process.cwd(), config.outputDir);

  await clearDirectory(outputRootPath);
  console.log(`🧹 Cleared existing files in ${outputRootPath}`);

  const files = await new Promise<string[]>((resolve, reject) => {
    const results: string[] = [];
    const watcher = watch(sourcePath, {
      ignored:
        config.ignoredFiles?.map((file) => join(sourcePath, "**", file)) || [],
      ignoreInitial: false, // Initial scan
      depth: 99, // Adjust depth as needed
    })
      .on("add", (path) => results.push(path))
      .on("ready", () => {
        watcher.close(); // Close watcher after initial scan
        resolve(results);
      })
      .on("error", (error) => {
        watcher.close();
        reject(error);
      });
  });

  for (const file of files) {
    await processFile(file);
  }
  console.log("✅ Options generation completed!");
}

async function runWatch() {
  console.log("Watching for file changes...");
  config = await loadConfig();

  const sourcePath = join(process.cwd(), config.sourceDir);
  const outputRootPath = join(process.cwd(), config.outputDir);

  await clearDirectory(outputRootPath);
  console.log(`🧹 Cleared existing files in ${outputRootPath}`);

  watch(sourcePath, {
    ignored:
      config.ignoredFiles?.map((file) => join(sourcePath, "**", file)) || [],
    ignoreInitial: false,
    depth: 99,
  })
    .on("add", async (filePath) => {
      if (!shouldProcess(filePath)) {
        return;
      }
      console.log(`📄 File added: ${filePath}`);
      await processFile(filePath);
    })
    .on("change", async (filePath) => {
      if (!shouldProcess(filePath)) {
        return;
      }
      console.log(`🔄 File changed: ${filePath}`);
      await processFile(filePath);
    })
    .on("unlink", async (filePath) => {
      if (!shouldProcess(filePath)) {
        return;
      }
      console.log(`🗑️ File unlinked: ${filePath}`);
      const sourceRoot = resolve(process.cwd(), config.sourceDir);
      const outputRoot = resolve(process.cwd(), config.outputDir);
      const relativePath = relative(sourceRoot, filePath);
      if (relativePath.startsWith("..")) {
        return;
      }
      const relativeDir = dirname(relativePath);
      const fileName = basename(filePath, extname(filePath));
      const outputFile = join(
        relativeDir === "." ? outputRoot : join(outputRoot, relativeDir),
        `${fileName}Options.ts`
      );
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
        console.log(`🗑️ Deleted ${outputFile}`);
      }
    })
    .on("error", (error) => console.error(`❌ Watcher error: ${error}`));

  console.log(`👀 Watching ${sourcePath} for changes.`);
}

const args = process.argv.slice(2);

if (args.includes("--watch")) {
  runWatch();
} else if (args.includes("--generate")) {
  runGenerate();
} else {
  console.log("Usage: bun run src/cli.ts [--watch | --generate]");
}

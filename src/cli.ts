import { watch } from "chokidar";
import { join, basename, dirname, extname } from "path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  rmSync,
} from "fs";
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

async function processFile(filePath: string) {
  const relativePath = filePath.replace(
    join(process.cwd(), config.sourceDir) + "\\",
    ""
  );
  const folderName = basename(dirname(relativePath));
  const fileName = basename(relativePath, extname(relativePath));

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

    const generatedCode = generateOptionsCode(
      functionInfos,
      folderName,
      fileName,
      config
    );

    const outputFolder = join(process.cwd(), config.outputDir, folderName);
    if (!existsSync(outputFolder)) {
      mkdirSync(outputFolder, { recursive: true });
    }

    const outputFile = join(outputFolder, `${fileName}Options.ts`);
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
    if (extname(file) === ".ts") {
      await processFile(file);
    }
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
      if (extname(filePath) === ".ts") {
        console.log(`📄 File added: ${filePath}`);
        await processFile(filePath);
      }
    })
    .on("change", async (filePath) => {
      if (extname(filePath) === ".ts") {
        console.log(`🔄 File changed: ${filePath}`);
        await processFile(filePath);
      }
    })
    .on("unlink", async (filePath) => {
      if (extname(filePath) === ".ts") {
        console.log(`🗑️ File unlinked: ${filePath}`);
        const relativePath = filePath.replace(
          join(process.cwd(), config.sourceDir) + "\\",
          ""
        );
        const folderName = basename(dirname(relativePath));
        const fileName = basename(relativePath, extname(relativePath));
        const outputFile = join(
          process.cwd(),
          config.outputDir,
          folderName,
          `${fileName}Options.ts`
        );
        if (existsSync(outputFile)) {
          unlinkSync(outputFile);
          console.log(`🗑️ Deleted ${outputFile}`);
        }
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

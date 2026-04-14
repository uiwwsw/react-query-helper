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
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { pathToFileURL } from "url";
import { analyzeFile, type FunctionInfo } from "./core/analyzer";
import { generateOptionsCode } from "./core/generator";
import {
  ConfigLoadError,
  loadConfig,
  resolveConfigPath,
  type CustomAnalyzerModule,
  type CustomTemplateModule,
  type ResolvedAutoQueryConfig,
} from "./config";
import prettier from "prettier";

let config: ResolvedAutoQueryConfig;
let customAnalyzerModule: CustomAnalyzerModule | null = null;
let customTemplateModule: CustomTemplateModule | null = null;

const DEFAULT_CONFIG_FILE_NAME = "rqh.config.ts";
const DEFAULT_CONFIG_TEMPLATE = `import type { AutoQueryConfig } from "@uiwwsw/react-query-helper";

const config: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  ignoredFiles: ["domain.ts", "adaptor.ts"],
  templateDir: "@uiwwsw/react-query-helper",
  analyzer: {
    exportFilter: "exported-only",
    functionMatchMode: "all",
    includeNames: [],
    excludeNames: [],
  },
  template: {
    enabledArtifacts: ["query", "mutation", "infinite"],
    keyStyle: "path",
    importNames: {
      query: "queryOption",
      mutation: "mutationOption",
      infinite: "infiniteOption",
    },
    outputNames: {
      query: "QueryOption",
      mutation: "MutationOption",
      infinite: "InfiniteQueryOption",
    },
  },
  customAnalyzerPath: "./rqh.analyzer.ts",
  customTemplatePath: "./rqh.template.ts",
};

export default config;
`;

function ensureDirectory(directory: string) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
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

function escapeRegExp(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern: string) {
  const normalized = normalizeModulePath(pattern);
  const placeholder = "__DOUBLE_STAR__";
  const escaped = escapeRegExp(normalized)
    .replace(/\*\*/g, placeholder)
    .replace(/\*/g, "[^/]*")
    .replace(new RegExp(placeholder, "g"), ".*");

  return new RegExp(`^${escaped}$`);
}

function isIgnoredFile(filePath: string) {
  const relativePath = normalizeModulePath(relative(config.resolvedSourceDir, filePath));
  const fileName = basename(filePath);

  return (
    config.ignoredFiles?.some((pattern) => {
      const normalizedPattern = normalizeModulePath(pattern);
      if (!normalizedPattern.includes("/") && !normalizedPattern.includes("*")) {
        return fileName === normalizedPattern;
      }
      return globToRegExp(normalizedPattern).test(relativePath);
    }) ?? false
  );
}

function printUsage() {
  console.log("Usage: react-query-helper [init | generate | watch | help]");
  console.log("       react-query-helper [--init | --generate | --watch | --help]");
}

function runInit() {
  const existingConfigPath = resolveConfigPath();

  if (existingConfigPath) {
    console.log(`Config already exists at ${existingConfigPath}`);
    return;
  }

  const configPath = resolve(process.cwd(), DEFAULT_CONFIG_FILE_NAME);
  writeFileSync(configPath, DEFAULT_CONFIG_TEMPLATE, "utf8");
  console.log(`✅ Created ${configPath}`);
  console.log("Next steps:");
  console.log("1. Update sourceDir/outputDir if needed.");
  console.log("2. Remove customAnalyzerPath/customTemplatePath if you don't need plugin hooks.");
  console.log("3. Run `react-query-helper --generate`.");
}

async function loadConfigOrExit() {
  try {
    return await loadConfig();
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      console.error(`❌ ${error.message}`);
      if (error.cause) {
        console.error(error.cause);
      }
    } else {
      console.error("❌ Unexpected error while loading config:", error);
    }

    process.exitCode = 1;
    return null;
  }
}

async function loadPluginModules() {
  customAnalyzerModule = null;
  customTemplateModule = null;

  if (config.resolvedCustomAnalyzerPath) {
    const imported = await import(pathToFileURL(config.resolvedCustomAnalyzerPath).href);
    customAnalyzerModule = (imported.default ?? imported) as CustomAnalyzerModule;
  }

  if (config.resolvedCustomTemplatePath) {
    const imported = await import(pathToFileURL(config.resolvedCustomTemplatePath).href);
    customTemplateModule = (imported.default ?? imported) as CustomTemplateModule;
  }
}

async function collectFunctionInfos(filePath: string): Promise<FunctionInfo[]> {
  if (customAnalyzerModule?.analyzeFile) {
    const result = await customAnalyzerModule.analyzeFile(filePath, config);
    return Array.isArray(result) ? (result as FunctionInfo[]) : [];
  }

  return analyzeFile(filePath, config.analyzer);
}

async function renderOptionsCode(params: {
  functionInfos: FunctionInfo[];
  importPath: string;
  keySegments: string[];
  fileName: string;
  templateImportPath: string;
}) {
  if (customTemplateModule?.generateOptionsCode) {
    return await customTemplateModule.generateOptionsCode({
      ...params,
      config,
    });
  }

  return generateOptionsCode(params.functionInfos, params.importPath, {
    keySegments: params.keySegments,
    fileName: params.fileName,
    templateImportPath: params.templateImportPath,
    template: config.template,
  });
}

async function processFile(filePath: string) {
  if (!shouldProcess(filePath)) {
    return;
  }

  const sourceRoot = config.resolvedSourceDir;
  const outputRoot = config.resolvedOutputDir;
  const relativePath = relative(sourceRoot, filePath);

  if (relativePath.startsWith("..")) {
    console.warn(`Skipping file outside of sourceDir: ${filePath}`);
    return;
  }

  const relativeDir = dirname(relativePath);
  const fileName = basename(filePath, extname(filePath));

  if (isIgnoredFile(filePath)) {
    console.log(`Skipping ignored file: ${filePath}`);
    return;
  }

  try {
    const functionInfos = await collectFunctionInfos(filePath);
    if (functionInfos.length === 0) {
      console.log(
        `No exported functions found in ${filePath}. Skipping code generation.`
      );
      return;
    }

    const outputFolder =
      relativeDir === "." ? outputRoot : join(outputRoot, relativeDir);
    const outputFile = join(outputFolder, `${fileName}Options.ts`);

    const generatedCode = await renderOptionsCode({
      functionInfos,
      importPath: normalizeModulePath(
        relative(
          dirname(outputFile),
          filePath.replace(new RegExp(`${extname(filePath)}$`), "")
        ) || ".",
        true
      ),
      keySegments:
        relativeDir === "." ? [fileName] : relativeDir.split(sep).filter(Boolean),
      fileName,
      templateImportPath:
        config.resolvedTemplateDir && config.templateDir?.startsWith(".")
          ? normalizeModulePath(
              relative(dirname(outputFile), config.resolvedTemplateDir) || ".",
              true
            )
          : config.resolvedTemplateDir ?? "@uiwwsw/react-query-helper",
    });

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
  const loadedConfig = await loadConfigOrExit();
  if (!loadedConfig) {
    return;
  }
  config = loadedConfig;
  await loadPluginModules();

  const sourcePath = config.resolvedSourceDir;
  const outputRootPath = config.resolvedOutputDir;

  ensureDirectory(outputRootPath);
  console.log(`📁 Ensured output directory exists at ${outputRootPath}`);

  const files = await new Promise<string[]>((resolve, reject) => {
    const results: string[] = [];
    const watcher = watch(sourcePath, {
      ignored: (watchedPath) => isIgnoredFile(String(watchedPath)),
      ignoreInitial: false,
      depth: 99,
    })
      .on("add", (path) => results.push(path))
      .on("ready", () => {
        watcher.close();
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
  const loadedConfig = await loadConfigOrExit();
  if (!loadedConfig) {
    return;
  }
  config = loadedConfig;
  await loadPluginModules();

  const sourcePath = config.resolvedSourceDir;
  const outputRootPath = config.resolvedOutputDir;

  ensureDirectory(outputRootPath);
  console.log(`📁 Ensured output directory exists at ${outputRootPath}`);

  watch(sourcePath, {
    ignored: (watchedPath) => isIgnoredFile(String(watchedPath)),
    ignoreInitial: false,
    depth: 99,
  })
    .on("add", async (filePath) => {
      if (!shouldProcess(filePath) || isIgnoredFile(filePath)) {
        return;
      }
      console.log(`📄 File added: ${filePath}`);
      await processFile(filePath);
    })
    .on("change", async (filePath) => {
      if (!shouldProcess(filePath) || isIgnoredFile(filePath)) {
        return;
      }
      console.log(`🔄 File changed: ${filePath}`);
      await processFile(filePath);
    })
    .on("unlink", async (filePath) => {
      if (!shouldProcess(filePath) || isIgnoredFile(filePath)) {
        return;
      }
      console.log(`🗑️ File unlinked: ${filePath}`);
      const sourceRoot = config.resolvedSourceDir;
      const outputRoot = config.resolvedOutputDir;
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
const hasCommand = (...values: string[]) => values.some((value) => args.includes(value));

if (hasCommand("help", "--help")) {
  printUsage();
} else if (hasCommand("init", "--init")) {
  runInit();
} else if (hasCommand("watch", "--watch")) {
  runWatch();
} else if (hasCommand("generate", "--generate")) {
  runGenerate();
} else {
  printUsage();
}

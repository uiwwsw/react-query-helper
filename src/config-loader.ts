import { existsSync } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { dirname, extname, join, resolve } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import type { AutoQueryConfig } from "./config";

export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public readonly configPath?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

export interface CustomAnalyzerModule {
  analyzeFile: (filePath: string, config: ResolvedAutoQueryConfig) => Promise<unknown> | unknown;
}

export interface CustomTemplateModule {
  generateOptionsCode: (params: {
    functionInfos: unknown[];
    importPath: string;
    keySegments: string[];
    fileName: string;
    templateImportPath: string;
    config: ResolvedAutoQueryConfig;
  }) => Promise<string> | string;
}

export interface ResolvedAutoQueryConfig extends AutoQueryConfig {
  configPath?: string;
  configDir: string;
  resolvedSourceDir: string;
  resolvedOutputDir: string;
  resolvedTemplateDir?: string;
  resolvedCustomAnalyzerPath?: string;
  resolvedCustomTemplatePath?: string;
}

const defaultConfig: AutoQueryConfig = {
  sourceDir: "./libs",
  outputDir: "./src/options",
  ignoredFiles: ["domain.ts", "adaptor.ts"],
  templateDir: "@uiwwsw/react-query-helper",
};

const CONFIG_FILE_NAMES = [
  "rqh.config.ts",
  "rqh.config.mts",
  "rqh.config.cts",
  "rqh.config.js",
  "rqh.config.mjs",
  "rqh.config.cjs",
] as const;

const TYPESCRIPT_CONFIG_EXTENSIONS = new Set([".ts", ".mts", ".cts"]);

async function importTypeScriptConfig(configPath: string) {
  const source = await readFile(configPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
    },
    fileName: configPath,
  });

  const tempFilePath = join(dirname(configPath), `.rqh.config.${randomUUID()}.mjs`);
  await writeFile(tempFilePath, transpiled.outputText, "utf8");

  try {
    return await import(pathToFileURL(tempFilePath).href);
  } finally {
    await unlink(tempFilePath).catch(() => undefined);
  }
}

async function importConfig(configPath: string) {
  if (TYPESCRIPT_CONFIG_EXTENSIONS.has(extname(configPath).toLowerCase())) {
    return importTypeScriptConfig(configPath);
  }

  return import(pathToFileURL(configPath).href);
}

export function resolveConfigPath(cwd = process.cwd()) {
  return CONFIG_FILE_NAMES.map((fileName) => join(cwd, fileName)).find((configPath) =>
    existsSync(configPath)
  );
}

export async function loadConfig(): Promise<ResolvedAutoQueryConfig> {
  const configPath = resolveConfigPath();

  if (configPath) {
    const importedConfig = await importConfig(configPath).catch((error) => {
      throw new ConfigLoadError(`Failed to load config from ${configPath}.`, configPath, error);
    });
    const userConfig = importedConfig.default ?? importedConfig;

    if (!userConfig || typeof userConfig !== "object") {
      throw new ConfigLoadError(`Config at ${configPath} must export an object.`, configPath);
    }

    const mergedConfig: AutoQueryConfig = {
      ...defaultConfig,
      ...userConfig,
    };
    const configDir = dirname(configPath);

    return {
      ...mergedConfig,
      configPath,
      configDir,
      resolvedSourceDir: resolve(configDir, mergedConfig.sourceDir),
      resolvedOutputDir: resolve(configDir, mergedConfig.outputDir),
      resolvedTemplateDir:
        mergedConfig.templateDir && mergedConfig.templateDir.startsWith(".")
          ? resolve(configDir, mergedConfig.templateDir)
          : mergedConfig.templateDir,
      resolvedCustomAnalyzerPath:
        mergedConfig.customAnalyzerPath && mergedConfig.customAnalyzerPath.startsWith(".")
          ? resolve(configDir, mergedConfig.customAnalyzerPath)
          : mergedConfig.customAnalyzerPath,
      resolvedCustomTemplatePath:
        mergedConfig.customTemplatePath && mergedConfig.customTemplatePath.startsWith(".")
          ? resolve(configDir, mergedConfig.customTemplatePath)
          : mergedConfig.customTemplatePath,
    };
  }

  const configDir = process.cwd();
  return {
    ...defaultConfig,
    configDir,
    resolvedSourceDir: resolve(configDir, defaultConfig.sourceDir),
    resolvedOutputDir: resolve(configDir, defaultConfig.outputDir),
    resolvedTemplateDir: defaultConfig.templateDir,
    resolvedCustomAnalyzerPath: undefined,
    resolvedCustomTemplatePath: undefined,
  };
}

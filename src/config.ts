import { existsSync } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { dirname, extname, join } from "path";
import { pathToFileURL } from "url";
import ts from "typescript";

export interface AutoQueryConfig {
  sourceDir: string; // API 함수가 있는 폴더 (예: './libs')
  outputDir: string; // 생성된 옵션 파일이 저장될 폴0더 (예: './src/options')
  templateDir?: string;
  ignoredFiles?: string[]; // 무시할 파일 목록 (예: ['domain.ts', 'adaptor.ts'])
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

  const tempFilePath = join(
    dirname(configPath),
    `.rqh.config.${randomUUID()}.mjs`
  );

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
  return CONFIG_FILE_NAMES.map((fileName) => join(cwd, fileName)).find(
    (configPath) => existsSync(configPath)
  );
}

export async function loadConfig(): Promise<AutoQueryConfig> {
  const configPath = resolveConfigPath();

  if (configPath) {
    try {
      const importedConfig = await importConfig(configPath);
      const userConfig = importedConfig.default ?? importedConfig;

      if (!userConfig || typeof userConfig !== "object") {
        console.error(`Config at ${configPath} must export an object.`);
        return defaultConfig;
      }

      const mergedConfig = {
        ...defaultConfig,
        ...userConfig,
      };
      return mergedConfig;
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
      return defaultConfig;
    }
  }

  return defaultConfig;
}

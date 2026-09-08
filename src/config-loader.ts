import { existsSync } from "node:fs";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { createJiti } from "jiti";
import type { AutoQueryConfig } from "./config.js";
import type { FunctionInfo } from "./core/analyzer.js";
import { validIdentifier } from "./core/generator.js";

export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public readonly configPath?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ConfigLoadError";
  }
}
export interface CustomAnalyzerModule {
  analyzeFile: (
    filePath: string,
    config: ResolvedAutoQueryConfig,
  ) => Promise<FunctionInfo[]> | FunctionInfo[];
}
export interface CustomTemplateModule {
  generateOptionsCode: (params: {
    functionInfos: FunctionInfo[];
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
  resolvedTemplateDir: string;
  resolvedCustomAnalyzerPath?: string;
  resolvedCustomTemplatePath?: string;
}
const configNames = ["ts", "mts", "cts", "js", "mjs", "cjs"].map(
  (ext) => `rqh.config.${ext}`,
);
export function resolveConfigPath(cwd = process.cwd()): string | undefined {
  let dir = resolve(cwd);
  while (true) {
    const found = configNames.map((name) => join(dir, name)).filter(existsSync);
    if (found.length > 1)
      throw new ConfigLoadError(
        `Multiple config files found: ${found.join(", ")}`,
      );
    if (found[0]) return found[0];
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
export async function loadModule(
  specifier: string,
  configDir: string,
): Promise<Record<string, unknown>> {
  const jiti = createJiti(join(configDir, "rqh.loader.cjs"), {
    interopDefault: false,
    moduleCache: false,
    fsCache: false,
  });
  return (await jiti.import(specifier)) as Record<string, unknown>;
}
function object(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object.`);
}
function keys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
) {
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new Error(`Unknown ${label} option: ${key}`);
}
function string(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} must be a non-empty string.`);
}
function strings(value: unknown, label: string): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    value.some((v) => typeof v !== "string" || !v.trim())
  )
    throw new Error(`${label} must be an array of non-empty strings.`);
}
function choice(value: unknown, allowed: string[], label: string) {
  if (!allowed.includes(value as string))
    throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
}
function validate(value: unknown): asserts value is Partial<AutoQueryConfig> {
  object(value, "Config");
  keys(
    value,
    [
      "sourceDir",
      "outputDir",
      "templateDir",
      "sourceImportAlias",
      "ignoredFiles",
      "analyzer",
      "template",
      "customAnalyzerPath",
      "customTemplatePath",
    ],
    "config",
  );
  for (const field of [
    "sourceDir",
    "outputDir",
    "templateDir",
    "sourceImportAlias",
    "customAnalyzerPath",
    "customTemplatePath",
  ])
    if (field in value) string(value[field], field);
  if ("ignoredFiles" in value) strings(value.ignoredFiles, "ignoredFiles");
  if (value.analyzer !== undefined) {
    const a = value.analyzer;
    object(a, "analyzer");
    keys(
      a,
      ["exportFilter", "functionMatchMode", "includeNames", "excludeNames"],
      "analyzer",
    );
    if (a.exportFilter !== undefined)
      choice(a.exportFilter, ["exported-only", "all"], "exportFilter");
    if (a.functionMatchMode !== undefined)
      choice(
        a.functionMatchMode,
        ["all", "async-only", "sync-only"],
        "functionMatchMode",
      );
    for (const field of ["includeNames", "excludeNames"])
      if (a[field] !== undefined) strings(a[field], field);
  }
  if (value.template !== undefined) {
    const t = value.template;
    object(t, "template");
    keys(
      t,
      [
        "enabledArtifacts",
        "artifactStrategy",
        "keyStyle",
        "importNames",
        "outputNames",
        "artifactsByName",
      ],
      "template",
    );
    const artifacts = ["query", "mutation", "infinite"];
    const artifactList = (v: unknown) => {
      strings(v, "artifacts");
      v.forEach((a) => choice(a, artifacts, "artifact"));
    };
    if (t.enabledArtifacts !== undefined) artifactList(t.enabledArtifacts);
    if (t.artifactStrategy !== undefined)
      choice(t.artifactStrategy, ["all", "smart"], "artifactStrategy");
    if (t.keyStyle !== undefined)
      choice(t.keyStyle, ["path", "file-only", "function-only"], "keyStyle");
    if (t.artifactsByName !== undefined) {
      object(t.artifactsByName, "artifactsByName");
      Object.values(t.artifactsByName).forEach(artifactList);
    }
    for (const field of ["importNames", "outputNames"])
      if (t[field] !== undefined) {
        object(t[field], field);
        keys(t[field], artifacts, field);
        for (const name of Object.values(t[field])) {
          if (typeof name !== "string" || !validIdentifier(name))
            throw new Error(`Invalid identifier in ${field}: ${name}`);
        }
      }
  }
}
export async function loadConfig(
  options: { cwd?: string; configPath?: string } = {},
): Promise<ResolvedAutoQueryConfig> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = options.configPath
    ? resolve(cwd, options.configPath)
    : resolveConfigPath(cwd);
  try {
    const mod = configPath
      ? await loadModule(configPath, dirname(configPath))
      : { default: {} };
    const user =
      configPath && /\.(cts|cjs|js)$/.test(configPath)
        ? (mod?.default ?? mod)
        : mod?.default;
    validate(user);
    const config: AutoQueryConfig = {
      sourceDir: "./libs",
      outputDir: "./src/options",
      ignoredFiles: ["domain.ts", "adaptor.ts"],
      templateDir: "@uiwwsw/react-query-helper",
      ...user,
    };
    const configDir = configPath ? dirname(configPath) : cwd;
    const modulePath = (path?: string) =>
      path?.startsWith(".") || (path && isAbsolute(path))
        ? resolve(configDir, path)
        : path;
    return {
      ...config,
      configDir,
      configPath,
      resolvedSourceDir: resolve(configDir, config.sourceDir),
      resolvedOutputDir: resolve(configDir, config.outputDir),
      resolvedTemplateDir: modulePath(config.templateDir)!,
      resolvedCustomAnalyzerPath: modulePath(config.customAnalyzerPath),
      resolvedCustomTemplatePath: modulePath(config.customTemplatePath),
    };
  } catch (error) {
    throw new ConfigLoadError(
      `Invalid configuration ${configPath ?? "(defaults)"}: ${error instanceof Error ? error.message : String(error)}`,
      configPath,
      error,
    );
  }
}

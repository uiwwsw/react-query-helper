import ts from "typescript";
import type { FunctionInfo } from "./analyzer.js";

export type GeneratedArtifact = "query" | "mutation" | "infinite";
export type KeyStyle = "path" | "file-only" | "function-only";
export type ArtifactStrategy = "all" | "smart";
export interface TemplateConfig {
  importNames?: Partial<Record<GeneratedArtifact, string>>;
  outputNames?: Partial<Record<GeneratedArtifact, string>>;
  enabledArtifacts?: GeneratedArtifact[];
  keyStyle?: KeyStyle;
  artifactStrategy?: ArtifactStrategy;
  artifactsByName?: Record<string, GeneratedArtifact[]>;
}
interface GenerateOptionsParams {
  keySegments: string[];
  fileName: string;
  templateImportPath: string;
  template?: TemplateConfig;
}
const imports = {
  query: "queryOption",
  mutation: "mutationOption",
  infinite: "infiniteOption",
};
const suffixes = {
  query: "QueryOption",
  mutation: "MutationOption",
  infinite: "InfiniteQueryOption",
};
const mutationPattern =
  /^(create|post|add|update|put|patch|delete|remove|set|send|upload|signIn|signOut|login|logout|mutate)(?=[A-Z_\d]|$)/;
const queryPattern =
  /^(get|list|fetch|find|read|load|search|retrieve|detail|details)(?=[A-Z_\d]|$)/;

export function validIdentifier(name: string) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    name,
  );
  const token = scanner.scan();
  return (
    (token === ts.SyntaxKind.Identifier ||
      (token >= ts.SyntaxKind.AbstractKeyword &&
        token <= ts.SyntaxKind.OfKeyword &&
        token !== ts.SyntaxKind.AwaitKeyword)) &&
    scanner.getTokenText() === name &&
    scanner.scan() === ts.SyntaxKind.EndOfFileToken
  );
}
export function generateOptionsCode(
  functionInfos: FunctionInfo[],
  importPath: string,
  {
    keySegments,
    fileName,
    templateImportPath,
    template = {},
  }: GenerateOptionsParams,
): string {
  const enabled = template.enabledArtifacts ?? [
    "query",
    "mutation",
    "infinite",
  ];
  const strategy = template.artifactStrategy ?? "smart";
  const rows = functionInfos
    .map((info) => {
      let artifacts = template.artifactsByName?.[info.name] ?? enabled;
      if (!template.artifactsByName?.[info.name] && strategy === "smart") {
        artifacts = artifacts.filter((a) =>
          mutationPattern.test(info.name)
            ? a === "mutation"
            : queryPattern.test(info.name)
              ? a !== "mutation"
              : a !== "infinite",
        );
      }
      return {
        info,
        artifacts: [...new Set(artifacts.filter((a) => enabled.includes(a)))],
      };
    })
    .filter((row) => row.artifacts.length);
  if (!rows.length) return "";
  const occupied = new Set<string>();
  function reserve(name: string) {
    if (!validIdentifier(name) || occupied.has(name))
      throw new Error(`Invalid or duplicate generated identifier: ${name}`);
    occupied.add(name);
    return name;
  }
  for (const { info } of rows) {
    if (!info.isExported)
      throw new Error(
        `Cannot import private function ${info.name}. Export it or use a custom template.`,
      );
    reserve(info.name);
  }
  for (const { info, artifacts } of rows) {
    reserve(`${info.name}Key`);
    for (const a of artifacts)
      reserve(`${info.name}${template.outputNames?.[a] ?? suffixes[a]}`);
  }
  const helpers = new Map<GeneratedArtifact, string>();
  const helperImports: string[] = [];
  for (const a of new Set(rows.flatMap((row) => row.artifacts))) {
    const name = template.importNames?.[a] ?? imports[a];
    if (!validIdentifier(name))
      throw new Error(`Invalid helper import: ${name}`);
    let alias = `__rqh_${a}`;
    while (occupied.has(alias)) alias += "_";
    reserve(alias);
    helpers.set(a, alias);
    helperImports.push(`${name} as ${alias}`);
  }
  let code = `import { ${rows
    .map(({ info }) =>
      info.importName && info.importName !== info.name
        ? `${info.importName === "default" ? "default" : JSON.stringify(info.importName)} as ${info.name}`
        : info.name,
    )
    .join(", ")} } from ${JSON.stringify(importPath)};\n`;
  code += `import { ${helperImports.join(", ")} } from ${JSON.stringify(templateImportPath)};\n\n`;
  for (const { info, artifacts } of rows) {
    const base =
      template.keyStyle === "function-only"
        ? []
        : template.keyStyle === "file-only"
          ? [fileName]
          : [...keySegments, fileName];
    const keyName = `${info.name}Key`;
    code += `export const ${keyName} = ${JSON.stringify([...base, info.name])} as const;\n`;
    for (const artifact of artifacts) {
      const helper = helpers.get(artifact)!;
      let expression = `${helper}(${keyName}, ${info.name})`;
      if (artifact === "mutation") {
        const hasRest =
          info.restParameterIndex !== undefined && info.restParameterIndex >= 0;
        if (
          info.parameters.length > 1 &&
          !hasRest &&
          info.parameters.every(validIdentifier)
        ) {
          const typeName = reserve(`${info.name}MutationVariables`);
          code += `export type ${typeName} = {\n${info.parameters
            .map(
              (p, i) =>
                `  ${p}${info.optionalParameters?.[i] ? "?" : ""}: Parameters<typeof ${info.name}>[${i}];`,
            )
            .join("\n")}\n};\n`;
          expression = `${helper}<Parameters<typeof ${info.name}>, Awaited<ReturnType<typeof ${info.name}>>, ${typeName}>(${keyName}, ${info.name}, { mapVariablesToArgs: (variables) => [${info.parameters.map((p) => `variables.${p}`).join(", ")}] })`;
        } else if (info.parameters.length > 1 || hasRest) {
          expression = `${helper}(${keyName}, ${info.name}, { variablesMode: "tuple" })`;
        }
      }
      code += `export const ${info.name}${template.outputNames?.[artifact] ?? suffixes[artifact]} = ${expression};\n`;
    }
    code += "\n";
  }
  return code;
}

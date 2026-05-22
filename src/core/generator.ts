import type { FunctionInfo } from "./analyzer";

export type GeneratedArtifact = "query" | "mutation" | "infinite";
export type KeyStyle = "path" | "file-only" | "function-only";
export type ArtifactStrategy = "all" | "smart";

export interface TemplateConfig {
  importNames?: Partial<Record<GeneratedArtifact, string>>;
  outputNames?: Partial<Record<GeneratedArtifact, string>>;
  enabledArtifacts?: GeneratedArtifact[];
  keyStyle?: KeyStyle;
  artifactStrategy?: ArtifactStrategy;
}

interface GenerateOptionsParams {
  keySegments: string[];
  fileName: string;
  templateImportPath: string;
  template?: TemplateConfig;
}

const DEFAULT_IMPORT_NAMES: Record<GeneratedArtifact, string> = {
  query: "queryOption",
  mutation: "mutationOption",
  infinite: "infiniteOption",
};

const DEFAULT_OUTPUT_NAMES: Record<GeneratedArtifact, string> = {
  query: "QueryOption",
  mutation: "MutationOption",
  infinite: "InfiniteQueryOption",
};

const MUTATION_NAME_PATTERN =
  /^(create|post|add|update|put|patch|delete|remove|set|send|upload|signIn|signOut|login|logout|mutate)/i;

const QUERY_NAME_PATTERN =
  /^(get|list|fetch|find|read|load|search|retrieve|detail|details)/i;

function isSimpleParameterName(name: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function getMutationVariablesTypeName(functionName: string) {
  return `${functionName}MutationVariables`;
}

function buildMutationVariablesType(info: FunctionInfo) {
  if (info.parameters.length <= 1 || !info.parameters.every(isSimpleParameterName)) {
    return null;
  }

  const lines = info.parameters.map(
    (parameterName, index) =>
      `  ${parameterName}: Parameters<typeof ${info.name}>[${index}];`
  );

  return `export type ${getMutationVariablesTypeName(info.name)} = {\n${lines.join(
    "\n"
  )}\n};\n`;
}

function buildMutationOptionExpression(
  info: FunctionInfo,
  importName: string,
  keyName: string
) {
  if (info.parameters.length <= 1 || !info.parameters.every(isSimpleParameterName)) {
    return `${importName}(${keyName}, ${info.name})`;
  }

  const variablesTypeName = getMutationVariablesTypeName(info.name);
  const argumentMapping = info.parameters
    .map((parameterName) => `variables.${parameterName}`)
    .join(", ");

  return `${importName}<Parameters<typeof ${info.name}>, Awaited<ReturnType<typeof ${info.name}>>, ${variablesTypeName}>(${keyName}, ${info.name}, { mapVariablesToArgs: (variables) => [${argumentMapping}] })`;
}

function resolveArtifacts(
  info: FunctionInfo,
  enabledArtifacts: GeneratedArtifact[],
  strategy: ArtifactStrategy
) {
  if (strategy === "all") {
    return enabledArtifacts;
  }

  if (MUTATION_NAME_PATTERN.test(info.name)) {
    return enabledArtifacts.filter((artifact) => artifact === "mutation");
  }

  if (QUERY_NAME_PATTERN.test(info.name)) {
    return enabledArtifacts.filter(
      (artifact) => artifact === "query" || artifact === "infinite"
    );
  }

  return enabledArtifacts.filter((artifact) => artifact !== "infinite");
}

function getKeySegments(
  info: FunctionInfo,
  fileName: string,
  keySegments: string[],
  keyStyle: KeyStyle
) {
  switch (keyStyle) {
    case "function-only":
      return [info.name];
    case "file-only":
      return [fileName, info.name];
    case "path":
    default:
      return [...keySegments, info.name];
  }
}

export function generateOptionsCode(
  functionInfos: FunctionInfo[],
  importPath: string,
  { keySegments, fileName, templateImportPath, template }: GenerateOptionsParams
): string {
  if (functionInfos.length === 0) {
    return "";
  }

  const enabledArtifacts = template?.enabledArtifacts?.length
    ? template.enabledArtifacts
    : (["query", "mutation", "infinite"] as GeneratedArtifact[]);

  const importNames = {
    ...DEFAULT_IMPORT_NAMES,
    ...template?.importNames,
  };

  const outputNames = {
    ...DEFAULT_OUTPUT_NAMES,
    ...template?.outputNames,
  };

  const artifactStrategy = template?.artifactStrategy ?? "smart";

  const helperImports = [...new Set(enabledArtifacts.map((artifact) => importNames[artifact]))];
  const functionNames = functionInfos.map((info) => info.name);
  const keyStyle = template?.keyStyle ?? "path";

  let newContent = `import { ${functionNames.join(", ")} } from "${importPath}";\n`;
  newContent += `import { ${helperImports.join(", ")} } from "${templateImportPath}";\n\n`;

  functionInfos.forEach((info) => {
    const resolvedArtifacts = resolveArtifacts(
      info,
      enabledArtifacts,
      artifactStrategy
    );

    if (resolvedArtifacts.length === 0) {
      return;
    }

    const keyArray = JSON.stringify(
      getKeySegments(info, fileName, keySegments, keyStyle)
    );
    const keyName = `${info.name}Key`;
    const mutationVariablesType = buildMutationVariablesType(info);

    if (mutationVariablesType && resolvedArtifacts.includes("mutation")) {
      newContent += mutationVariablesType;
    }

    newContent += `export const ${keyName} = ${keyArray} as const;\n`;

    resolvedArtifacts.forEach((artifact) => {
      const optionExpression =
        artifact === "mutation"
          ? buildMutationOptionExpression(info, importNames[artifact], keyName)
          : `${importNames[artifact]}(${keyName}, ${info.name})`;

      newContent += `export const ${info.name}${outputNames[artifact]} = ${optionExpression};\n`;
    });

    newContent += "\n";
  });

  return newContent;
}

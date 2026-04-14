import ts from "typescript";
import { readFileSync } from "fs";

export type ExportFilter = "exported-only" | "all";
export type FunctionMatchMode = "all" | "async-only" | "sync-only";

export interface AnalyzerConfig {
  exportFilter?: ExportFilter;
  functionMatchMode?: FunctionMatchMode;
  includeNames?: string[];
  excludeNames?: string[];
}

export interface FunctionInfo {
  name: string;
  parameters: string[];
  isAsync: boolean;
  isExported: boolean;
}

function shouldIncludeFunction(
  info: FunctionInfo,
  config: AnalyzerConfig = {}
): boolean {
  const exportFilter = config.exportFilter ?? "exported-only";
  const functionMatchMode = config.functionMatchMode ?? "all";

  if (exportFilter === "exported-only" && !info.isExported) {
    return false;
  }

  if (functionMatchMode === "async-only" && !info.isAsync) {
    return false;
  }

  if (functionMatchMode === "sync-only" && info.isAsync) {
    return false;
  }

  if (config.includeNames?.length && !config.includeNames.includes(info.name)) {
    return false;
  }

  if (config.excludeNames?.includes(info.name)) {
    return false;
  }

  return true;
}

export function analyzeFile(
  filePath: string,
  config: AnalyzerConfig = {}
): FunctionInfo[] {
  const sourceCode = readFileSync(filePath, "utf8");
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const functionInfos: FunctionInfo[] = [];
  const hasExportModifier = (node: ts.Node) =>
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    );

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      const isExported = hasExportModifier(node);
      node.declarationList.declarations.forEach((declaration) => {
        if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
          const initializer = declaration.initializer;
          if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
            const name = declaration.name.text;
            const parameters = initializer.parameters.map((param) =>
              param.name.getText(sourceFile)
            );
            const isAsync =
              initializer.modifiers?.some(
                (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
              ) || false;
            functionInfos.push({ name, parameters, isAsync, isExported });
          }
        }
      });
    } else if (ts.isFunctionDeclaration(node)) {
      if (node.name) {
        const name = node.name.text;
        const parameters = node.parameters.map((param) =>
          param.name.getText(sourceFile)
        );
        const isAsync =
          node.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
          ) || false;
        const isExported = hasExportModifier(node);
        functionInfos.push({ name, parameters, isAsync, isExported });
      }
    }
  });

  return functionInfos.filter((info) => shouldIncludeFunction(info, config));
}

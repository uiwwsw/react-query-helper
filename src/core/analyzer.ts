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

function unwrapFunctionLike(
  node: ts.Expression | undefined
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  if (!node) {
    return undefined;
  }

  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return node;
  }

  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return unwrapFunctionLike(node.expression);
  }

  return undefined;
}

function getFunctionInfo(
  name: string,
  parameters: readonly ts.ParameterDeclaration[],
  isAsync: boolean,
  isExported: boolean,
  sourceFile: ts.SourceFile
): FunctionInfo {
  return {
    name,
    parameters: parameters.map((param) => param.name.getText(sourceFile)),
    isAsync,
    isExported,
  };
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
          const initializer = unwrapFunctionLike(declaration.initializer);
          if (initializer) {
            functionInfos.push(
              getFunctionInfo(
                declaration.name.text,
                initializer.parameters,
                !!initializer.modifiers?.some(
                  (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
                ),
                isExported,
                sourceFile
              )
            );
          }
        }
      });
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      functionInfos.push(
        getFunctionInfo(
          node.name.text,
          node.parameters,
          !!node.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
          ),
          hasExportModifier(node),
          sourceFile
        )
      );
    }
  });

  return functionInfos.filter((info) => shouldIncludeFunction(info, config));
}

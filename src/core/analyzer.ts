import ts from "typescript";
import { readFileSync } from "node:fs";

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
  importName?: string;
  parameters: string[];
  optionalParameters?: boolean[];
  restParameterIndex?: number;
  isAsync: boolean;
  isExported: boolean;
}

function unwrap(
  node: ts.Expression | undefined,
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  if (!node) return;
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return node;
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return unwrap(node.expression);
  }
}
function has(node: ts.Node, kind: ts.SyntaxKind) {
  return (
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((m) => m.kind === kind)
  );
}

export function analyzeFile(
  filePath: string,
  config: AnalyzerConfig = {},
): FunctionInfo[] {
  const source = ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const diagnostics = (
    source as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] }
  ).parseDiagnostics;
  if (diagnostics.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => "\n",
      }),
    );
  const functions = new Map<string, FunctionInfo>();
  const exports = new Map<string, string>();
  const identifiers = new Set<string>();
  const collectIdentifiers = (node: ts.Node) => {
    if (ts.isIdentifier(node)) identifiers.add(node.text);
    ts.forEachChild(node, collectIdentifiers);
  };
  collectIdentifiers(source);
  const anonymousName = () => {
    let name = "defaultExport";
    while (identifiers.has(name)) name += "_";
    identifiers.add(name);
    return name;
  };
  function collect(
    name: string,
    fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  ) {
    if (!fn.body) return;
    functions.set(name, {
      name,
      parameters: fn.parameters.map((p) => p.name.getText(source)),
      optionalParameters: fn.parameters.map(
        (p) => !!(p.questionToken || p.initializer),
      ),
      restParameterIndex: fn.parameters.findIndex((p) => !!p.dotDotDotToken),
      isAsync: !!has(fn, ts.SyntaxKind.AsyncKeyword),
      isExported: false,
    });
  }
  for (const node of source.statements) {
    if (has(node, ts.SyntaxKind.DeclareKeyword)) continue;
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const fn = unwrap(decl.initializer);
        if (!ts.isIdentifier(decl.name) || !fn) continue;
        collect(decl.name.text, fn);
        if (has(node, ts.SyntaxKind.ExportKeyword))
          exports.set(decl.name.text, decl.name.text);
      }
    } else if (ts.isFunctionDeclaration(node) && node.body) {
      const name = node.name?.text ?? anonymousName();
      collect(name, node);
      if (has(node, ts.SyntaxKind.ExportKeyword))
        exports.set(
          has(node, ts.SyntaxKind.DefaultKeyword) ? "default" : name,
          name,
        );
    } else if (
      ts.isExportDeclaration(node) &&
      !node.moduleSpecifier &&
      !node.isTypeOnly &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const item of node.exportClause.elements) {
        if (!item.isTypeOnly)
          exports.set(item.name.text, (item.propertyName ?? item.name).text);
      }
    } else if (ts.isExportAssignment(node)) {
      if (node.isExportEquals)
        throw new Error(
          "CommonJS export assignment is not supported for API files.",
        );
      if (ts.isIdentifier(node.expression))
        exports.set("default", node.expression.text);
      else {
        const fn = unwrap(node.expression);
        if (fn) {
          const name = anonymousName();
          collect(name, fn);
          exports.set("default", name);
        }
      }
    }
  }
  const result: FunctionInfo[] = [];
  const emitted = new Map<string, string>();
  for (const [exportName, localName] of exports) {
    const info = functions.get(localName);
    if (info) {
      const name = exportName === "default" ? localName : exportName;
      if (emitted.has(name)) {
        if (emitted.get(name) !== localName)
          throw new Error("Conflicting exports; rename the default export.");
        continue;
      }
      emitted.set(name, localName);
      result.push({ ...info, name, importName: exportName, isExported: true });
    }
  }
  if (config.exportFilter === "all") {
    for (const [name, info] of functions)
      if (![...exports.values()].includes(name)) result.push(info);
  }
  return result.filter(
    (info) =>
      (config.functionMatchMode !== "async-only" || info.isAsync) &&
      (config.functionMatchMode !== "sync-only" || !info.isAsync) &&
      (!config.includeNames?.length ||
        config.includeNames.includes(info.name)) &&
      !config.excludeNames?.includes(info.name),
  );
}

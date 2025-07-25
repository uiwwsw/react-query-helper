import ts from 'typescript';
import { readFileSync } from 'fs';

export interface FunctionInfo {
  name: string;
  parameters: string[];
  isAsync: boolean;
}

export function analyzeFile(filePath: string): FunctionInfo[] {
  const sourceCode = readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const functionInfos: FunctionInfo[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
          const initializer = declaration.initializer;
          if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
            const name = declaration.name.text;
            const parameters = initializer.parameters.map(param => param.name.getText(sourceFile));
            const isAsync = initializer.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) || false;
            functionInfos.push({ name, parameters, isAsync });
          }
        }
      });
    } else if (ts.isFunctionDeclaration(node)) {
      if (node.name) {
        const name = node.name.text;
        const parameters = node.parameters.map(param => param.name.getText(sourceFile));
        const isAsync = node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) || false;
        functionInfos.push({ name, parameters, isAsync });
      }
    }
  });

  return functionInfos;
}

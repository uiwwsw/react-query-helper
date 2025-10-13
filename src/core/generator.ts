import type { FunctionInfo } from "./analyzer";

interface GenerateOptionsParams {
  keySegments: string[];
  templateImportPath: string;
}

export function generateOptionsCode(
  functionInfos: FunctionInfo[],
  importPath: string,
  { keySegments, templateImportPath }: GenerateOptionsParams
): string {
  if (functionInfos.length === 0) {
    return "";
  }

  const functionNames = functionInfos.map((info) => info.name);

  let newContent = `import { ${functionNames.join(", ")} } from "${importPath}";\n`;
  newContent += `import { queryOption, mutationOption, infiniteOption } from "${templateImportPath}";\n\n`;

  functionInfos.forEach((info) => {
    const keyArray = JSON.stringify([...keySegments, info.name]);
    const keyName = `${info.name}Key`;

    newContent += `export const ${keyName} = ${keyArray} as const;\n`;
    newContent += `export const ${info.name}QueryOption = queryOption(${keyName}, ${info.name});\n`;
    newContent += `export const ${info.name}MutationOption = mutationOption(${keyName}, ${info.name});\n`;
    newContent += `export const ${info.name}InfiniteQueryOption = infiniteOption(${keyName}, ${info.name});\n\n`;
  });

  return newContent;
}

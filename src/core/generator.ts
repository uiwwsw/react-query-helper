import type { FunctionInfo } from "./analyzer";
import type { AutoQueryConfig } from "../config"; // AutoQueryConfig 임포트

export function generateOptionsCode(
  functionInfos: FunctionInfo[],
  folderName: string,
  fileName: string,
  config: AutoQueryConfig // <-- config 매개변수 추가
): string {
  if (functionInfos.length === 0) {
    return "";
  }

  const functionNames = functionInfos.map((info) => info.name);

  // Generate import statements directly within generator.ts
  let newContent = `import { ${functionNames.join(", ")} } from "${config.sourceDir}/${folderName}/${fileName}";
`;
  newContent += `import { queryOption, mutationOption, infiniteOption } from "${config.templateDir}";

`;

  functionInfos.forEach((info) => {
    const keyDeclaration = `export const ${info.name}Key = [\"${folderName}\", \"${info.name}\"];`;
    const keyName = `${info.name}Key`;

    newContent += keyDeclaration + "\n";
    newContent += `export const ${info.name}QueryOption = queryOption(${keyName}, ${info.name});\n`;
    newContent += `export const ${info.name}MutationOption = mutationOption(${keyName}, ${info.name});\n`;
    newContent += `export const ${info.name}InfiniteQueryOption = infiniteOption(${keyName}, ${info.name});\n\n`;
  });

  return newContent;
}

import { join } from "path";
import { existsSync } from "fs";

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

export async function loadConfig(): Promise<AutoQueryConfig> {
  const configPath = join(process.cwd(), "rqh.config.ts");

  if (existsSync(configPath)) {
    try {
      // Bun은 ESM을 지원하므로 dynamic import를 사용합니다.
      const userConfig = (await import(configPath)).default;
      // 기본 템플릿과 사용자 정의 템플릿을 병합
      const mergedConfig = {
        ...defaultConfig,
        ...userConfig,
      };
      return mergedConfig;
    } catch (error) {
      console.error("Failed to load rqh.config.js:", error);
      return defaultConfig;
    }
  }

  return defaultConfig;
}

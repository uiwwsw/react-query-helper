import type { AnalyzerConfig } from "./core/analyzer";
import type { TemplateConfig } from "./core/generator";

export interface AutoQueryConfig {
  sourceDir: string;
  outputDir: string;
  templateDir?: string;
  sourceImportAlias?: string;
  ignoredFiles?: string[];
  analyzer?: AnalyzerConfig;
  template?: TemplateConfig;
  customAnalyzerPath?: string;
  customTemplatePath?: string;
}

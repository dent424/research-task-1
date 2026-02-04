import yaml from "js-yaml";
import fs from "fs";
import path from "path";

export interface ComprehensionOption {
  text: string;
  correct: boolean;
}

export interface ComprehensionCheck {
  id: string;
  definition: string;
  question: string;
  options: ComprehensionOption[];
  retryMessage: string;
}

export interface MemeExampleImage {
  src: string;
  alt: string;
}

export interface MemeExamples {
  introduction: string;
  images: MemeExampleImage[];
  minViewingSeconds: number;
}

export interface DependentVariable {
  id: string;
  questionTemplate: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
}

export interface StudyConfig {
  study: {
    id: string;
    title: string;
  };
  comprehensionChecks: ComprehensionCheck[];
  memeExamples: MemeExamples;
  categories: string[];
  dependentVariables: DependentVariable[];
  design: {
    type: string;
    categoryOrder: string;
    dvBlocking: string;
    transitionText: string;
  };
  qualtricsReturnUrl: string;
}

export function loadStudyConfig(): StudyConfig {
  const configPath = path.join(process.cwd(), "src", "study-config.yaml");
  const fileContents = fs.readFileSync(configPath, "utf8");
  return yaml.load(fileContents) as StudyConfig;
}
